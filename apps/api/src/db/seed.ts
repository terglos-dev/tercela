import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { seeders } from "./seeders";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function seed() {
  console.log(`\nRunning ${seeders.length} seeder(s)...\n`);

  for (const seeder of seeders) {
    const needed = await seeder.shouldRun(db);
    console.log(`[${seeder.name}] ${needed ? "seeding..." : "skipped"}`);
    if (needed) await seeder.run(db);
  }

  console.log("\nDone!\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
