import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";

async function ensureDatabase(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);

  url.pathname = "/postgres";
  const adminClient = postgres(url.toString(), { max: 1 });

  try {
    const result = await adminClient`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (result.length === 0) {
      console.log(`[DB] Creating database "${dbName}"...`);
      await adminClient.unsafe(`CREATE DATABASE "${dbName}"`);
      console.log(`[DB] Database "${dbName}" created`);
    }
  } finally {
    await adminClient.end();
  }
}

async function ensureSchemas(databaseUrl: string) {
  const schemas = ["auth", "channels", "contacts", "inbox", "config", "storage"];
  const client = postgres(databaseUrl, { max: 1 });

  try {
    for (const schema of schemas) {
      await client`SELECT pg_catalog.pg_namespace.nspname FROM pg_catalog.pg_namespace WHERE nspname = ${schema}`.then(
        (rows) => {
          if (rows.length === 0) return client.unsafe(`CREATE SCHEMA "${schema}"`);
        }
      );
    }
    console.log(`[DB] Schemas ensured: ${schemas.join(", ")}`);
  } finally {
    await client.end();
  }
}

async function runMigrations(databaseUrl: string) {
  console.log("[DB] Running migrations...");

  const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  const db = drizzle(client);

  const migrationsFolder = path.join(
    import.meta.dir.replace("/src/db", "").replace("\\src\\db", ""),
    "drizzle",
  );

  await migrate(db, { migrationsFolder });
  await client.end();

  console.log("[DB] Migrations complete");
}

export async function autoMigrate(databaseUrl: string) {
  await ensureDatabase(databaseUrl);
  await ensureSchemas(databaseUrl);
  await runMigrations(databaseUrl);
}
