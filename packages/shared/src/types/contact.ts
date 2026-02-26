import type { ChannelType } from "./channel";

export interface Contact {
  id: string;
  externalId: string;
  name: string | null;
  phone: string | null;
  channelType: ChannelType;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContactInput {
  externalId: string;
  name?: string;
  phone?: string;
  channelType: ChannelType;
  metadata?: Record<string, unknown>;
}

export interface UpdateContactInput {
  name?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}
