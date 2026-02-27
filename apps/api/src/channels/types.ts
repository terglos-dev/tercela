import type { ChannelType, MessageType } from "@tercela/shared";

export interface IncomingMessage {
  externalId: string;
  contactExternalId: string;
  contactName?: string;
  contactPhone?: string;
  type: MessageType;
  content: string;
  data?: Record<string, unknown> | null;
  timestamp: Date;
}

export interface OutgoingMessage {
  to: string;
  type: MessageType;
  content: string;
}

export interface SendResult {
  externalId: string;
  success: boolean;
}

export interface ChannelAdapter {
  type: ChannelType;
  sendMessage(config: Record<string, unknown>, message: OutgoingMessage): Promise<SendResult>;
  parseIncoming(body: unknown): IncomingMessage | null;
  validateWebhook(rawBody: string, signature: string | null, config: Record<string, unknown>): Promise<boolean>;
}
