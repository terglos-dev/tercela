import { count } from "drizzle-orm";
import type { Seeder } from "./types";
import { channels } from "../schema";

export const channelSeeder: Seeder = {
  name: "channels",

  async shouldRun(db) {
    const [result] = await db.select({ total: count() }).from(channels);
    return result.total === 0;
  },

  async run(db) {
    await db.insert(channels).values({
      type: "whatsapp",
      name: "Main WhatsApp",
      config: {
        phoneNumberId: "",
        accessToken: "",
        verifyToken: "tercela-verify-token",
        appSecret: "",
        businessAccountId: "",
      },
      isActive: false,
    });

    console.log("  → Default WhatsApp channel created (configure via UI)");
  },
};
