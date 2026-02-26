export type WsEventType =
  | "message:new"
  | "message:status"
  | "conversation:updated"
  | "typing:start"
  | "typing:stop";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
}

export interface WsSubscribe {
  action: "subscribe";
  topic: string;
}

export interface WsUnsubscribe {
  action: "unsubscribe";
  topic: string;
}

export type WsClientMessage = WsSubscribe | WsUnsubscribe;
