import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db";
import { channels } from "../../db/schema";
import { env } from "../../env";
import { getAdapter } from "../../channels";
import { findOrCreateContact } from "../../services/contact";
import { findOrCreateConversation } from "../../services/conversation";
import { createInboundMessage } from "../../services/message";
import type { ChannelType } from "@tercela/shared";

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
whatsappWebhook.get("/", (c) => {
  const url = new URL(c.req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
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

    // Extract phoneNumberId from Meta payload to find the correct channel
    const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

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
      console.warn("No WhatsApp channel configured for phoneNumberId:", phoneNumberId);
      return c.json({ status: "no_channel" }, 200);
    }

    const config = channel.config as Record<string, string>;
    if (!(await verifySignature(rawBody, signature, config.appSecret))) {
      return c.json({ status: "invalid_signature" }, 200);
    }

    const adapter = getAdapter("whatsapp");
    const incoming = adapter.parseIncoming(body);

    if (!incoming) {
      return c.json({ status: "ignored" }, 200);
    }

    const contact = await findOrCreateContact({
      externalId: incoming.contactExternalId,
      channelType: "whatsapp" as ChannelType,
      name: incoming.contactName,
      phone: incoming.contactPhone,
    });

    const conversation = await findOrCreateConversation(contact.id, channel.id);
    const message = await createInboundMessage(conversation.id, incoming);

    const server = globalThis.__bunServer;
    if (server) {
      server.publish(
        `conversation:${conversation.id}`,
        JSON.stringify({ type: "message:new", payload: message }),
      );
      server.publish(
        "conversations",
        JSON.stringify({
          type: "conversation:updated",
          payload: { conversationId: conversation.id, lastMessageAt: new Date() },
        }),
      );
    }

    return c.json({ status: "ok" }, 200);
  },
);

export { whatsappWebhook };
