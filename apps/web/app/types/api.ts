export interface ConversationListItem {
  id: string;
  status: string;
  lastMessageAt: string | null;
  createdAt: string;
  assignedTo: string | null;
  unreadCount: number;
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    channelType: string;
  } | null;
  channel: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export interface ChannelListItem {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelHealth {
  status: "connected" | "disconnected";
  tokenExpiresAt: string | null;
  reason?: string;
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface StorageConfig {
  provider: string;
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  pathPrefix?: string;
}

export interface SettingItem {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
}

export interface WhatsAppTemplateItem {
  id: string;
  channelId: string;
  metaId: string | null;
  name: string;
  language: string;
  category: string;
  status: string;
  components: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
}
