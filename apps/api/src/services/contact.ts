import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { contacts } from "../db/schema";
import type { ChannelType } from "@tercela/shared";

export async function findOrCreateContact(data: {
  externalId: string;
  channelType: ChannelType;
  name?: string;
  phone?: string;
}) {
  const [contact] = await db
    .insert(contacts)
    .values({
      externalId: data.externalId,
      channelType: data.channelType,
      name: data.name ?? null,
      phone: data.phone ?? null,
    })
    .onConflictDoUpdate({
      target: [contacts.externalId, contacts.channelType],
      set: {
        name: data.name ?? undefined,
        phone: data.phone ?? undefined,
        updatedAt: new Date(),
      },
    })
    .returning();

  return contact;
}

export async function createContact(data: {
  externalId: string;
  channelType: string;
  name?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const [contact] = await db
    .insert(contacts)
    .values({
      externalId: data.externalId,
      channelType: data.channelType,
      name: data.name ?? null,
      phone: data.phone ?? null,
      metadata: data.metadata ?? {},
    })
    .returning();

  return contact;
}

export async function listContacts(opts: { limit?: number; offset?: number } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = opts.offset ?? 0;

  const result = await db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = result.length > limit;
  if (hasMore) result.pop();

  return { data: result, hasMore, offset, limit };
}

export async function getContact(id: string) {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return contact ?? null;
}

export async function updateContact(id: string, data: { name?: string; phone?: string; metadata?: Record<string, unknown> }) {
  const [contact] = await db
    .update(contacts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(contacts.id, id))
    .returning();
  return contact ?? null;
}
