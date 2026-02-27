import { index, jsonb, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { generateId } from "@tercela/shared";
import { channelsSchema } from "./schemas";
import { channels } from "./channels";

export const templates = channelsSchema.table(
  "templates",
  {
    id: text("id").primaryKey().$defaultFn(generateId),
    channelId: text("channel_id")
      .references(() => channels.id, { onDelete: "cascade" })
      .notNull(),
    metaId: varchar("meta_id", { length: 255 }),
    name: varchar("name", { length: 512 }).notNull(),
    language: varchar("language", { length: 10 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    components: jsonb("components").default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    syncedAt: timestamp("synced_at").defaultNow().notNull(),
  },
  (table) => [
    index("templates_channel_id_idx").on(table.channelId),
    index("templates_status_idx").on(table.status),
    unique("templates_channel_name_language_idx").on(table.channelId, table.name, table.language),
  ],
);
