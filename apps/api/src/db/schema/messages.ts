import { text, timestamp, varchar } from "drizzle-orm/pg-core";
import { generateId } from "@tercela/shared";
import { conversations } from "./conversations";
import { inboxSchema } from "./schemas";

export const messages = inboxSchema.table("messages", {
  id: text("id").primaryKey().$defaultFn(generateId),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  direction: varchar("direction", { length: 20 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("text"),
  content: text("content").notNull(),
  externalId: varchar("external_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  senderId: text("sender_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
