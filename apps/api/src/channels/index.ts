import type { ChannelType } from "@tercela/shared";
import type { ChannelAdapter } from "./types";
import { whatsappAdapter } from "./whatsapp";

const adapters = new Map<ChannelType, ChannelAdapter>();

adapters.set("whatsapp", whatsappAdapter);

export function getAdapter(type: ChannelType): ChannelAdapter {
  const adapter = adapters.get(type);
  if (!adapter) throw new Error(`No adapter registered for channel type: ${type}`);
  return adapter;
}

export function registerAdapter(adapter: ChannelAdapter) {
  adapters.set(adapter.type, adapter);
}

export type { ChannelAdapter, IncomingMessage, OutgoingMessage, SendResult } from "./types";
