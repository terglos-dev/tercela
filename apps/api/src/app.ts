import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createBunWebSocket } from "hono/bun";
import { verify } from "hono/jwt";
import { errorHandler } from "./middleware/error-handler";
import { authMiddleware, activeUserMiddleware } from "./middleware/auth";
import { rateLimit } from "./middleware/rate-limit";
import { auth } from "./routes/auth";
import { contactsRouter } from "./routes/contacts";
import { conversationsRouter } from "./routes/conversations";
import { messagesRouter } from "./routes/messages";
import { usersRouter } from "./routes/users";
import { channelsRouter } from "./routes/channels";
import { templatesRouter, allTemplatesRouter } from "./routes/templates";
import { settingsRouter } from "./routes/settings";
import { mediaRouter } from "./routes/media";
import { whatsappWebhook } from "./routes/webhooks/whatsapp";
import type { ServerWebSocket } from "bun";
import { handleWsOpen, handleWsMessage, handleWsClose, type WsData } from "./ws";
import { success } from "./utils/response";
import { env } from "./env";

const { upgradeWebSocket, websocket } = createBunWebSocket<WsData>();

const app = new OpenAPIHono();

// Global middleware
if (process.env.DEBUG_HTTP) app.use("*", logger());
app.use("*", cors({ origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()), credentials: true }));
app.onError(errorHandler);

// Health check
app.get("/health", (c) => success(c, { status: "ok" }, 200));

// Rate limiting
app.use("/v1/auth/*", rateLimit({ windowMs: 60_000, max: 10, prefix: "auth" }));
app.use("/webhooks/*", rateLimit({ windowMs: 1_000, max: 50, prefix: "webhook" }));
app.use("/v1/*", rateLimit({ windowMs: 60_000, max: 200, prefix: "api" }));

// Public routes (no auth)
app.route("/v1/auth", auth);
app.route("/v1/media", mediaRouter); // Auth handled internally (token query param + Bearer)
app.route("/webhooks/whatsapp", whatsappWebhook);

// WebSocket (authenticated via ?token= query param)
app.get(
  "/ws",
  async (c, next) => {
    const token = new URL(c.req.url).searchParams.get("token");
    if (!token) return c.text("Unauthorized", 401);
    try {
      const payload = await verify(token, env.JWT_SECRET, "HS256");
      c.set("jwtPayload", payload);
    } catch {
      return c.text("Unauthorized", 401);
    }
    return next();
  },
  upgradeWebSocket((c) => {
    const payload = c.get("jwtPayload");
    return {
      onOpen(_event, ws) {
        const raw = ws.raw as ServerWebSocket<WsData>;
        raw.data.userId = payload?.sub as string;
        handleWsOpen(raw);
      },
      onMessage(event, ws) {
        handleWsMessage(ws.raw as ServerWebSocket<WsData>, event.data as string);
      },
      onClose(_event, ws) {
        handleWsClose(ws.raw as ServerWebSocket<WsData>);
      },
    };
  }),
);

// Protected routes
app.use("/v1/channels/*", authMiddleware, activeUserMiddleware);
app.use("/v1/contacts/*", authMiddleware, activeUserMiddleware);
app.use("/v1/conversations/*", authMiddleware, activeUserMiddleware);
app.use("/v1/users/*", authMiddleware, activeUserMiddleware);
app.use("/v1/settings/*", authMiddleware, activeUserMiddleware);
app.use("/v1/templates/*", authMiddleware, activeUserMiddleware);
app.use("/v1/templates", authMiddleware, activeUserMiddleware);
app.route("/v1/channels", channelsRouter);
app.route("/v1/channels", templatesRouter);
app.route("/v1/templates", allTemplatesRouter);
app.route("/v1/settings", settingsRouter);
app.route("/v1/contacts", contactsRouter);
app.route("/v1/conversations", conversationsRouter);
app.route("/v1/conversations", messagesRouter);
app.route("/v1/users", usersRouter);

// OpenAPI spec
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "Tercela API",
    version: "0.1.0",
    description: "Tercela omnichannel platform API",
  },
  servers: [{ url: "http://localhost:3333", description: "Local" }],
});

// Scalar API Reference UI
app.get(
  "/docs",
  apiReference({
    url: "/doc",
    theme: "purple",
    pageTitle: "Tercela API Reference",
  }),
);

export { app, websocket };
