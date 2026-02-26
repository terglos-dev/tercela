import type { ServerWebSocket } from "bun";
import type { WsClientMessage } from "@tercela/shared";

export interface WsData {
  userId?: string;
}

export function handleWsOpen(ws: ServerWebSocket<WsData>) {
  ws.subscribe("conversations");
  console.log("[WS] Client connected");
}

export function handleWsMessage(ws: ServerWebSocket<WsData>, raw: string | Buffer) {
  try {
    const data = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as WsClientMessage;

    if (data.action === "subscribe") {
      ws.subscribe(data.topic);
      ws.send(JSON.stringify({ type: "subscribed", topic: data.topic }));
    } else if (data.action === "unsubscribe") {
      ws.unsubscribe(data.topic);
      ws.send(JSON.stringify({ type: "unsubscribed", topic: data.topic }));
    }
  } catch {
    ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
  }
}

export function handleWsClose(ws: ServerWebSocket<WsData>) {
  console.log("[WS] Client disconnected");
}
