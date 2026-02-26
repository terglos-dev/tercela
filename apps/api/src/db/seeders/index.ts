import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Seeder } from "./types";
import { userSeeder } from "./users";
import { channelSeeder, syncWhatsAppChannel } from "./channels";

// Seeders run in this order
export const seeders: Seeder[] = [
  userSeeder,
  channelSeeder,
];

export async function autoSeed(db: PostgresJsDatabase<Record<string, unknown>>) {
  for (const seeder of seeders) {
    if (await seeder.shouldRun(db)) {
      console.log(`[Seed] ${seeder.name}`);
      await seeder.run(db);
    }
  }

  await syncWhatsAppChannel(db);
}
