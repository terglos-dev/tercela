import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { listConversations, getConversation, updateConversation } from "../services/conversation";
import { success, successWithMeta, error } from "../utils/response";
import { wrapSuccess, wrapPaginated, ErrorResponseSchema } from "../utils/openapi-schemas";

const conversationsRouter = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" }, example: "uuid" }),
});

const ConversationSchema = z.object({
  id: z.string(),
  status: z.string(),
  lastMessageAt: z.string().nullable(),
  createdAt: z.string(),
  assignedTo: z.string().nullable(),
  contact: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      phone: z.string().nullable(),
      channelType: z.string(),
    })
    .nullable(),
  channel: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
    })
    .nullable(),
});

type ConversationResponse = z.infer<typeof ConversationSchema>;

// GET /
conversationsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Conversations"],
    summary: "List conversations",
    request: {
      query: z.object({
        limit: z.coerce.number().min(1).max(100).default(50).optional(),
        offset: z.coerce.number().min(0).default(0).optional(),
      }),
    },
    responses: {
      200: {
        description: "Paginated list of conversations",
        content: { "application/json": { schema: wrapPaginated(ConversationSchema) } },
      },
    },
  }),
  async (c) => {
    const { limit, offset } = c.req.valid("query");
    const result = await listConversations({ limit, offset });
    return successWithMeta(
      c,
      result.data as unknown as ConversationResponse[],
      { hasMore: result.hasMore, nextCursor: result.hasMore ? String(result.offset + result.limit) : null },
      200,
    );
  },
);

// GET /:id
conversationsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Conversations"],
    summary: "Get conversation by ID",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Conversation found",
        content: { "application/json": { schema: wrapSuccess(ConversationSchema) } },
      },
      404: {
        description: "Conversation not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const conv = await getConversation(id);
    if (!conv) return error(c, "Conversation not found", 404);
    return success(c, conv as unknown as ConversationResponse, 200);
  },
);

// PATCH /:id
const updateSchema = z.object({
  assignedTo: z.string().nullable().optional(),
  status: z.enum(["open", "closed", "pending"]).optional(),
});

conversationsRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    tags: ["Conversations"],
    summary: "Update conversation",
    description: "Update status or assign agent",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: updateSchema } } },
    },
    responses: {
      200: {
        description: "Conversation updated",
        content: { "application/json": { schema: wrapSuccess(ConversationSchema) } },
      },
      404: {
        description: "Conversation not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const conv = await updateConversation(id, data);
    if (!conv) return error(c, "Conversation not found", 404);
    return success(c, conv as unknown as ConversationResponse, 200);
  },
);

export { conversationsRouter };
