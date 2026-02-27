export interface ConversationListItem {
  id: string;
  status: string;
  lastMessageAt: string | null;
  createdAt: string;
  assignedTo: string | null;
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
  createdAt: string;
}
