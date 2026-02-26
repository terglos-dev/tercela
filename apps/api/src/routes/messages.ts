import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Serialized, Message } from "@tercela/shared";
import { listMessages, sendOutboundMessage } from "../services/message";
import { success, successWithMeta } from "../utils/response";
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

    const msg = await sendOutboundMessage(id, data.content, senderId, data.type);
    return success(c, msg as unknown as MessageResponse, 201);
  },
);

export { messagesRouter };
