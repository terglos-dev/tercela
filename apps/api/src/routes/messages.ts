import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { listMessages, sendOutboundMessage } from "../services/message";

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

const ErrorSchema = z.object({ error: z.string() });

// GET /:id/messages
messagesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}/messages",
    tags: ["Messages"],
    summary: "List conversation messages",
    request: { params: IdParam },
    responses: {
      200: {
        description: "List of messages",
        content: { "application/json": { schema: z.array(MessageSchema) } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await listMessages(id);
    return c.json(result as any, 200);
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
        content: { "application/json": { schema: MessageSchema } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const jwtPayload = c.get("jwtPayload");
    const senderId = jwtPayload.sub as string;

    const msg = await sendOutboundMessage(id, data.content, senderId, data.type);
    return c.json(msg as any, 201);
  },
);

export { messagesRouter };
