import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { users, conversationReads, conversations, messages, media } from "../db/schema";
import { NotFoundError, ValidationError } from "../utils/errors";

const publicColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  status: users.status,
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
    status: user.status,
    createdAt: user.createdAt,
  };
}

export async function blockUser(id: string, currentUserId: string) {
  if (id === currentUserId) throw new ValidationError("You cannot block yourself");

  const [user] = await db
    .update(users)
    .set({ status: "blocked", updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!user) throw new NotFoundError("User");

  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt };
}

export async function activateUser(id: string) {
  const [user] = await db
    .update(users)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!user) throw new NotFoundError("User");

  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt };
}

export async function deleteUser(id: string, currentUserId: string) {
  if (id === currentUserId) throw new ValidationError("You cannot delete yourself");

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!existing) throw new NotFoundError("User");

  await db.transaction(async (tx) => {
    await tx.delete(conversationReads).where(eq(conversationReads.userId, id));
    await tx.update(conversations).set({ assignedTo: null }).where(eq(conversations.assignedTo, id));
    await tx.update(messages).set({ senderId: null }).where(eq(messages.senderId, id));
    await tx.update(media).set({ uploadedBy: null }).where(eq(media.uploadedBy, id));
    await tx.delete(users).where(eq(users.id, id));
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new NotFoundError("User");

  const valid = await Bun.password.verify(currentPassword, user.passwordHash);
  if (!valid) throw new ValidationError("Current password is incorrect");

  const passwordHash = await Bun.password.hash(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
