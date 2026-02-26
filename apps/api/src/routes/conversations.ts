import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { listConversations, getConversation, updateConversation } from "../services/conversation";

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

const ErrorSchema = z.object({ error: z.string() });

// GET /
conversationsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Conversations"],
    summary: "Listar conversas",
    responses: {
      200: {
        description: "Lista de conversas",
        content: { "application/json": { schema: z.array(ConversationSchema) } },
      },
    },
  }),
  async (c) => {
    const result = await listConversations();
    return c.json(result as any, 200);
  },
);

// GET /:id
conversationsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Conversations"],
    summary: "Buscar conversa por ID",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Conversa encontrada",
        content: { "application/json": { schema: ConversationSchema } },
      },
      404: {
        description: "Conversa não encontrada",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const conv = await getConversation(id);
    if (!conv) return c.json({ error: "Conversation not found" }, 404);
    return c.json(conv as any, 200);
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
    summary: "Atualizar conversa",
    description: "Atualizar status ou atribuir operador",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: updateSchema } } },
    },
    responses: {
      200: {
        description: "Conversa atualizada",
        content: { "application/json": { schema: ConversationSchema } },
      },
      404: {
        description: "Conversa não encontrada",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const conv = await updateConversation(id, data);
    if (!conv) return c.json({ error: "Conversation not found" }, 404);
    return c.json(conv as any, 200);
  },
);

export { conversationsRouter };
