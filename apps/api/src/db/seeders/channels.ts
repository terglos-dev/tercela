import { count, eq } from "drizzle-orm";
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
        appSecret: process.env.WHATSAPP_APP_SECRET || "",
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
      },
      isActive: true,
    });

    console.log("  → Main WhatsApp channel created");
  },
};

/**
 * Syncs the WhatsApp channel config from env vars on every startup.
 * This ensures DB stays in sync when credentials change.
 */
export async function syncWhatsAppChannel(db: Parameters<Seeder["run"]>[0]) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  if (!phoneNumberId || !accessToken) return;

  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.type, "whatsapp"))
    .limit(1);

  if (!channel) return;

  const config = channel.config as Record<string, unknown>;
  if (config.phoneNumberId === phoneNumberId && config.accessToken === accessToken) return;

  await db
    .update(channels)
    .set({
      config: {
        phoneNumberId,
        accessToken,
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "tercela-verify-token",
        appSecret: process.env.WHATSAPP_APP_SECRET || "",
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
      },
      updatedAt: new Date(),
    })
    .where(eq(channels.id, channel.id));

  console.log("[Sync] WhatsApp channel config updated from env");
}
