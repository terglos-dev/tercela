import { eq, and, lt, desc } from "drizzle-orm";
import { db } from "../db";
import { messages, conversations, contacts, channels, media } from "../db/schema";
import { getAdapter } from "../channels";
import { getPresignedUrl } from "./storage";
import type { ChannelType, MessageType, MessageStatus } from "@tercela/shared";
import type { IncomingMessage } from "../channels/types";

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

export async function listMessages(
  conversationId: string,
  opts: { limit?: number; before?: string } = {},
) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);

  const where = opts.before
    ? and(eq(messages.conversationId, conversationId), lt(messages.createdAt, new Date(opts.before)))
    : eq(messages.conversationId, conversationId);

  const rows = await db
    .select({
      message: messages,
      media: media,
    })
    .from(messages)
    .leftJoin(media, eq(messages.mediaId, media.id))
    .where(where)
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  // Reverse to chronological order (oldest first)
  rows.reverse();

  const result = rows.map((row) => ({
    ...row.message,
    media: row.media || null,
  }));

  const nextCursor = hasMore && result.length > 0
    ? result[0].createdAt.toISOString()
    : null;

  return { data: result, nextCursor, hasMore };
}

export async function createInboundMessage(conversationId: string, incoming: IncomingMessage, mediaId?: string) {
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId,
      direction: "inbound",
      type: incoming.type,
      content: incoming.content,
      mediaId: mediaId || null,
      externalId: incoming.externalId,
      status: "delivered",
    })
    .returning();

  await db
    .update(conversations)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return msg;
}

export async function sendOutboundMessage(
  conversationId: string,
  content: string,
  senderId: string,
  type: MessageType = "text",
  mediaId?: string,
) {
  const [row] = await db
    .select({
      convId: conversations.id,
      contactExternalId: contacts.externalId,
      channelType: channels.type,
      channelConfig: channels.config,
    })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .innerJoin(channels, eq(conversations.channelId, channels.id))
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!row) throw new Error("Conversation, contact or channel not found");

  const contact = { externalId: row.contactExternalId };
  const channel = { type: row.channelType, config: row.channelConfig };

  // For media types, resolve presigned URL from media record for the channel adapter
  let adapterContent = content;

  if (mediaId) {
    const { getMediaById } = await import("./media");
    const mediaRecord = await getMediaById(mediaId);
    if (mediaRecord) {
      adapterContent = await getPresignedUrl(mediaRecord.s3Key);
    }
  }

  const adapter = getAdapter(channel.type as ChannelType);
  const result = await adapter.sendMessage(channel.config as Record<string, unknown>, {
    to: contact.externalId,
    type,
    content: adapterContent,
  });

  const [msg] = await db
    .insert(messages)
    .values({
      conversationId,
      direction: "outbound",
      type,
      content,
      mediaId: mediaId || null,
      externalId: result.externalId,
      status: result.success ? "sent" : "failed",
      senderId,
    })
    .returning();

  await db
    .update(conversations)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return msg;
}

export async function updateMessageStatus(externalId: string, newStatus: MessageStatus) {
  console.log("[message service] updateMessageStatus:", { externalId, newStatus });

  const [msg] = await db
    .select()
    .from(messages)
    .where(eq(messages.externalId, externalId))
    .limit(1);

  if (!msg) {
    console.log("[message service] No message found for externalId:", externalId);
    return null;
  }

  console.log("[message service] Found message:", { id: msg.id, currentStatus: msg.status, conversationId: msg.conversationId });

  // "failed" is terminal — always accept it
  if (newStatus !== "failed") {
    const currentRank = STATUS_ORDER[msg.status] ?? -1;
    const newRank = STATUS_ORDER[newStatus] ?? -1;
    if (newRank <= currentRank) {
      console.log("[message service] Skipping regression:", msg.status, "→", newStatus);
      return null;
    }
  }

  const [updated] = await db
    .update(messages)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(messages.id, msg.id))
    .returning();

  console.log("[message service] Status updated:", msg.status, "→", updated.status);
  return updated;
}
