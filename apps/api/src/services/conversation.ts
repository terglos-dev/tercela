import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { conversations, contacts, channels, users, messages } from "../db/schema";

export async function findOrCreateConversation(contactId: string, channelId: string) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.contactId, contactId))
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (existing && existing.status !== "closed") return existing;

  const [conversation] = await db
    .insert(conversations)
    .values({ contactId, channelId, status: "open" })
    .returning();

  return conversation;
}

export async function listConversations() {
  return db
    .select({
      id: conversations.id,
      status: conversations.status,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      assignedTo: conversations.assignedTo,
      contact: {
        id: contacts.id,
        name: contacts.name,
        phone: contacts.phone,
        channelType: contacts.channelType,
      },
      channel: {
        id: channels.id,
        name: channels.name,
        type: channels.type,
      },
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .leftJoin(channels, eq(conversations.channelId, channels.id))
    .orderBy(desc(conversations.lastMessageAt));
}

export async function getConversation(id: string) {
  const [conv] = await db
    .select({
      id: conversations.id,
      status: conversations.status,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      assignedTo: conversations.assignedTo,
      contactId: conversations.contactId,
      channelId: conversations.channelId,
      contact: {
        id: contacts.id,
        name: contacts.name,
        phone: contacts.phone,
        channelType: contacts.channelType,
      },
      channel: {
        id: channels.id,
        name: channels.name,
        type: channels.type,
      },
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .leftJoin(channels, eq(conversations.channelId, channels.id))
    .where(eq(conversations.id, id))
    .limit(1);

  return conv ?? null;
}

export async function updateConversation(id: string, data: { assignedTo?: string | null; status?: string }) {
  const [conv] = await db
    .update(conversations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();
  return conv ?? null;
}
