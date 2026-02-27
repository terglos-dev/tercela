import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { channels, conversations, messages } from "../db/schema";
import { env } from "../env";
import { success, error } from "../utils/response";
import { wrapSuccess, ErrorResponseSchema } from "../utils/openapi-schemas";
import { exchangeForLongLivedToken, verifyChannelToken } from "../services/channel";

const channelsRouter = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" }, example: "uuid" }),
});

const ChannelSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  config: z.record(z.string(), z.unknown()),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Mask sensitive fields in channel config before returning to client */
function maskConfig(config: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ["accessToken", "appSecret"];
  const masked: Record<string, unknown> = { ...config };
  for (const key of sensitiveKeys) {
    const val = masked[key];
    if (typeof val === "string" && val.length > 4) {
      masked[key] = "••••" + val.slice(-4);
    } else if (typeof val === "string" && val.length > 0) {
      masked[key] = "••••";
    }
  }
  return masked;
}

function serializeChannel(channel: typeof channels.$inferSelect) {
  return {
    ...channel,
    config: maskConfig(channel.config as Record<string, unknown>),
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  };
}

// GET /
channelsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Channels"],
    summary: "List channels",
    responses: {
      200: {
        description: "List of channels",
        content: { "application/json": { schema: wrapSuccess(z.array(ChannelSchema)) } },
      },
    },
  }),
  async (c) => {
    const result = await db.select().from(channels).orderBy(channels.createdAt);
    return success(c, result.map(serializeChannel), 200);
  },
);

// GET /:id
channelsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Channels"],
    summary: "Get channel by ID",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Channel found",
        content: { "application/json": { schema: wrapSuccess(ChannelSchema) } },
      },
      404: {
        description: "Channel not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const [channel] = await db.select().from(channels).where(eq(channels.id, id)).limit(1);
    if (!channel) return error(c, "Channel not found", 404);
    return success(c, serializeChannel(channel), 200);
  },
);

// GET /:id/health
const HealthResultSchema = z.object({
  status: z.enum(["connected", "disconnected"]),
  tokenExpiresAt: z.string().nullable(),
  reason: z.string().optional(),
});

channelsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}/health",
    tags: ["Channels"],
    summary: "Check channel health (token validity)",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Health check result",
        content: { "application/json": { schema: wrapSuccess(HealthResultSchema) } },
      },
      404: {
        description: "Channel not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
      400: {
        description: "Unsupported channel type",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const [channel] = await db.select().from(channels).where(eq(channels.id, id)).limit(1);
    if (!channel) return error(c, "Channel not found", 404);
    if (channel.type !== "whatsapp") return error(c, "Health check only supported for WhatsApp channels", 400);

    const config = channel.config as unknown as import("@tercela/shared").WhatsAppChannelConfig;
    const result = await verifyChannelToken(config);
    return success(c, result, 200);
  },
);

// POST /
const createSchema = z.object({
  type: z.enum(["whatsapp"]).openapi({ example: "whatsapp" }),
  name: z.string().min(1).openapi({ example: "Main WhatsApp" }),
  config: z.record(z.string(), z.unknown()).openapi({
    example: {
      phoneNumberId: "123456",
      accessToken: "EAAx...",
      verifyToken: "my-token",
      appSecret: "abc123",
      businessAccountId: "78910",
    },
  }),
});

channelsRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Channels"],
    summary: "Create channel",
    request: {
      body: { content: { "application/json": { schema: createSchema } } },
    },
    responses: {
      201: {
        description: "Channel created",
        content: { "application/json": { schema: wrapSuccess(ChannelSchema) } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const data = c.req.valid("json");
    const [channel] = await db
      .insert(channels)
      .values({
        type: data.type,
        name: data.name,
        config: data.config,
        isActive: true,
      })
      .returning();
    return success(c, serializeChannel(channel), 201);
  },
);

// PATCH /:id
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

channelsRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    tags: ["Channels"],
    summary: "Update channel",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: updateSchema } } },
    },
    responses: {
      200: {
        description: "Channel updated",
        content: { "application/json": { schema: wrapSuccess(ChannelSchema) } },
      },
      404: {
        description: "Channel not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const [channel] = await db
      .update(channels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(channels.id, id))
      .returning();
    if (!channel) return error(c, "Channel not found", 404);
    return success(c, serializeChannel(channel), 200);
  },
);

