import { OpenAPIHono } from "@hono/zod-openapi";
import { verify } from "hono/jwt";
import { getMediaStream } from "../services/storage";
import { getMediaById } from "../services/media";
import { env } from "../env";
import { logger } from "../utils/logger";

const mediaRouter = new OpenAPIHono();

// Auth via ?token= query param (needed for <img>/<audio>/<video> src) OR Bearer header
mediaRouter.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  const token = url.searchParams.get("token");
  const authHeader = c.req.header("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const jwt = token || bearerToken;

  if (!jwt) return c.text("Unauthorized", 401);

  try {
    await verify(jwt, env.JWT_SECRET, "HS256");
  } catch {
    return c.text("Unauthorized", 401);
  }

  return next();
});

// GET /v1/media/:id — resolve media record and stream from S3
mediaRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) return c.text("Not found", 404);

  try {
    const record = await getMediaById(id);
    if (!record) return c.text("Not found", 404);

    const { stream, contentType, contentLength } = await getMediaStream(record.s3Key);

    return new Response(stream, {
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": String(contentLength) } : {}),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    logger.error("media", "Failed to stream", { id, error: err instanceof Error ? err.message : String(err) });
    return c.text("Not found", 404);
  }
});

// GET /v1/media/* — legacy fallback: stream by raw S3 path (backwards compat)
mediaRouter.get("/*", async (c) => {
  const path = c.req.path.replace("/v1/media/", "");
  if (!path) return c.text("Not found", 404);

  try {
    const { stream, contentType, contentLength } = await getMediaStream(path);

    return new Response(stream, {
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": String(contentLength) } : {}),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    logger.error("media", "Failed to stream (legacy)", { path, error: err instanceof Error ? err.message : String(err) });
    return c.text("Not found", 404);
  }
});

export { mediaRouter };
