import { eq, and, lt, desc } from "drizzle-orm";
import { db } from "../db";
import { messages, conversations, contacts, channels } from "../db/schema";
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

  const result = await db
    .select()
    .from(messages)
    .where(where)
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  if (hasMore) result.pop();

  // Reverse to chronological order (oldest first)
  result.reverse();

  const nextCursor = hasMore && result.length > 0
    ? result[0].createdAt.toISOString()
    : null;

  return { data: result, nextCursor, hasMore };
}

export async function createInboundMessage(conversationId: string, incoming: IncomingMessage) {
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId,
      direction: "inbound",
      type: incoming.type,
      content: incoming.content,
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

export async function sendOutboundMessage(conversationId: string, content: string, senderId: string, type: MessageType = "text") {
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

  // For media types, generate presigned URL for the channel adapter
  const mediaTypes: MessageType[] = ["image", "audio", "video", "document", "sticker"];
  let adapterContent = content;

  if (mediaTypes.includes(type)) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.url && parsed.url.startsWith("/v1/media/")) {
        const s3Key = parsed.url.replace("/v1/media/", "");
        adapterContent = await getPresignedUrl(s3Key);
      }
    } catch {
      // Not JSON or no url — send content as-is
    }
  }

  const adapter = getAdapter(channel.type as ChannelType);
  const result = await adapter.sendMessage(channel.config as Record<string, unknown>, {
    to: contact.externalId,
    type,
    content: adapterContent,
  });

  // Save the proxy URL (not the presigned URL) in the DB
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId,
      direction: "outbound",
      type,
      content,
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
