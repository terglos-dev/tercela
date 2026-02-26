import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { channels } from "../db/schema";
import { success, error } from "../utils/response";
import { wrapSuccess, ErrorResponseSchema } from "../utils/openapi-schemas";

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

// DELETE /:id (soft delete — sets isActive = false)
channelsRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Channels"],
    summary: "Deactivate channel",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Channel deactivated",
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
    const [channel] = await db
      .update(channels)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(channels.id, id))
      .returning();
    if (!channel) return error(c, "Channel not found", 404);
    return success(c, serializeChannel(channel), 200);
  },
);

export { channelsRouter };
