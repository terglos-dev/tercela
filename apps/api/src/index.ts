import { env } from "./env";
import { autoMigrate } from "./db/migrate";
import { autoSeed } from "./db/seeders";
import { db } from "./db";
import { app, websocket } from "./app";
import { refreshChannelTokens } from "./services/channel";
import { logger } from "./utils/logger";

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

  logger.info("server", `Tercela API running on http://localhost:${server.port}`);

  // Refresh expiring WhatsApp tokens on boot, then daily
  const TOKEN_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;
  let consecutiveFailures = 0;

  async function runTokenRefresh(context: string) {
    try {
      await refreshChannelTokens();
      consecutiveFailures = 0;
    } catch (err) {
      consecutiveFailures++;
      logger.warn("token-refresh", `${context} failed (attempt ${consecutiveFailures})`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  runTokenRefresh("Boot check");
  setInterval(() => runTokenRefresh("Scheduled check"), TOKEN_REFRESH_INTERVAL);
}

start().catch((err) => {
  logger.error("server", "Failed to start", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
