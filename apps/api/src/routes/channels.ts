import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { channels } from "../db/schema";
import { success, error } from "../utils/response";
import { wrapSuccess, ErrorResponseSchema } from "../utils/openapi-schemas";
import {
  verifyChannelToken,
  deleteChannelCascade,
  fetchMetaAccounts,
  connectWhatsAppChannel,
  resyncWhatsAppChannel,
} from "../services/channel";
import type { WhatsAppChannelConfig } from "@tercela/shared";

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

    const config = channel.config as unknown as WhatsAppChannelConfig;
    const result = await verifyChannelToken(config);
    return success(c, result, 200);
  },
);

// POST /
const createSchema = z.object({
  type: z.enum(["whatsapp"]).openapi({ example: "whatsapp" }),
  name: z.string().min(1).openapi({ example: "Main WhatsApp" }),
  config: z.record(z.string(), z.unknown()),
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
    },
  }),
  async (c) => {
    const data = c.req.valid("json");
    const [channel] = await db
      .insert(channels)
      .values({ type: data.type, name: data.name, config: data.config, isActive: true })
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

// DELETE /:id
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
    const result = await deleteChannelCascade(id);
    if (!result) return error(c, "Channel not found", 404);
    return success(c, serializeChannel(result), 200);
  },
);

// POST /meta/accounts
const metaAccountsSchema = z.object({
  accessToken: z.string().min(1),
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
    const wabas = await fetchMetaAccounts(accessToken);
    return success(c, wabas, 200);
  },
);

// POST /meta/connect
const metaConnectSchema = z.object({
  accessToken: z.string().min(1),
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  name: z.string().optional(),
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
    const { accessToken, phoneNumberId, wabaId, name } = c.req.valid("json");
    const channel = await connectWhatsAppChannel(accessToken, phoneNumberId, wabaId, name);
    return success(c, serializeChannel(channel), 201);
  },
);

// POST /meta/resync
const metaResyncSchema = z.object({
  channelId: z.string().min(1),
  accessToken: z.string().min(1),
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
    const { channelId, accessToken } = c.req.valid("json");
    const updated = await resyncWhatsAppChannel(channelId, accessToken);
    return success(c, serializeChannel(updated), 200);
  },
);

export { channelsRouter };
