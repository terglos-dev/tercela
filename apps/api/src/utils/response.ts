import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function success<T, S extends ContentfulStatusCode>(c: Context, data: T, status: S) {
  return c.json({ success: true as const, data }, status);
}

export function successWithMeta<T, S extends ContentfulStatusCode>(
  c: Context,
  data: T[],
  meta: { nextCursor: string | null; hasMore: boolean },
  status: S,
) {
  return c.json({ success: true as const, data, meta }, status);
}

export function error<S extends ContentfulStatusCode>(c: Context, message: string, status: S) {
  return c.json({ success: false as const, error: { message } }, status);
}
