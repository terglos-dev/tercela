export type ChannelType = "whatsapp" | "webchat" | "instagram";

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppChannelConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  appSecret?: string;
  businessAccountId?: string;
}
