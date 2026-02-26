import type { WsEvent } from "@tercela/shared";

type EventHandler = (event: WsEvent) => void;

let ws: WebSocket | null = null;
const handlers = new Map<string, Set<EventHandler>>();

export function useWebSocket() {
  const config = useRuntimeConfig();

  function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    ws = new WebSocket(config.public.wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsEvent;
        const typeHandlers = handlers.get(data.type);
        if (typeHandlers) {
          typeHandlers.forEach((handler) => handler(data));
        }
        // Also notify wildcard handlers
        const allHandlers = handlers.get("*");
        if (allHandlers) {
          allHandlers.forEach((handler) => handler(data));
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      setTimeout(connect, 3000);
    };
  }

  function subscribe(topic: string) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "subscribe", topic }));
    }
  }

  function unsubscribe(topic: string) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "unsubscribe", topic }));
    }
  }

  function on(type: string, handler: EventHandler) {
    if (!handlers.has(type)) {
      handlers.set(type, new Set());
    }
    handlers.get(type)!.add(handler);

    return () => {
      handlers.get(type)?.delete(handler);
    };
  }

  return { connect, subscribe, unsubscribe, on };
}
