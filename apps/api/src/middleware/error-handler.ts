import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { error } from "../utils/response";

export const errorHandler: ErrorHandler = (err, c) => {
  const status = "status" in err && typeof err.status === "number" ? err.status : 500;

  if (status >= 500) {
    console.error(`[Error] ${err.message}`, err.stack);
  }

  return error(c, status >= 500 ? "Internal server error" : err.message, status as ContentfulStatusCode);
};
