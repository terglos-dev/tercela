import { z } from "@hono/zod-openapi";
import type { WhatsAppChannelConfig } from "@tercela/shared";
import { ValidationError } from "./errors";

const whatsAppConfigSchema = z.object({
  phoneNumberId: z.string().min(1),
  accessToken: z.string().min(1),
  verifyToken: z.string().optional().default(""),
  appSecret: z.string().optional(),
  businessAccountId: z.string().optional(),
  displayPhoneNumber: z.string().optional(),
  verifiedName: z.string().optional(),
  wabaId: z.string().optional(),
  tokenExpiresAt: z.string().optional(),
});

export function parseWhatsAppConfig(config: unknown): WhatsAppChannelConfig {
  const result = whatsAppConfigSchema.safeParse(config);
  if (!result.success) {
    throw new ValidationError(`Invalid WhatsApp config: ${result.error.issues.map((i) => i.message).join(", ")}`);
  }
  return result.data as WhatsAppChannelConfig;
}
