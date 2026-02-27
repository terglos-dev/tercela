import { jwt } from "hono/jwt";
import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { env } from "../env";
import { db } from "../db";
import { users } from "../db/schema";

export const authMiddleware = jwt({ secret: env.JWT_SECRET, alg: "HS256" });

export const activeUserMiddleware = createMiddleware(async (c, next) => {
  const payload = c.get("jwtPayload");
  if (!payload?.sub) {
    return c.json({ error: { message: "Unauthorized" } }, 401);
  }

  const [user] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user || user.status === "blocked") {
    return c.json({ error: { message: "Account is blocked" } }, 403);
  }

  await next();
});
