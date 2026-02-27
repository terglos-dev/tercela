import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db";
import { channels } from "../../db/schema";
import { env } from "../../env";
import {
  validateWebhookSignature,
  findChannelByPhoneNumberId,
  processIncomingMessage,
  processStatusUpdates,
} from "../../services/webhook";
import { logger } from "../../utils/logger";

const whatsappWebhook = new OpenAPIHono();

// Webhook verification (GET)
whatsappWebhook.get("/", async (c) => {
  const url = new URL(c.req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token) {
    return c.text("Forbidden", 403);
  }

  if (token === env.WHATSAPP_VERIFY_TOKEN) {
    return c.text(challenge ?? "", 200);
  }

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

    const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    const channel = await findChannelByPhoneNumberId(phoneNumberId);

    if (!channel) {
      logger.warn("webhook", "No channel found", { phoneNumberId });
      return c.json({ status: "no_channel" }, 200);
    }

    if (!(await validateWebhookSignature(rawBody, signature, channel))) {
      logger.warn("webhook", "Signature verification failed");
      return c.json({ status: "invalid_signature" }, 200);
    }

    const value = body?.entry?.[0]?.changes?.[0]?.value;

    // Handle incoming messages
    const message = await processIncomingMessage(body, channel);

    // Handle status updates
    const statuses = value?.statuses as Array<{
      id: string;
      status: string;
      timestamp: string;
      recipient_id?: string;
      errors?: Array<{ code: number; title: string }>;
    }> | undefined;

    if (statuses?.length) {
      await processStatusUpdates(statuses);
    }

    if (!message && !statuses?.length) {
      return c.json({ status: "ignored" }, 200);
    }

    return c.json({ status: "ok" }, 200);
  },
);

export { whatsappWebhook };
