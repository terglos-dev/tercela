import { pgSchema } from "drizzle-orm/pg-core";

export const authSchema = pgSchema("auth");
export const channelsSchema = pgSchema("channels");
export const contactsSchema = pgSchema("contacts");
export const inboxSchema = pgSchema("inbox");
export const configSchema = pgSchema("config");
export const storageSchema = pgSchema("storage");
