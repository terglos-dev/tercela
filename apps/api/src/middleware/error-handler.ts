import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { error } from "../utils/response";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(`[Error] ${err.message}`, err.stack);

  if ("status" in err && typeof err.status === "number") {
    return error(c, err.message, err.status as ContentfulStatusCode);
  }

  return error(c, "Internal server error", 500);
};