// DELETE /:id (hard delete — removes from database)
channelsRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Channels"],
    summary: "Delete channel",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Channel deleted",
        content: { "application/json": { schema: wrapSuccess(ChannelSchema) } },
      },
      404: {
        description: "Channel not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");

    const result = await db.transaction(async (tx) => {
      // Find conversations belonging to this channel
      const convos = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.channelId, id));

      // Delete messages for those conversations
      if (convos.length > 0) {
        const convoIds = convos.map((c) => c.id);
        await tx.delete(messages).where(inArray(messages.conversationId, convoIds));
      }

      // Delete conversations
      await tx.delete(conversations).where(eq(conversations.channelId, id));

      // Delete the channel
      const [channel] = await tx
        .delete(channels)
        .where(eq(channels.id, id))
        .returning();

      return channel;
    });

    if (!result) return error(c, "Channel not found", 404);
    return success(c, serializeChannel(result), 200);
  },
);

// POST /meta/accounts — List WABAs and phone numbers from user's Meta account
const metaAccountsSchema = z.object({
  accessToken: z.string().min(1).openapi({ example: "EAAx..." }),
});

const PhoneNumberSchema = z.object({
  id: z.string(),
  display_phone_number: z.string(),
  verified_name: z.string(),
  quality_rating: z.string().optional(),
});

const WabaAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone_numbers: z.array(PhoneNumberSchema),
});

