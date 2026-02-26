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
import { handleWsOpen, handleWsMessage, handleWsClose, type WsData } from "./ws";

const { upgradeWebSocket, websocket } = createBunWebSocket<WsData>();

const app = new OpenAPIHono();

// Global middleware
app.use("*", logger());
app.use("*", cors({ origin: ["http://localhost:3000"], credentials: true }));
app.onError(errorHandler);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Public routes
app.route("/auth", auth);
app.route("/webhooks/whatsapp", whatsappWebhook);

// WebSocket
app.get(
  "/ws",
  upgradeWebSocket(() => ({
    onOpen(_event, ws) {
      handleWsOpen(ws.raw as any);
    },
    onMessage(event, ws) {
      handleWsMessage(ws.raw as any, event.data as string);
    },
    onClose(_event, ws) {
      handleWsClose(ws.raw as any);
    },
  })),
);

// Protected routes
app.use("/api/*", authMiddleware);
app.route("/api/contacts", contactsRouter);
app.route("/api/conversations", conversationsRouter);
app.route("/api/conversations", messagesRouter);
app.route("/api/users", usersRouter);

// OpenAPI spec
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "Tercela API",
    version: "0.1.0",
    description: "API da plataforma omnichannel Tercela",
  },
  servers: [{ url: "http://localhost:3333", description: "Local" }],
});

// Scalar API Reference UI
app.get(
  "/reference",
  apiReference({
    spec: { url: "/doc" },
    theme: "purple",
    pageTitle: "Tercela API Reference",
  }),
);

export { app, websocket };
