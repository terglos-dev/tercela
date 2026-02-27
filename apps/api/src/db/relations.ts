import { relations } from "drizzle-orm";
import { users } from "./schema/users";
import { contacts } from "./schema/contacts";
import { channels } from "./schema/channels";
import { conversations } from "./schema/conversations";
import { messages } from "./schema/messages";
import { media } from "./schema/media";

export const usersRelations = relations(users, ({ many }) => ({
  assignedConversations: many(conversations),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  conversations: many(conversations),
}));

export const channelsRelations = relations(channels, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [conversations.contactId],
    references: [contacts.id],
  }),
  channel: one(channels, {
    fields: [conversations.channelId],
    references: [channels.id],
  }),
  assignee: one(users, {
    fields: [conversations.assignedTo],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  media: one(media, {
    fields: [messages.mediaId],
    references: [media.id],
  }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  uploadedByUser: one(users, {
    fields: [media.uploadedBy],
    references: [users.id],
  }),
}));
