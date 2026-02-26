import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { createUser } from "../services/auth";

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

const ErrorSchema = z.object({ error: z.string() });

// GET /
usersRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Users"],
    summary: "List users",
    responses: {
      200: {
        description: "List of users",
        content: { "application/json": { schema: z.array(UserSchema) } },
      },
    },
  }),
  async (c) => {
    const result = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .orderBy(users.createdAt);
    return c.json(result as any, 200);
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
        content: { "application/json": { schema: UserSchema } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) return c.json({ error: "User not found" }, 404);
    return c.json(user as any, 200);
  },
);

// POST /
const createSchema = z.object({
  name: z.string().min(1).openapi({ example: "John Doe" }),
  email: z.string().email().openapi({ example: "john@company.com" }),
  password: z.string().min(6).openapi({ example: "pass123" }),
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
        content: { "application/json": { schema: UserSchema } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const data = c.req.valid("json");
    const user = await createUser(data);
    return c.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } as any, 201);
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
        content: { "application/json": { schema: UserSchema } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) return c.json({ error: "User not found" }, 404);
    return c.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } as any, 200);
  },
);

export { usersRouter };
