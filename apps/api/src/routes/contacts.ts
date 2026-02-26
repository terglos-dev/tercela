import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { listContacts, getContact, updateContact } from "../services/contact";
import { db } from "../db";
import { contacts } from "../db/schema";

const contactsRouter = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" }, example: "uuid" }),
});

const ContactSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  channelType: z.string(),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ErrorSchema = z.object({ error: z.string() });

// GET /
contactsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Contacts"],
    summary: "Listar contatos",
    responses: {
      200: {
        description: "Lista de contatos",
        content: { "application/json": { schema: z.array(ContactSchema) } },
      },
    },
  }),
  async (c) => {
    const result = await listContacts();
    return c.json(result as any, 200);
  },
);

// GET /:id
contactsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Contacts"],
    summary: "Buscar contato por ID",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Contato encontrado",
        content: { "application/json": { schema: ContactSchema } },
      },
      404: {
        description: "Contato não encontrado",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const contact = await getContact(id);
    if (!contact) return c.json({ error: "Contact not found" }, 404);
    return c.json(contact as any, 200);
  },
);

// POST /
const createSchema = z.object({
  externalId: z.string().openapi({ example: "5511999999999" }),
  name: z.string().optional().openapi({ example: "João" }),
  phone: z.string().optional().openapi({ example: "+5511999999999" }),
  channelType: z.enum(["whatsapp", "webchat", "instagram"]),
  metadata: z.record(z.unknown()).optional(),
});

contactsRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Contacts"],
    summary: "Criar contato",
    request: {
      body: { content: { "application/json": { schema: createSchema } } },
    },
    responses: {
      201: {
        description: "Contato criado",
        content: { "application/json": { schema: ContactSchema } },
      },
      400: {
        description: "Input inválido",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const data = c.req.valid("json");
    const [contact] = await db
      .insert(contacts)
      .values({
        externalId: data.externalId,
        name: data.name ?? null,
        phone: data.phone ?? null,
        channelType: data.channelType,
        metadata: data.metadata ?? {},
      })
      .returning();
    return c.json(contact as any, 201);
  },
);

// PATCH /:id
const updateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

contactsRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    tags: ["Contacts"],
    summary: "Atualizar contato",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: updateSchema } } },
    },
    responses: {
      200: {
        description: "Contato atualizado",
        content: { "application/json": { schema: ContactSchema } },
      },
      404: {
        description: "Contato não encontrado",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const contact = await updateContact(id, data);
    if (!contact) return c.json({ error: "Contact not found" }, 404);
    return c.json(contact as any, 200);
  },
);

export { contactsRouter };
