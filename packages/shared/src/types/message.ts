export type MessageDirection = "inbound" | "outbound";
export type MessageType = "text" | "image" | "audio" | "video" | "document" | "location" | "template";
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  externalId: string | null;
  status: MessageStatus;
  senderId: string | null;
  createdAt: Date;
}

export interface SendMessageInput {
  conversationId: string;
  type: MessageType;
  content: string;
}
