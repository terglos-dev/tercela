import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface Seeder {
  name: string;
  shouldRun(db: PostgresJsDatabase): Promise<boolean>;
  run(db: PostgresJsDatabase): Promise<void>;
}
