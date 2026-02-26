import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Serialized, Contact } from "@tercela/shared";
import { listContacts, getContact, updateContact } from "../services/contact";
import { db } from "../db";
import { contacts } from "../db/schema";
import { success, error } from "../utils/response";
import { wrapSuccess, ErrorResponseSchema } from "../utils/openapi-schemas";

type ContactResponse = Serialized<Contact>;

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
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// GET /
contactsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Contacts"],
    summary: "List contacts",
    responses: {
      200: {
        description: "List of contacts",
        content: { "application/json": { schema: wrapSuccess(z.array(ContactSchema)) } },
      },
    },
  }),
  async (c) => {
    const result = await listContacts();
    return success(c, result as unknown as ContactResponse[], 200);
  },
);

// GET /:id
contactsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Contacts"],
    summary: "Get contact by ID",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Contact found",
        content: { "application/json": { schema: wrapSuccess(ContactSchema) } },
      },
      404: {
        description: "Contact not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const contact = await getContact(id);
    if (!contact) return error(c, "Contact not found", 404);
    return success(c, contact as unknown as ContactResponse, 200);
  },
);

// POST /
const createSchema = z.object({
  externalId: z.string().openapi({ example: "5511999999999" }),
  name: z.string().optional().openapi({ example: "John" }),
  phone: z.string().optional().openapi({ example: "+5511999999999" }),
  channelType: z.enum(["whatsapp", "webchat", "instagram"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

contactsRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Contacts"],
    summary: "Create contact",
    request: {
      body: { content: { "application/json": { schema: createSchema } } },
    },
    responses: {
      201: {
        description: "Contact created",
        content: { "application/json": { schema: wrapSuccess(ContactSchema) } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: ErrorResponseSchema } },
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
    return success(c, contact as unknown as ContactResponse, 201);
  },
);

// PATCH /:id
const updateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

contactsRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    tags: ["Contacts"],
    summary: "Update contact",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: updateSchema } } },
    },
    responses: {
      200: {
        description: "Contact updated",
        content: { "application/json": { schema: wrapSuccess(ContactSchema) } },
      },
      404: {
        description: "Contact not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const contact = await updateContact(id, data);
    if (!contact) return error(c, "Contact not found", 404);
    return success(c, contact as unknown as ContactResponse, 200);
  },
);

export { contactsRouter };
