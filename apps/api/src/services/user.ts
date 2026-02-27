import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

const publicColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
};

export async function listUsers(opts: { limit?: number; offset?: number } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = opts.offset ?? 0;

  const result = await db
    .select(publicColumns)
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = result.length > limit;
  if (hasMore) result.pop();

  return { data: result, hasMore, offset, limit };
}

export async function getUser(id: string) {
  const [user] = await db
    .select(publicColumns)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
}

export async function updateUser(id: string, data: { name?: string; email?: string; role?: string }) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
