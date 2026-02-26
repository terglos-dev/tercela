import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { contacts } from "../db/schema";
import type { ChannelType } from "@tercela/shared";

export async function findOrCreateContact(data: {
  externalId: string;
  channelType: ChannelType;
  name?: string;
  phone?: string;
}) {
  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(
      eq(contacts.externalId, data.externalId),
      eq(contacts.channelType, data.channelType),
    ))
    .limit(1);

  if (existing) return existing;

  const [contact] = await db
    .insert(contacts)
    .values({
      externalId: data.externalId,
      channelType: data.channelType,
      name: data.name ?? null,
      phone: data.phone ?? null,
    })
    .returning();

  return contact;
}

export async function listContacts() {
  return db.select().from(contacts).orderBy(contacts.createdAt);
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
