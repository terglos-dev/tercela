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
  displayPhoneNumber?: string;
  verifiedName?: string;
  wabaId?: string;
  tokenExpiresAt?: string;
}

// WhatsApp Message Templates
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED" | "IN_APPEAL";

export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: TemplateButton[];
  example?: Record<string, unknown>;
}

export interface TemplateButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

export interface WhatsAppTemplate {
  id: string;
  channelId: string;
  metaId: string | null;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  components: TemplateComponent[];
  createdAt: Date;
  updatedAt: Date;
  syncedAt: Date;
}
