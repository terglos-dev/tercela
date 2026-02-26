import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { generateId } from "@tercela/shared";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(generateId),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
