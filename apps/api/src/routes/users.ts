import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createUser } from "../services/auth";
import { listUsers, getUser, updateUser, blockUser, activateUser, deleteUser, changePassword } from "../services/user";
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
  status: z.string(),
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

// POST /me/password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

usersRouter.openapi(
  createRoute({
    method: "post",
    path: "/me/password",
    tags: ["Users"],
    summary: "Change current user password",
    request: {
      body: { content: { "application/json": { schema: changePasswordSchema } } },
    },
    responses: {
      200: {
        description: "Password changed",
        content: { "application/json": { schema: wrapSuccess(z.object({ success: z.boolean() })) } },
      },
      400: {
        description: "Invalid input or wrong password",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { currentPassword, newPassword } = c.req.valid("json");
    const userId = c.get("jwtPayload").sub as string;
    await changePassword(userId, currentPassword, newPassword);
    return success(c, { success: true }, 200);
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
    return success(c, { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt } as unknown as UserResponse, 201);
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

// POST /:id/block
usersRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/block",
    tags: ["Users"],
    summary: "Block user",
    request: { params: IdParam },
    responses: {
      200: {
        description: "User blocked",
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
    const currentUserId = c.get("jwtPayload").sub as string;
    const user = await blockUser(id, currentUserId);
    return success(c, user as unknown as UserResponse, 200);
  },
);

// POST /:id/activate
usersRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/activate",
    tags: ["Users"],
    summary: "Activate user",
    request: { params: IdParam },
    responses: {
      200: {
        description: "User activated",
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
    const user = await activateUser(id);
    return success(c, user as unknown as UserResponse, 200);
  },
);

// DELETE /:id
usersRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Users"],
    summary: "Delete user",
    request: { params: IdParam },
    responses: {
      200: {
        description: "User deleted",
        content: { "application/json": { schema: wrapSuccess(z.object({ success: z.boolean() })) } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const currentUserId = c.get("jwtPayload").sub as string;
    await deleteUser(id, currentUserId);
    return success(c, { success: true }, 200);
  },
);

export { usersRouter };
