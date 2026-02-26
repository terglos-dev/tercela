import { count } from "drizzle-orm";
import type { Seeder } from "./types";
import { users } from "../schema";

export const userSeeder: Seeder = {
  name: "users",

  async shouldRun(db) {
    const [result] = await db.select({ total: count() }).from(users);
    return result.total === 0;
  },

  async run(db) {
    const adminHash = await Bun.password.hash("admin123");

    await db.insert(users).values({
      name: "Admin",
      email: "admin@tercela.com",
      passwordHash: adminHash,
      role: "admin",
    });

    console.log("  → admin@tercela.com / admin123");
  },
};
