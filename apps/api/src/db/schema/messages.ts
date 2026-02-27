import { index, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { generateId } from "@tercela/shared";
import { conversations } from "./conversations";
import { users } from "./users";
import { media } from "./media";
import { inboxSchema } from "./schemas";

export const messages = inboxSchema.table("messages", {
  id: text("id").primaryKey().$defaultFn(generateId),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  direction: varchar("direction", { length: 20 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("text"),
  content: text("content").notNull(),
  mediaId: text("media_id").references(() => media.id),
  externalId: varchar("external_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  senderId: text("sender_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("messages_conversation_id_idx").on(t.conversationId),
  index("messages_external_id_idx").on(t.externalId),
]);
