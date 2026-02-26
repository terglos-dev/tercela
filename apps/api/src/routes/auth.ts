import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Serialized, AuthResponse } from "@tercela/shared";
import { login } from "../services/auth";
import { success, error } from "../utils/response";
import { wrapSuccess, ErrorResponseSchema } from "../utils/openapi-schemas";

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
          schema: wrapSuccess(
            z.object({
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
          ),
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

auth.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid("json");
  const result = await login(email, password);

  if (!result) {
    return error(c, "Invalid credentials", 401);
  }

  return success(c, result as unknown as Serialized<AuthResponse>, 200);
});

export { auth };
