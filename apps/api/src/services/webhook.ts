import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { channels } from "../db/schema";
import { getAdapter } from "../channels";
import { downloadWhatsAppMedia } from "../channels/whatsapp";
import { findOrCreateContact } from "./contact";
import { findOrCreateConversation } from "./conversation";
import { createInboundMessage, updateMessageStatus } from "./message";
import { createMediaRecord } from "./media";
import { getStorageConfig, uploadMedia } from "./storage";
import { broadcastNewMessage, broadcastMessageStatus } from "../utils/broadcast";
import { logger } from "../utils/logger";
import type { ChannelType, MessageStatus, MessageType } from "@tercela/shared";

export async function validateWebhookSignature(
  rawBody: string,
  signature: string | null,
  channel: typeof channels.$inferSelect,
): Promise<boolean> {
  const adapter = getAdapter(channel.type as ChannelType);
  return adapter.validateWebhook(rawBody, signature, channel.config as Record<string, unknown>);
}

export async function findChannelByPhoneNumberId(phoneNumberId: string | undefined) {
  const [channel] = phoneNumberId
    ? await db
        .select()
        .from(channels)
        .where(and(
          eq(channels.type, "whatsapp"),
          eq(channels.isActive, true),
          sql`config->>'phoneNumberId' = ${phoneNumberId}`,
        ))
        .limit(1)
    : await db
        .select()
        .from(channels)
        .where(and(eq(channels.type, "whatsapp"), eq(channels.isActive, true)))
        .limit(1);

  return channel ?? null;
}

async function downloadAndStoreMedia(
  incoming: { content: string; data?: Record<string, unknown> | null; type: MessageType },
  accessToken: string,
): Promise<Awaited<ReturnType<typeof createMediaRecord>> | null> {
  const mediaTypes: MessageType[] = ["image", "audio", "video", "document", "sticker"];
  if (!mediaTypes.includes(incoming.type)) return null;

  try {
    const waMediaId = incoming.data?.mediaId as string | undefined;
    const storageConfig = await getStorageConfig();
    if (!waMediaId || !storageConfig) return null;

    const { buffer, mimeType } = await downloadWhatsAppMedia(waMediaId, accessToken);
    const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    const s3Key = `media/${datePath}/${crypto.randomUUID()}.${ext}`;
    const fullKey = await uploadMedia(buffer, s3Key, mimeType);

    const mediaRecord = await createMediaRecord({
      s3Key: fullKey,
      mimeType,
      filename: (incoming.data?.filename as string) || null,
      size: buffer.length,
    });

    logger.info("webhook", "Media uploaded to S3", { s3Key, mediaId: mediaRecord.id });
    return mediaRecord;
  } catch (err) {
    logger.error("webhook", "Media download/upload failed, keeping original content", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function processIncomingMessage(
  body: unknown,
  channel: typeof channels.$inferSelect,
) {
  const config = channel.config as Record<string, string>;
  const adapter = getAdapter("whatsapp");
  const incoming = adapter.parseIncoming(body);

  if (!incoming) return null;

  logger.info("webhook", "Incoming message parsed", {
    externalId: incoming.externalId,
    type: incoming.type,
    from: incoming.contactExternalId,
  });

  // Download media and store in S3 if applicable
  const mediaRecord = await downloadAndStoreMedia(incoming, config.accessToken);

  const contact = await findOrCreateContact({
    externalId: incoming.contactExternalId,
    channelType: "whatsapp" as ChannelType,
    name: incoming.contactName,
    phone: incoming.contactPhone,
  });

  const conversation = await findOrCreateConversation(contact.id, channel.id);

  const message = await createInboundMessage(conversation.id, incoming, mediaRecord?.id);
  const messagePayload = mediaRecord
    ? { ...message, media: mediaRecord }
    : message;

  logger.info("webhook", "Message created", {
    id: message.id,
    type: message.type,
    conversationId: conversation.id,
  });

  broadcastNewMessage(conversation.id, messagePayload);

  return message;
}

interface StatusEntry {
  id: string;
  status: string;
  timestamp: string;
  recipient_id?: string;
  errors?: Array<{ code: number; title: string }>;
}

export async function processStatusUpdates(statuses: StatusEntry[]) {
  const validStatuses = ["sent", "delivered", "read", "failed"];

  for (const st of statuses) {
    if (!validStatuses.includes(st.status)) continue;

    if (st.status === "failed" && st.errors?.length) {
      logger.warn("webhook", `Message ${st.id} failed`, {
        code: st.errors[0].code,
        title: st.errors[0].title,
      });
    }

    const updated = await updateMessageStatus(st.id, st.status as MessageStatus);

    if (updated) {
      broadcastMessageStatus(updated.conversationId, updated.id, updated.status);
    }
  }
}
