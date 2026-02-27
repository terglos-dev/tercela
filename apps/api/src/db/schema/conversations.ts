import { index, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { generateId } from "@tercela/shared";
import { contacts } from "./contacts";
import { channels } from "./channels";
import { users } from "./users";
import { inboxSchema } from "./schemas";

export const conversations = inboxSchema.table("conversations", {
  id: text("id").primaryKey().$defaultFn(generateId),
  contactId: text("contact_id").notNull().references(() => contacts.id),
  channelId: text("channel_id").notNull().references(() => channels.id),
  assignedTo: text("assigned_to").references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("conversations_contact_id_idx").on(t.contactId),
  index("conversations_channel_id_idx").on(t.channelId),
  index("conversations_last_message_at_idx").on(t.lastMessageAt),
]);
