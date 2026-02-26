export type ConversationStatus = "open" | "closed" | "pending";

export interface Conversation {
  id: string;
  contactId: string;
  channelId: string;
  assignedTo: string | null;
  status: ConversationStatus;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateConversationInput {
  assignedTo?: string | null;
  status?: ConversationStatus;
}
