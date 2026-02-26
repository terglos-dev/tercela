import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { channels } from "../../db/schema";
import { env } from "../../env";
import { getAdapter } from "../../channels";
import { findOrCreateContact } from "../../services/contact";
import { findOrCreateConversation } from "../../services/conversation";
import { createInboundMessage } from "../../services/message";
import type { ChannelType } from "@tercela/shared";

const whatsappWebhook = new OpenAPIHono();

// Webhook verification (GET)
whatsappWebhook.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Webhooks"],
    summary: "Verificação do webhook WhatsApp",
    description: "Endpoint de verificação usado pela Meta para validar o webhook",
    request: {
      query: z.object({
        "hub.mode": z.string().openapi({ example: "subscribe" }),
        "hub.verify_token": z.string().openapi({ example: "tercela-verify-token" }),
        "hub.challenge": z.string().openapi({ example: "challenge_string" }),
      }),
    },
    responses: {
      200: { description: "Challenge retornado com sucesso" },
      403: { description: "Token inválido" },
    },
  }),
  (c) => {
    const mode = c.req.valid("query")["hub.mode"];
    const token = c.req.valid("query")["hub.verify_token"];
    const challenge = c.req.valid("query")["hub.challenge"];

    if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
      return c.text(challenge, 200);
    }

    return c.text("Forbidden", 403);
  },
);

// Incoming messages (POST)
whatsappWebhook.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Webhooks"],
    summary: "Receber mensagem do WhatsApp",
    description: "Endpoint que recebe notificações da WhatsApp Cloud API",
    request: {
      body: {
        content: { "application/json": { schema: z.object({}).passthrough() } },
      },
    },
    responses: {
      200: {
        description: "Processado",
        content: {
          "application/json": {
            schema: z.object({ status: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const body = await c.req.json();

    const adapter = getAdapter("whatsapp");
    const incoming = adapter.parseIncoming(body);

    if (!incoming) {
      return c.json({ status: "ignored" }, 200);
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.type, "whatsapp"))
      .limit(1);

    if (!channel) {
      console.warn("No WhatsApp channel configured");
      return c.json({ status: "no_channel" }, 200);
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
