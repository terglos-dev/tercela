import { index, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { generateId } from "@tercela/shared";
import { authSchema } from "./schemas";

export const users = authSchema.table("users", {
  id: text("id").primaryKey().$defaultFn(generateId),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("agent"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
]);
