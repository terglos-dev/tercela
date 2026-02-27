import { index, text, timestamp, unique } from "drizzle-orm/pg-core";
import { generateId } from "@tercela/shared";
import { conversations } from "./conversations";
import { users } from "./users";
import { inboxSchema } from "./schemas";

export const conversationReads = inboxSchema.table("conversation_reads", {
  id: text("id").primaryKey().$defaultFn(generateId),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  userId: text("user_id").notNull().references(() => users.id),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
}, (t) => [
  unique("conversation_reads_conv_user_uniq").on(t.conversationId, t.userId),
  index("conversation_reads_conv_user_idx").on(t.conversationId, t.userId),
]);
