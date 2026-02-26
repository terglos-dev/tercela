import postgres from "postgres";

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

async function pushSchemaViaCli() {
  console.log("[DB] Pushing schema...");

  const proc = Bun.spawn(["bun", "run", "drizzle-kit", "push", "--force"], {
    cwd: import.meta.dir.replace("/src/db", "").replace("\\src\\db", ""),
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (stdout.trim()) console.log(stdout.trim());
  if (exitCode !== 0) {
    console.error("[DB] Push failed:", stderr);
    throw new Error(`drizzle-kit push failed with exit code ${exitCode}`);
  }

  console.log("[DB] Schema push complete");
}

async function ensureSchemas(databaseUrl: string) {
  const schemas = ["auth", "channels", "contacts", "inbox"];
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

export async function autoMigrate(databaseUrl: string) {
  await ensureDatabase(databaseUrl);
  await ensureSchemas(databaseUrl);
  await pushSchemaViaCli();
}
