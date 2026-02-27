import type { Context, Next } from "hono";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

// Cleanup stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60 * 1000);

export function rateLimit(opts: { windowMs: number; max: number; prefix?: string }) {
  const { windowMs, max, prefix = "global" } = opts;

  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
      || c.req.header("x-real-ip")
      || "unknown";

    const key = `${prefix}:${ip}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count++;

    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      c.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return c.json({ error: { message: "Too many requests" } }, 429);
    }

    return next();
  };
}
