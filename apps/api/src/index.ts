import { env } from "./env";
import { autoMigrate } from "./db/migrate";
import { autoSeed } from "./db/seeders";
import { db } from "./db";
import { app, websocket } from "./app";

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
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
