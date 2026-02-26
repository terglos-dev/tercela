import type { ChannelAdapter, IncomingMessage, OutgoingMessage, SendResult } from "../types";
import type { WhatsAppChannelConfig, MessageType } from "@tercela/shared";

export const whatsappAdapter: ChannelAdapter = {
  type: "whatsapp",

  async sendMessage(config: Record<string, unknown>, message: OutgoingMessage): Promise<SendResult> {
    const { phoneNumberId, accessToken } = config as unknown as WhatsAppChannelConfig;

    const body: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: message.to,
      type: message.type === "text" ? "text" : message.type,
    };

    if (message.type === "text") {
      body.text = { body: message.content };
    } else {
      body[message.type] = { link: message.content };
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = (await res.json()) as { messages?: { id: string }[] };

    return {
      externalId: data.messages?.[0]?.id ?? "",
      success: res.ok,
    };
  },

  parseIncoming(body: unknown): IncomingMessage | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WhatsApp webhook payload is deeply nested and untyped
    const payload = body as Record<string, any>;
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) return null;

    const msg = value.messages[0];
    const contact = value.contacts?.[0];

    let type: MessageType = "text";
    let content = "";

    if (msg.type === "text") {
      type = "text";
      content = msg.text?.body ?? "";
    } else if (msg.type === "image") {
      type = "image";
      content = msg.image?.id ?? "";
    } else if (msg.type === "audio") {
      type = "audio";
      content = msg.audio?.id ?? "";
    } else if (msg.type === "video") {
      type = "video";
      content = msg.video?.id ?? "";
    } else if (msg.type === "document") {
      type = "document";
      content = msg.document?.id ?? "";
    } else if (msg.type === "location") {
      type = "location";
      content = JSON.stringify({
        latitude: msg.location?.latitude,
        longitude: msg.location?.longitude,
      });
    }

    return {
      externalId: msg.id,
      contactExternalId: msg.from,
      contactName: contact?.profile?.name,
      contactPhone: msg.from,
      type,
      content,
      timestamp: new Date(Number(msg.timestamp) * 1000),
    };
  },

  validateWebhook(_request: Request, _config: Record<string, unknown>): boolean {
    return true;
  },
};
