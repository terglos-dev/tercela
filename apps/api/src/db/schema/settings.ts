import { jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { generateId } from "@tercela/shared";
import { authSchema } from "./schemas";

export const settings = authSchema.table("settings", {
  id: text("id").primaryKey().$defaultFn(generateId),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
