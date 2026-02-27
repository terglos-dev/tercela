import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createUser } from "../services/auth";
import { listUsers, getUser, updateUser } from "../services/user";
import { success, successWithMeta, error } from "../utils/response";
import { wrapSuccess, wrapPaginated, ErrorResponseSchema } from "../utils/openapi-schemas";

const usersRouter = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" }, example: "uuid" }),
});

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.string(),
});

type UserResponse = z.infer<typeof UserSchema>;

// GET /
usersRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Users"],
    summary: "List users",
    request: {
      query: z.object({
        limit: z.coerce.number().min(1).max(100).default(50).optional(),
        offset: z.coerce.number().min(0).default(0).optional(),
      }),
    },
    responses: {
      200: {
        description: "Paginated list of users",
        content: { "application/json": { schema: wrapPaginated(UserSchema) } },
      },
    },
  }),
  async (c) => {
    const { limit, offset } = c.req.valid("query");
    const result = await listUsers({ limit, offset });
    return successWithMeta(
      c,
      result.data as unknown as UserResponse[],
      { hasMore: result.hasMore, nextCursor: result.hasMore ? String(result.offset + result.limit) : null },
      200,
    );
  },
);

// GET /:id
usersRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Users"],
    summary: "Get user by ID",
    request: { params: IdParam },
    responses: {
      200: {
        description: "User found",
        content: { "application/json": { schema: wrapSuccess(UserSchema) } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = await getUser(id);
    if (!user) return error(c, "User not found", 404);
    return success(c, user as unknown as UserResponse, 200);
  },
);

// POST /
const createSchema = z.object({
  name: z.string().min(1).openapi({ example: "John Doe" }),
  email: z.string().email().openapi({ example: "john@company.com" }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .openapi({ example: "Secure1pass" }),
  role: z.enum(["admin", "agent"]).default("agent"),
});

usersRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Users"],
    summary: "Create user",
    request: {
      body: { content: { "application/json": { schema: createSchema } } },
    },
    responses: {
      201: {
        description: "User created",
        content: { "application/json": { schema: wrapSuccess(UserSchema) } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const data = c.req.valid("json");
    const user = await createUser(data);
    return success(c, { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } as unknown as UserResponse, 201);
  },
);

// PATCH /:id
const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "agent"]).optional(),
});

usersRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    tags: ["Users"],
    summary: "Update user",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: updateSchema } } },
    },
    responses: {
      200: {
        description: "User updated",
        content: { "application/json": { schema: wrapSuccess(UserSchema) } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const user = await updateUser(id, data);
    if (!user) return error(c, "User not found", 404);
    return success(c, user as unknown as UserResponse, 200);
  },
);

export { usersRouter };
