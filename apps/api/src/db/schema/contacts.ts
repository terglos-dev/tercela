import { jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { generateId } from "@tercela/shared";
import { contactsSchema } from "./schemas";

export const contacts = contactsSchema.table("contacts", {
  id: text("id").primaryKey().$defaultFn(generateId),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  channelType: varchar("channel_type", { length: 50 }).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("contacts_external_id_channel_type_idx").on(t.externalId, t.channelType),
]);
