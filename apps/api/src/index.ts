import { env } from "./env";
import { autoMigrate } from "./db/migrate";
import { autoSeed } from "./db/seeders";
import { db } from "./db";
import { app, websocket } from "./app";
import { refreshChannelTokens } from "./services/channel";

declare global {
  var __bunServer: ReturnType<typeof Bun.serve> | undefined;
}

async function start() {
  await autoMigrate(env.DATABASE_URL);
  await autoSeed(db);

  const server = Bun.serve({
    port: env.API_PORT,
    fetch: app.fetch,
    websocket,
  });

  globalThis.__bunServer = server;

  console.log(`🚀 Tercela API running on http://localhost:${server.port}`);

  // Refresh expiring WhatsApp tokens on boot, then daily
  refreshChannelTokens().catch((err) =>
    console.warn("[token-refresh] Boot check failed:", err),
  );
  setInterval(() => {
    refreshChannelTokens().catch((err) =>
      console.warn("[token-refresh] Scheduled check failed:", err),
    );
  }, 24 * 60 * 60 * 1000);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
