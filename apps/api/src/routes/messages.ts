import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Serialized, Message, MessageType } from "@tercela/shared";
import { listMessages, sendOutboundMessage } from "../services/message";
import { createMediaRecord } from "../services/media";
import { getStorageConfig, uploadMedia } from "../services/storage";
import { broadcastNewMessage } from "../utils/broadcast";
import { logger } from "../utils/logger";
import { success, successWithMeta, error } from "../utils/response";
import { wrapSuccess, wrapPaginated, ErrorResponseSchema } from "../utils/openapi-schemas";

type MessageResponse = Serialized<Message>;
type JwtPayload = { sub: string; role: string };

const messagesRouter = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" }, description: "Conversation ID" }),
});

const MediaSchema = z.object({
  id: z.string(),
  s3Key: z.string(),
  mimeType: z.string(),
  filename: z.string().nullable(),
  size: z.number().nullable(),
  uploadedBy: z.string().nullable(),
  createdAt: z.string(),
});

const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  direction: z.enum(["inbound", "outbound"]),
  type: z.string(),
  content: z.string(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  mediaId: z.string().nullable(),
  media: MediaSchema.nullable().optional(),
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
    const senderId = (c.get("jwtPayload") as JwtPayload).sub;

    const msg = await sendOutboundMessage(id, data.content, senderId, data.type);
    const msgWithMedia = { ...msg, media: null };
    broadcastNewMessage(id, msgWithMedia);

    return success(c, msgWithMedia as unknown as MessageResponse, 201);
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
    const senderId = (c.get("jwtPayload") as JwtPayload).sub;

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string) || undefined;

    if (!file) return error(c, "No file provided", 400);

    const storageConfig = await getStorageConfig();
    if (!storageConfig) return error(c, "Storage not configured", 400);

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

    let fullKey: string;
    let mediaRecord: Awaited<ReturnType<typeof createMediaRecord>>;

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      fullKey = await uploadMedia(buffer, s3Key, mimeType);

      mediaRecord = await createMediaRecord({
        s3Key: fullKey,
        mimeType,
        filename: file.name || null,
        size: buffer.length,
        uploadedBy: senderId,
      });
    } catch (err) {
      logger.error("messages", "Media upload failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return error(c, "Failed to upload media", 400);
    }

    const content = caption || "";
    const msg = await sendOutboundMessage(conversationId, content, senderId, type, mediaRecord.id);
    const msgWithMedia = { ...msg, media: mediaRecord };

    broadcastNewMessage(conversationId, msgWithMedia);

    return success(c, msgWithMedia as unknown as MessageResponse, 201);
  },
);

export { messagesRouter };
