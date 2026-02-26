import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Seeder } from "./types";
import { userSeeder } from "./users";
import { channelSeeder } from "./channels";

// Seeders são executados nesta ordem
export const seeders: Seeder[] = [
  userSeeder,
  channelSeeder,
];

export async function autoSeed(db: PostgresJsDatabase) {
  for (const seeder of seeders) {
    if (await seeder.shouldRun(db)) {
      console.log(`[Seed] ${seeder.name}`);
      await seeder.run(db);
    }
  }
}
