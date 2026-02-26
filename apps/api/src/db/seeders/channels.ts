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
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "tercela-verify-token",
      },
      isActive: true,
    });

    console.log("  → Main WhatsApp channel created");
  },
};
