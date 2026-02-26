import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface Seeder {
  name: string;
  shouldRun(db: PostgresJsDatabase<Record<string, unknown>>): Promise<boolean>;
  run(db: PostgresJsDatabase<Record<string, unknown>>): Promise<void>;
}
