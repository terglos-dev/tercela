import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { login } from "../services/auth";

const auth = new OpenAPIHono();

const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  summary: "Login",
  description: "Authenticate a user and return a JWT",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email().openapi({ example: "admin@tercela.com" }),
            password: z.string().min(1).openapi({ example: "admin123" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: z.object({
            token: z.string(),
            user: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string(),
              role: z.string(),
              createdAt: z.string(),
              updatedAt: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

auth.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid("json");
  const result = await login(email, password);

  if (!result) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  return c.json(result as any, 200);
});

export { auth };
