import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  API_PORT: z.coerce.number().default(3333),
  WHATSAPP_VERIFY_TOKEN: z.string().default("tercela-verify-token"),
  WHATSAPP_ACCESS_TOKEN: z.string().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
  WHATSAPP_APP_SECRET: z.string().default(""),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(""),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
