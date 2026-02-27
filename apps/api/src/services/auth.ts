import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { db } from "../db";
import { users } from "../db/schema";
import { env } from "../env";
import { ValidationError } from "../utils/errors";

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) return null;

  const valid = await Bun.password.verify(password, user.passwordHash);
  if (!valid) return null;

  if (user.status === "blocked") return null;

  const token = await sign(
    { sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 },
    env.JWT_SECRET
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (existing) throw new ValidationError("A user with this email already exists");

  const passwordHash = await Bun.password.hash(data.password);
  const [user] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    })
    .returning();
  return user;
}
