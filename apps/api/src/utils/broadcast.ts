import { logger } from "./logger";

function getServer() {
  return globalThis.__bunServer ?? null;
}

export function broadcastNewMessage(conversationId: string, message: unknown) {
  const server = getServer();
  if (!server) return;

  server.publish(
    `conversation:${conversationId}`,
    JSON.stringify({ type: "message:new", payload: message }),
  );
  server.publish(
    "conversations",
    JSON.stringify({
      type: "conversation:updated",
      payload: { conversationId, lastMessageAt: new Date() },
    }),
  );
}

export function broadcastUnreadUpdate(userId: string) {
  const server = getServer();
  if (!server) return;

  server.publish(
    "conversations",
    JSON.stringify({ type: "unread:updated", payload: { userId } }),
  );
}

export function broadcastMessageStatus(conversationId: string, messageId: string, status: string) {
  const server = getServer();
  if (!server) return;

  server.publish(
    `conversation:${conversationId}`,
    JSON.stringify({
      type: "message:status",
      payload: { id: messageId, status, conversationId },
    }),
  );
}
