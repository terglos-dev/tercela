export type MessageDirection = "inbound" | "outbound";
export type MessageType = "text" | "image" | "audio" | "video" | "document" | "location" | "template"
  | "sticker" | "reaction" | "contacts" | "interactive" | "button" | "order" | "unknown";
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export interface Media {
  id: string;
  s3Key: string;
  mimeType: string;
  filename: string | null;
  size: number | null;
  uploadedBy: string | null;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  data: Record<string, unknown> | null;
  mediaId: string | null;
  media?: Media | null;
  externalId: string | null;
  status: MessageStatus;
  senderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageInput {
  conversationId: string;
  type: MessageType;
  content: string;
}
