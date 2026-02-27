import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { conversations, contacts, channels, users, messages } from "../db/schema";
import { ValidationError } from "../utils/errors";

export async function findOrCreateConversation(contactId: string, channelId: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.contactId, contactId))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    if (existing && existing.status !== "closed") return existing;

    const [conversation] = await tx
      .insert(conversations)
      .values({ contactId, channelId, status: "open" })
      .returning();

    return conversation;
  });
}

const conversationSelect = {
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
};

export async function listConversations(opts: { limit?: number; offset?: number } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = opts.offset ?? 0;

  const result = await db
    .select(conversationSelect)
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .leftJoin(channels, eq(conversations.channelId, channels.id))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = result.length > limit;
  if (hasMore) result.pop();

  return { data: result, hasMore, offset, limit };
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
  // Validate assigned user exists
  if (data.assignedTo) {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, data.assignedTo)).limit(1);
    if (!user) throw new ValidationError("Assigned user does not exist");
  }

  const [conv] = await db
    .update(conversations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();
  return conv ?? null;
}
