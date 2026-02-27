export const CHANNEL_TYPES = ["whatsapp", "webchat", "instagram"] as const;
export const USER_ROLES = ["admin", "agent"] as const;
export const CONVERSATION_STATUSES = ["open", "closed", "pending"] as const;
export const MESSAGE_DIRECTIONS = ["inbound", "outbound"] as const;
export const MESSAGE_TYPES = ["text", "image", "audio", "video", "document", "location", "template", "sticker", "reaction", "contacts", "interactive", "button", "order", "unknown"] as const;
export const MESSAGE_STATUSES = ["pending", "sent", "delivered", "read", "failed"] as const;
