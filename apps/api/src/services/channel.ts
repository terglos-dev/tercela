import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { channels } from "../db/schema";
import { env } from "../env";
import type { WhatsAppChannelConfig } from "@tercela/shared";

export interface ChannelHealthResult {
  status: "connected" | "disconnected";
  tokenExpiresAt: string | null;
  reason?: string;
}

/**
 * Verify a WhatsApp channel token by calling the Meta Graph API.
 */
export async function verifyChannelToken(config: WhatsAppChannelConfig): Promise<ChannelHealthResult> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${config.phoneNumberId}?access_token=${config.accessToken}`,
    );
    const data = (await res.json()) as { error?: { message: string; code: number } };

    if (res.ok) {
      return {
        status: "connected",
        tokenExpiresAt: config.tokenExpiresAt || null,
      };
    }

    const code = data.error?.code;
    const reason = code === 190
      ? "Token expired or invalid"
      : data.error?.message || "Unknown error";

    return { status: "disconnected", tokenExpiresAt: config.tokenExpiresAt || null, reason };
  } catch (err) {
    return {
      status: "disconnected",
      tokenExpiresAt: config.tokenExpiresAt || null,
      reason: err instanceof Error ? err.message : "Network error",
    };
  }
}

interface TokenExchangeResult {
  accessToken: string;
  expiresAt: string;
}

/**
 * Exchange a short-lived Facebook user token for a long-lived token (~60 days).
 */
export async function exchangeForLongLivedToken(
  shortToken: string,
): Promise<TokenExchangeResult> {
  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", env.META_APP_ID);
  url.searchParams.set("client_secret", env.META_APP_SECRET);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    error?: { message: string };
  };

  if (!res.ok || !data.access_token) {
    const msg = data.error?.message || "Failed to exchange token for long-lived token";
    throw new Error(msg);
  }

  const expiresIn = data.expires_in || 5184000; // default 60 days
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  return { accessToken: data.access_token, expiresAt };
}

/**
 * Check all active WhatsApp channels and refresh tokens that expire within 7 days.
 */
export async function refreshChannelTokens(): Promise<void> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const whatsappChannels = await db
    .select()
    .from(channels)
    .where(and(eq(channels.type, "whatsapp"), eq(channels.isActive, true)));

  for (const channel of whatsappChannels) {
    const config = channel.config as unknown as WhatsAppChannelConfig;
    const expiresAt = config.tokenExpiresAt;

    // Skip channels without expiry info or that expire later than 7 days
    if (expiresAt && expiresAt > sevenDaysFromNow) {
      continue;
    }

    const label = `${channel.name} (${channel.id})`;

    try {
      const result = await exchangeForLongLivedToken(config.accessToken);

      await db
        .update(channels)
        .set({
          config: {
            ...config,
            accessToken: result.accessToken,
            tokenExpiresAt: result.expiresAt,
          },
          updatedAt: new Date(),
        })
        .where(eq(channels.id, channel.id));

      console.log(`[token-refresh] Renewed token for channel ${label}, expires ${result.expiresAt}`);
    } catch (err) {
      console.warn(
        `[token-refresh] Failed to renew token for channel ${label}: ${err instanceof Error ? err.message : err}. User may need to reconnect.`,
      );
    }
  }
}
