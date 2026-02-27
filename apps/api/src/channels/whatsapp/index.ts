import type { ChannelAdapter, IncomingMessage, OutgoingMessage, SendResult } from "../types";
import type { WhatsAppChannelConfig, MessageType } from "@tercela/shared";

export async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  // Step 1: Get the media URL from Meta Graph API
  const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) {
    throw new Error(`Failed to get media URL: ${metaRes.status}`);
  }
  const metaData = (await metaRes.json()) as { url: string; mime_type: string };

  // Step 2: Download the binary from the URL
  const downloadRes = await fetch(metaData.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!downloadRes.ok) {
    throw new Error(`Failed to download media: ${downloadRes.status}`);
  }

  const buffer = Buffer.from(await downloadRes.arrayBuffer());
  return { buffer, mimeType: metaData.mime_type };
}

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

    console.log("[WA adapter] Sending to Meta API:", { to: message.to, type: message.type, phoneNumberId });

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

    const data = (await res.json()) as { messages?: { id: string }[]; error?: { message: string; code: number } };

    if (!res.ok) {
      console.error("[WA adapter] Meta API error:", res.status, data.error ?? data);
    } else {
      console.log("[WA adapter] Meta API success, externalId:", data.messages?.[0]?.id);
    }

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
    let data: Record<string, unknown> | null = null;

    if (msg.type === "text") {
      type = "text";
      content = msg.text?.body ?? "";
    } else if (msg.type === "image") {
      type = "image";
      content = msg.image?.caption || "";
      data = { mediaId: msg.image?.id, mimeType: msg.image?.mime_type };
    } else if (msg.type === "audio") {
      type = "audio";
      data = { mediaId: msg.audio?.id, mimeType: msg.audio?.mime_type };
    } else if (msg.type === "video") {
      type = "video";
      content = msg.video?.caption || "";
      data = { mediaId: msg.video?.id, mimeType: msg.video?.mime_type };
    } else if (msg.type === "document") {
      type = "document";
      content = msg.document?.caption || "";
      data = { mediaId: msg.document?.id, mimeType: msg.document?.mime_type, filename: msg.document?.filename };
    } else if (msg.type === "location") {
      type = "location";
      data = { latitude: msg.location?.latitude, longitude: msg.location?.longitude };
    } else if (msg.type === "sticker") {
      type = "sticker";
      data = { mediaId: msg.sticker?.id, mimeType: msg.sticker?.mime_type };
    } else if (msg.type === "reaction") {
      type = "reaction";
      content = msg.reaction?.emoji ?? "";
      data = { message_id: msg.reaction?.message_id };
    } else if (msg.type === "contacts") {
      type = "contacts";
      data = { contacts: msg.contacts ?? [] };
    } else if (msg.type === "interactive") {
      type = "interactive";
      const reply = msg.interactive?.button_reply || msg.interactive?.list_reply;
      content = reply?.title || reply?.id || "";
      data = { type: msg.interactive?.type, ...(reply ?? {}) };
    } else if (msg.type === "button") {
      type = "button";
      content = msg.button?.text ?? "";
    } else if (msg.type === "order") {
      type = "order";
      data = msg.order ?? {};
    } else {
      type = "unknown";
      data = { originalType: msg.type };
    }

    return {
      externalId: msg.id,
      contactExternalId: msg.from,
      contactName: contact?.profile?.name,
      contactPhone: msg.from,
      type,
      content,
      data,
      timestamp: new Date(Number(msg.timestamp) * 1000),
    };
  },

  async validateWebhook(rawBody: string, signature: string | null, config: Record<string, unknown>): Promise<boolean> {
    const appSecret = config.appSecret as string | undefined;
    if (!appSecret || !signature) return true;
    const expected = signature.replace("sha256=", "");
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex === expected;
  },
};