channelsRouter.openapi(
  createRoute({
    method: "post",
    path: "/meta/accounts",
    tags: ["Channels"],
    summary: "List WhatsApp Business accounts and phone numbers",
    request: {
      body: { content: { "application/json": { schema: metaAccountsSchema } } },
    },
    responses: {
      200: {
        description: "List of WABAs with phone numbers",
        content: { "application/json": { schema: wrapSuccess(z.array(WabaAccountSchema)) } },
      },
      400: {
        description: "Meta API error",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { accessToken } = c.req.valid("json");

    // 1. Get all businesses the user manages
    const bizRes = await fetch(
      `https://graph.facebook.com/v21.0/me/businesses?access_token=${accessToken}`,
    );
    const bizData = (await bizRes.json()) as { data?: { id: string; name: string }[]; error?: { message: string } };

    if (!bizRes.ok || !bizData.data) {
      const msg = bizData.error?.message || "Failed to fetch businesses";
      return error(c, msg, 400);
    }

    // 2. For each business, get WABAs
    const wabas: { id: string; name: string; phone_numbers: { id: string; display_phone_number: string; verified_name: string; quality_rating?: string }[] }[] = [];

    for (const biz of bizData.data) {
      const wabaRes = await fetch(
        `https://graph.facebook.com/v21.0/${biz.id}/owned_whatsapp_business_accounts?access_token=${accessToken}`,
      );
      const wabaData = (await wabaRes.json()) as { data?: { id: string; name: string }[] };

      if (!wabaData.data) continue;

      for (const waba of wabaData.data) {
        // 3. For each WABA, get phone numbers
        const phoneRes = await fetch(
          `https://graph.facebook.com/v21.0/${waba.id}/phone_numbers?access_token=${accessToken}`,
        );
        const phoneData = (await phoneRes.json()) as {
          data?: { id: string; display_phone_number: string; verified_name: string; quality_rating?: string }[];
        };

        wabas.push({
          id: waba.id,
          name: waba.name,
          phone_numbers: phoneData.data || [],
        });
      }
    }

    return success(c, wabas, 200);
  },
);

// POST /meta/connect — Connect a selected WhatsApp phone number
const metaConnectSchema = z.object({
  accessToken: z.string().min(1).openapi({ example: "EAAx..." }),
  phoneNumberId: z.string().min(1).openapi({ example: "123456789" }),
  wabaId: z.string().min(1).openapi({ example: "987654321" }),
  name: z.string().optional().openapi({ example: "My WhatsApp" }),
});

channelsRouter.openapi(
  createRoute({
    method: "post",
    path: "/meta/connect",
    tags: ["Channels"],
    summary: "Connect a WhatsApp phone number as channel",
    request: {
      body: { content: { "application/json": { schema: metaConnectSchema } } },
    },
    responses: {
      201: {
        description: "Channel created",
        content: { "application/json": { schema: wrapSuccess(ChannelSchema) } },
      },
      400: {
        description: "Invalid input or Meta API error",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { accessToken: shortToken, phoneNumberId, wabaId, name } = c.req.valid("json");

    // 1. Exchange short-lived token for long-lived token (~60 days)
    let longLivedToken: string;
    let tokenExpiresAt: string;
    try {
      const exchanged = await exchangeForLongLivedToken(shortToken);
      longLivedToken = exchanged.accessToken;
      tokenExpiresAt = exchanged.expiresAt;
      console.log(`[meta/connect] Token exchanged, expires ${tokenExpiresAt}`);
    } catch (err) {
      // Fall back to the original token if exchange fails (e.g. missing META_APP_ID/SECRET)
      console.warn(`[meta/connect] Token exchange failed, using short-lived token: ${err instanceof Error ? err.message : err}`);
      longLivedToken = shortToken;
      tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // ~2h
    }

    // 2. Fetch phone number details (use long-lived token)
    const phoneRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?access_token=${longLivedToken}`,
    );
    const phoneData = (await phoneRes.json()) as Record<string, unknown>;

    if (!phoneRes.ok) {
      const msg = (phoneData.error as Record<string, string>)?.message || "Failed to fetch phone number details";
      return error(c, msg, 400);
    }

    const verifiedName = (phoneData.verified_name as string) || "";
    const displayPhone = (phoneData.display_phone_number as string) || "";

    // 3. Subscribe app to WABA webhooks
    const subRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${longLivedToken}`,
      },
    });

    if (!subRes.ok) {
      const subData = (await subRes.json()) as Record<string, unknown>;
      const msg = (subData.error as Record<string, string>)?.message || "Failed to subscribe to WABA webhooks";
      return error(c, msg, 400);
    }

    // 4. Generate verify token and create channel
    const verifyToken = crypto.randomUUID();
    const channelName = name || verifiedName || `WhatsApp ${displayPhone}`;

    const [channel] = await db
      .insert(channels)
      .values({
        type: "whatsapp",
        name: channelName,
        config: {
          phoneNumberId,
          accessToken: longLivedToken,
          wabaId,
          verifyToken,
          businessAccountId: wabaId,
          appSecret: "",
          verifiedName,
          displayPhoneNumber: displayPhone,
          tokenExpiresAt,
        },
        isActive: true,
      })
      .returning();

    return success(c, serializeChannel(channel), 201);
  },
);

// POST /meta/resync — Resync a WhatsApp channel with a new access token
const metaResyncSchema = z.object({
  channelId: z.string().min(1).openapi({ example: "uuid" }),
  accessToken: z.string().min(1).openapi({ example: "EAAx..." }),
});

channelsRouter.openapi(
  createRoute({
    method: "post",
    path: "/meta/resync",
    tags: ["Channels"],
    summary: "Resync a WhatsApp channel with a fresh access token",
    request: {
      body: { content: { "application/json": { schema: metaResyncSchema } } },
    },
    responses: {
      200: {
        description: "Channel resynced",
        content: { "application/json": { schema: wrapSuccess(ChannelSchema) } },
      },
      404: {
        description: "Channel not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
      400: {
        description: "Invalid input or Meta API error",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { channelId, accessToken: shortToken } = c.req.valid("json");

    // 1. Find the channel
    const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
    if (!channel) return error(c, "Channel not found", 404);
    if (channel.type !== "whatsapp") return error(c, "Resync only supported for WhatsApp channels", 400);

    const config = channel.config as Record<string, unknown>;

    // 2. Exchange short-lived token for long-lived token
    let longLivedToken: string;
    let tokenExpiresAt: string;
    try {
      const exchanged = await exchangeForLongLivedToken(shortToken);
      longLivedToken = exchanged.accessToken;
      tokenExpiresAt = exchanged.expiresAt;
      console.log(`[meta/resync] Token exchanged for channel ${channelId}, expires ${tokenExpiresAt}`);
    } catch (err) {
      console.warn(`[meta/resync] Token exchange failed, using short-lived token: ${err instanceof Error ? err.message : err}`);
      longLivedToken = shortToken;
      tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    }

    // 3. Re-subscribe app to WABA webhooks
    const wabaId = (config.wabaId || config.businessAccountId) as string;
    if (wabaId) {
      const subRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${longLivedToken}`,
        },
      });

      if (!subRes.ok) {
        const subData = (await subRes.json()) as Record<string, unknown>;
        const msg = (subData.error as Record<string, string>)?.message || "Failed to re-subscribe to WABA webhooks";
        return error(c, msg, 400);
      }
    }

    // 4. Update channel config with new token
    const [updated] = await db
      .update(channels)
      .set({
        config: {
          ...config,
          accessToken: longLivedToken,
          tokenExpiresAt,
        },
        updatedAt: new Date(),
      })
      .where(eq(channels.id, channelId))
      .returning();

    return success(c, serializeChannel(updated), 200);
  },
);

export { channelsRouter };
