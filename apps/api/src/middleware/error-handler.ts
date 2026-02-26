import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(`[Error] ${err.message}`, err.stack);

  if ("status" in err && typeof err.status === "number") {
    return c.json({ error: err.message }, err.status as any);
  }

  return c.json({ error: "Internal server error" }, 500);
};
