import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { success, error } from "../utils/response";
import { wrapSuccess, ErrorResponseSchema } from "../utils/openapi-schemas";
import {
  syncTemplates,
  listTemplates,
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
} from "../services/template";
import type { TemplateComponent } from "@tercela/shared";
import type { templates } from "../db/schema";

const templatesRouter = new OpenAPIHono();

const ChannelIdParam = z.object({
  channelId: z.string().openapi({ param: { name: "channelId", in: "path" }, example: "uuid" }),
});

const TemplateNameParam = z.object({
  channelId: z.string().openapi({ param: { name: "channelId", in: "path" }, example: "uuid" }),
  name: z.string().openapi({ param: { name: "name", in: "path" }, example: "order_confirmation" }),
});

const TemplateIdParam = z.object({
  channelId: z.string().openapi({ param: { name: "channelId", in: "path" }, example: "uuid" }),
  templateId: z.string().openapi({ param: { name: "templateId", in: "path" }, example: "uuid" }),
});

const TemplateSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  metaId: z.string().nullable(),
  name: z.string(),
  language: z.string(),
  category: z.string(),
  status: z.string(),
  components: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string(),
  syncedAt: z.string(),
});

type TemplateRow = typeof templates.$inferSelect;

function serializeTemplate(t: TemplateRow) {
  return {
    id: t.id,
    channelId: t.channelId,
    metaId: t.metaId,
    name: t.name,
    language: t.language,
    category: t.category,
    status: t.status,
    components: t.components,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    syncedAt: t.syncedAt.toISOString(),
  };
}

// GET /:channelId/templates
templatesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{channelId}/templates",
    tags: ["Templates"],
    summary: "List templates for a channel",
    request: {
      params: ChannelIdParam,
      query: z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: "List of templates",
        content: { "application/json": { schema: wrapSuccess(z.array(TemplateSchema)) } },
      },
    },
  }),
  async (c) => {
    const { channelId } = c.req.valid("param");
    const { status, search } = c.req.valid("query");
    const result = await listTemplates(channelId, { status, search });
    return success(c, result.map(serializeTemplate), 200);
  },
);

// POST /:channelId/templates/sync
templatesRouter.openapi(
  createRoute({
    method: "post",
    path: "/{channelId}/templates/sync",
    tags: ["Templates"],
    summary: "Sync templates from Meta",
    request: { params: ChannelIdParam },
    responses: {
      200: {
        description: "Templates synced",
        content: { "application/json": { schema: wrapSuccess(z.array(TemplateSchema)) } },
      },
      404: {
        description: "Channel not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { channelId } = c.req.valid("param");
    const result = await syncTemplates(channelId);
    return success(c, result.map(serializeTemplate), 200);
  },
);

// POST /:channelId/templates
const createTemplateBody = z.object({
  name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, "Must be lowercase snake_case"),
  language: z.string().min(2),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  components: z.array(z.record(z.string(), z.unknown())).min(1),
});

templatesRouter.openapi(
  createRoute({
    method: "post",
    path: "/{channelId}/templates",
    tags: ["Templates"],
    summary: "Create a new template",
    request: {
      params: ChannelIdParam,
      body: { content: { "application/json": { schema: createTemplateBody } } },
    },
    responses: {
      201: {
        description: "Template created",
        content: { "application/json": { schema: wrapSuccess(TemplateSchema) } },
      },
      400: {
        description: "Validation or Meta API error",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { channelId } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await createTemplate(channelId, {
      name: body.name,
      language: body.language,
      category: body.category,
      components: body.components as unknown as TemplateComponent[],
    });
    return success(c, serializeTemplate(result), 201);
  },
);

// GET /:channelId/templates/:templateId
templatesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{channelId}/templates/{templateId}",
    tags: ["Templates"],
    summary: "Get a single template by ID",
    request: { params: TemplateIdParam },
    responses: {
      200: {
        description: "Template details",
        content: { "application/json": { schema: wrapSuccess(TemplateSchema) } },
      },
      404: {
        description: "Template not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { channelId, templateId } = c.req.valid("param");
    const result = await getTemplate(channelId, templateId);
    return success(c, serializeTemplate(result), 200);
  },
);

// PATCH /:channelId/templates/:templateId
const updateTemplateBody = z.object({
  components: z.array(z.record(z.string(), z.unknown())).min(1),
});

templatesRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{channelId}/templates/{templateId}",
    tags: ["Templates"],
    summary: "Update a template (PENDING/REJECTED only)",
    request: {
      params: TemplateIdParam,
      body: { content: { "application/json": { schema: updateTemplateBody } } },
    },
    responses: {
      200: {
        description: "Template updated",
        content: { "application/json": { schema: wrapSuccess(TemplateSchema) } },
      },
      400: {
        description: "Validation or Meta API error",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
      404: {
        description: "Template not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { channelId, templateId } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await updateTemplate(channelId, templateId, {
      components: body.components as unknown as TemplateComponent[],
    });
    return success(c, serializeTemplate(result), 200);
  },
);

// DELETE /:channelId/templates/:name
templatesRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{channelId}/templates/{name}",
    tags: ["Templates"],
    summary: "Delete a template by name",
    request: { params: TemplateNameParam },
    responses: {
      200: {
        description: "Template deleted",
        content: { "application/json": { schema: wrapSuccess(z.object({ success: z.boolean() })) } },
      },
      404: {
        description: "Channel not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { channelId, name } = c.req.valid("param");
    const result = await deleteTemplate(channelId, name);
    return success(c, result, 200);
  },
);

export { templatesRouter };
