import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  API_PORT: z.coerce.number().default(3333),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  WHATSAPP_VERIFY_TOKEN: z.string().default("tercela-verify-token"),
  WHATSAPP_ACCESS_TOKEN: z.string().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
  WHATSAPP_APP_SECRET: z.string().default(""),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(""),
  META_APP_ID: z.string().default(""),
  META_APP_SECRET: z.string().default(""),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;

// Startup warnings for missing optional config
const warnings: string[] = [];
if (!env.META_APP_ID || !env.META_APP_SECRET) {
  warnings.push("META_APP_ID/META_APP_SECRET not set — WhatsApp channel connect will not work");
}
if (env.CORS_ORIGINS === "http://localhost:3000") {
  warnings.push("CORS_ORIGINS is set to localhost only — update for production");
}
if (warnings.length > 0) {
  for (const w of warnings) console.warn(`[env] ${w}`);
}
