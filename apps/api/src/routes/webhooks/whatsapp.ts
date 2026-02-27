import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db";
import { channels } from "../../db/schema";
import { env } from "../../env";
import { getAdapter } from "../../channels";
import { downloadWhatsAppMedia } from "../../channels/whatsapp";
import { findOrCreateContact } from "../../services/contact";
import { findOrCreateConversation } from "../../services/conversation";
import { createInboundMessage, updateMessageStatus } from "../../services/message";
import { createMediaRecord } from "../../services/media";
import { getStorageConfig, uploadMedia } from "../../services/storage";
import type { ChannelType, MessageStatus, MessageType } from "@tercela/shared";

const whatsappWebhook = new OpenAPIHono();

// Validate Meta's X-Hub-Signature-256 header (HMAC-SHA256)
async function verifySignature(body: string, signature: string | null, appSecret: string | undefined): Promise<boolean> {
  if (!appSecret || !signature) return true; // skip if not configured
  const expected = signature.replace("sha256=", "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === expected;
}

// Webhook verification (GET)
// Uses raw query params because Meta sends dot-notation keys (hub.mode)
// which Hono/Zod interprets as nested objects, breaking validation.
// Supports multi-channel: checks verifyToken from DB channels + global env fallback.
whatsappWebhook.get("/", async (c) => {
  const url = new URL(c.req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token) {
    return c.text("Forbidden", 403);
  }

  // Check global env token first (backwards compat)
  if (token === env.WHATSAPP_VERIFY_TOKEN) {
    return c.text(challenge ?? "", 200);
  }

  // Check per-channel verifyToken in DB
  const [match] = await db
    .select()
    .from(channels)
    .where(and(
      eq(channels.type, "whatsapp"),
      eq(channels.isActive, true),
      sql`config->>'verifyToken' = ${token}`,
    ))
    .limit(1);

  if (match) {
    return c.text(challenge ?? "", 200);
  }

  return c.text("Forbidden", 403);
});

// Incoming messages (POST)
whatsappWebhook.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Webhooks"],
    summary: "Receive WhatsApp message",
    description: "Endpoint that receives notifications from WhatsApp Cloud API",
    request: {
      body: {
        content: { "application/json": { schema: z.object({}).passthrough() } },
      },
    },
    responses: {
      200: {
        description: "Processed",
        content: {
          "application/json": {
            schema: z.object({ status: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const rawBody = await c.req.text();
    const signature = c.req.header("x-hub-signature-256") ?? null;
    const body = JSON.parse(rawBody);

    console.log("[WA webhook] POST received, payload keys:", Object.keys(body));

    // Extract phoneNumberId from Meta payload to find the correct channel
    const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    console.log("[WA webhook] phoneNumberId:", phoneNumberId);

    const [channel] = phoneNumberId
      ? await db
          .select()
          .from(channels)
          .where(and(
            eq(channels.type, "whatsapp"),
            eq(channels.isActive, true),
            sql`config->>'phoneNumberId' = ${phoneNumberId}`,
          ))
          .limit(1)
      : await db
          .select()
          .from(channels)
          .where(and(eq(channels.type, "whatsapp"), eq(channels.isActive, true)))
          .limit(1);

    if (!channel) {
      console.warn("[WA webhook] No channel found for phoneNumberId:", phoneNumberId);
      return c.json({ status: "no_channel" }, 200);
    }
    console.log("[WA webhook] Channel matched:", channel.id, channel.name);

    const config = channel.config as Record<string, string>;
    if (!(await verifySignature(rawBody, signature, config.appSecret))) {
      console.warn("[WA webhook] Signature verification failed");
      return c.json({ status: "invalid_signature" }, 200);
    }

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const server = globalThis.__bunServer;
    console.log("[WA webhook] value keys:", value ? Object.keys(value) : "none", "| has messages:", !!value?.messages, "| has statuses:", !!value?.statuses, "| ws server:", !!server);

    // --- Handle incoming messages ---
    const adapter = getAdapter("whatsapp");
    const incoming = adapter.parseIncoming(body);
    console.log("[WA webhook] parseIncoming result:", incoming ? { externalId: incoming.externalId, type: incoming.type, from: incoming.contactExternalId } : null);

    if (incoming) {
      // Download media from WhatsApp and upload to S3 if storage is configured
      let inboundMediaRecord: Awaited<ReturnType<typeof createMediaRecord>> | undefined;
      const mediaTypes: MessageType[] = ["image", "audio", "video", "document", "sticker"];
      if (mediaTypes.includes(incoming.type)) {
        try {
          const parsed = JSON.parse(incoming.content);
          const storageConfig = await getStorageConfig();
          if (parsed.mediaId && storageConfig) {
            const accessToken = config.accessToken;
            const { buffer, mimeType } = await downloadWhatsAppMedia(parsed.mediaId, accessToken);
            const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
            const now = new Date();
            const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
            const s3Key = `media/${datePath}/${crypto.randomUUID()}.${ext}`;
            const fullKey = await uploadMedia(buffer, s3Key, mimeType);

            inboundMediaRecord = await createMediaRecord({
              s3Key: fullKey,
              mimeType,
              filename: parsed.filename || null,
              size: buffer.length,
            });

            // Content becomes caption-only (or empty for no caption)
            incoming.content = parsed.caption || "";
            console.log("[WA webhook] Media uploaded to S3:", s3Key, "mediaId:", inboundMediaRecord.id);
          }
        } catch (err) {
          console.error("[WA webhook] Media download/upload failed, keeping original content:", err);
        }
      }

      const contact = await findOrCreateContact({
        externalId: incoming.contactExternalId,
        channelType: "whatsapp" as ChannelType,
        name: incoming.contactName,
        phone: incoming.contactPhone,
      });
      console.log("[WA webhook] Contact:", contact.id, contact.name);

      const conversation = await findOrCreateConversation(contact.id, channel.id);
      console.log("[WA webhook] Conversation:", conversation.id);

      const message = await createInboundMessage(conversation.id, incoming, inboundMediaRecord?.id);
      const messagePayload = inboundMediaRecord
        ? { ...message, media: inboundMediaRecord }
        : message;
      console.log("[WA webhook] Message created:", message.id, "type:", message.type, "status:", message.status);

      if (server) {
        server.publish(
          `conversation:${conversation.id}`,
          JSON.stringify({ type: "message:new", payload: messagePayload }),
        );
        server.publish(
          "conversations",
          JSON.stringify({
            type: "conversation:updated",
            payload: { conversationId: conversation.id, lastMessageAt: new Date() },
          }),
        );
        console.log("[WA webhook] WS broadcast sent for conversation:", conversation.id);
      } else {
        console.warn("[WA webhook] No WS server — cannot broadcast message");
      }
    }

    // --- Handle status updates ---
    const statuses = value?.statuses as Array<{
      id: string;
      status: string;
      timestamp: string;
      recipient_id?: string;
      errors?: Array<{ code: number; title: string }>;
    }> | undefined;

    if (statuses?.length) {
      console.log("[WA webhook] Processing", statuses.length, "status update(s)");
      for (const st of statuses) {
        console.log("[WA webhook] Status update:", { id: st.id, status: st.status, recipient: st.recipient_id });
        const validStatuses = ["sent", "delivered", "read", "failed"];
        if (!validStatuses.includes(st.status)) {
          console.log("[WA webhook] Skipping unknown status:", st.status);
          continue;
        }

        if (st.status === "failed" && st.errors?.length) {
          console.warn(`[WA webhook] Message ${st.id} failed:`, st.errors[0].code, st.errors[0].title);
        }

        const updated = await updateMessageStatus(st.id, st.status as MessageStatus);
        console.log("[WA webhook] updateMessageStatus result:", updated ? { id: updated.id, status: updated.status } : "null (not found or no change)");

        if (updated && server) {
          server.publish(
            `conversation:${updated.conversationId}`,
            JSON.stringify({
              type: "message:status",
              payload: { id: updated.id, status: updated.status, conversationId: updated.conversationId },
            }),
          );
        }
      }
    }

    if (!incoming && !statuses?.length) {
      console.log("[WA webhook] No messages or statuses — ignoring");
      return c.json({ status: "ignored" }, 200);
    }

    console.log("[WA webhook] Done — ok");
    return c.json({ status: "ok" }, 200);
  },
);

export { whatsappWebhook };
