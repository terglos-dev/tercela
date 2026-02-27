import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "../utils/errors";
import { error } from "../utils/response";
import { logger } from "../utils/logger";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error("error-handler", err.message, { code: err.code, stack: err.stack });
    }
    return error(c, err.message, err.statusCode as ContentfulStatusCode);
  }

  const status = "status" in err && typeof err.status === "number" ? err.status : 500;

  if (status >= 500) {
    logger.error("error-handler", err.message, { stack: err.stack });
  }

  return error(c, status >= 500 ? "Internal server error" : err.message, status as ContentfulStatusCode);
};
