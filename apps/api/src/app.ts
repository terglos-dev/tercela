import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createBunWebSocket } from "hono/bun";
import { errorHandler } from "./middleware/error-handler";
import { authMiddleware } from "./middleware/auth";
import { auth } from "./routes/auth";
import { contactsRouter } from "./routes/contacts";
import { conversationsRouter } from "./routes/conversations";
import { messagesRouter } from "./routes/messages";
import { usersRouter } from "./routes/users";
import { whatsappWebhook } from "./routes/webhooks/whatsapp";
import type { ServerWebSocket } from "bun";
import { handleWsOpen, handleWsMessage, handleWsClose, type WsData } from "./ws";
import { success } from "./utils/response";

const { upgradeWebSocket, websocket } = createBunWebSocket<WsData>();

const app = new OpenAPIHono();

// Global middleware
if (process.env.DEBUG_HTTP) app.use("*", logger());
app.use("*", cors({ origin: ["http://localhost:3000"], credentials: true }));
app.onError(errorHandler);

// Health check
app.get("/health", (c) => success(c, { status: "ok" }, 200));

// Public routes (no auth)
app.route("/v1/auth", auth);
app.route("/webhooks/whatsapp", whatsappWebhook);

// WebSocket
app.get(
  "/ws",
  upgradeWebSocket(() => ({
    onOpen(_event, ws) {
      handleWsOpen(ws.raw as ServerWebSocket<WsData>);
    },
    onMessage(event, ws) {
      handleWsMessage(ws.raw as ServerWebSocket<WsData>, event.data as string);
    },
    onClose(_event, ws) {
      handleWsClose(ws.raw as ServerWebSocket<WsData>);
    },
  })),
);

// Protected routes
app.use("/v1/contacts/*", authMiddleware);
app.use("/v1/conversations/*", authMiddleware);
app.use("/v1/users/*", authMiddleware);
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
