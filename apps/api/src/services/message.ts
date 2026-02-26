import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { messages, conversations, contacts, channels } from "../db/schema";
import { getAdapter } from "../channels";
import type { ChannelType } from "@tercela/shared";
import type { IncomingMessage } from "../channels/types";

export async function listMessages(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
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

export async function sendOutboundMessage(conversationId: string, content: string, senderId: string, type: string = "text") {
  const [conv] = await db
    .select({
      id: conversations.id,
      channelId: conversations.channelId,
      contactId: conversations.contactId,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv) throw new Error("Conversation not found");

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, conv.contactId)).limit(1);
  const [channel] = await db.select().from(channels).where(eq(channels.id, conv.channelId)).limit(1);

  if (!contact || !channel) throw new Error("Contact or channel not found");

  const adapter = getAdapter(channel.type as ChannelType);
  const result = await adapter.sendMessage(channel.config as Record<string, unknown>, {
    to: contact.externalId,
    type: type as any,
    content,
  });

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
