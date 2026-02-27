import { index, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { generateId } from "@tercela/shared";
import { users } from "./users";
import { storageSchema } from "./schemas";

export const media = storageSchema.table("media", {
  id: text("id").primaryKey().$defaultFn(generateId),
  s3Key: text("s3_key").notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  filename: varchar("filename", { length: 500 }),
  size: integer("size"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("media_s3_key_idx").on(table.s3Key),
]);
