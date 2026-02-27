import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Serialized, Message, MessageType } from "@tercela/shared";
import { listMessages, sendOutboundMessage } from "../services/message";
import { getStorageConfig, uploadMedia } from "../services/storage";
import { success, successWithMeta, error } from "../utils/response";
import { wrapSuccess, wrapPaginated, ErrorResponseSchema } from "../utils/openapi-schemas";

type MessageResponse = Serialized<Message>;

const messagesRouter = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" }, description: "Conversation ID" }),
});

const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  direction: z.enum(["inbound", "outbound"]),
  type: z.string(),
  content: z.string(),
  externalId: z.string().nullable(),
  status: z.string(),
  senderId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// GET /:id/messages
messagesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}/messages",
    tags: ["Messages"],
    summary: "List conversation messages",
    request: {
      params: IdParam,
      query: z.object({
        limit: z.coerce.number().min(1).max(100).default(50).optional(),
        before: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: "Paginated list of messages",
        content: { "application/json": { schema: wrapPaginated(MessageSchema) } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { limit, before } = c.req.valid("query");
    const result = await listMessages(id, { limit, before });
    return successWithMeta(
      c,
      result.data as unknown as MessageResponse[],
      { nextCursor: result.nextCursor, hasMore: result.hasMore },
      200,
    );
  },
);

// POST /:id/messages
const sendSchema = z.object({
  type: z
    .enum(["text", "image", "audio", "video", "document", "location", "template"])
    .default("text"),
  content: z.string().min(1).openapi({ example: "Hello, how can I help you?" }),
});

messagesRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/messages",
    tags: ["Messages"],
    summary: "Send message",
    description: "Send an outbound message to the conversation contact",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: sendSchema } } },
    },
    responses: {
      201: {
        description: "Message sent",
        content: { "application/json": { schema: wrapSuccess(MessageSchema) } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const jwtPayload = c.get("jwtPayload");
    const senderId = jwtPayload.sub as string;

    console.log("[messages] Sending outbound:", { conversationId: id, type: data.type, contentLength: data.content.length, senderId });

    const msg = await sendOutboundMessage(id, data.content, senderId, data.type);
    console.log("[messages] Message saved:", { id: msg.id, externalId: msg.externalId, status: msg.status });

    const server = globalThis.__bunServer;
    if (server) {
      server.publish(
        `conversation:${id}`,
        JSON.stringify({ type: "message:new", payload: msg }),
      );
      server.publish(
        "conversations",
        JSON.stringify({
          type: "conversation:updated",
          payload: { conversationId: id, lastMessageAt: new Date() },
        }),
      );
      console.log("[messages] WS broadcast sent");
    } else {
      console.warn("[messages] No WS server — cannot broadcast");
    }

    return success(c, msg as unknown as MessageResponse, 201);
  },
);

// POST /:id/messages/upload — upload media file and send
messagesRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/messages/upload",
    tags: ["Messages"],
    summary: "Upload and send media",
    description: "Upload a media file to S3 and send it as a message",
    request: {
      params: IdParam,
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              file: z.any().openapi({ type: "string", format: "binary" }),
              caption: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      201: {
        description: "Media uploaded and message sent",
        content: { "application/json": { schema: wrapSuccess(MessageSchema) } },
      },
      400: {
        description: "Invalid input or storage not configured",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id: conversationId } = c.req.valid("param");
    const jwtPayload = c.get("jwtPayload");
    const senderId = jwtPayload.sub as string;

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string) || undefined;

    if (!file) {
      return error(c, "No file provided", 400);
    }

    const storageConfig = await getStorageConfig();
    if (!storageConfig) {
      return error(c, "Storage not configured", 400);
    }

    const mimeType = file.type || "application/octet-stream";
    const mimePrefix = mimeType.split("/")[0];
    let type: MessageType = "document";
    if (mimePrefix === "image") type = "image";
    else if (mimePrefix === "audio") type = "audio";
    else if (mimePrefix === "video") type = "video";

    const ext = file.name?.split(".").pop() || mimeType.split("/")[1]?.split(";")[0] || "bin";
    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    const s3Key = `media/${datePath}/${crypto.randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const fullKey = await uploadMedia(buffer, s3Key, mimeType);

    const content = JSON.stringify({
      url: `/v1/media/${fullKey}`,
      mimeType,
      filename: file.name || undefined,
      caption,
      size: buffer.length,
    });

    console.log("[messages] Upload media:", { conversationId, type, filename: file.name, size: buffer.length });

    const msg = await sendOutboundMessage(conversationId, content, senderId, type);

    const server = globalThis.__bunServer;
    if (server) {
      server.publish(
        `conversation:${conversationId}`,
        JSON.stringify({ type: "message:new", payload: msg }),
      );
      server.publish(
        "conversations",
        JSON.stringify({
          type: "conversation:updated",
          payload: { conversationId, lastMessageAt: new Date() },
        }),
      );
    }

    return success(c, msg as unknown as MessageResponse, 201);
  },
);

export { messagesRouter };
