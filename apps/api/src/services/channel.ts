import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { channels, conversations, messages } from "../db/schema";
import { env } from "../env";
import { logger } from "../utils/logger";
import { NotFoundError, ExternalAPIError } from "../utils/errors";
import type { WhatsAppChannelConfig } from "@tercela/shared";

export interface ChannelHealthResult {
  status: "connected" | "disconnected";
  tokenExpiresAt: string | null;
  reason?: string;
}

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

export async function exchangeForLongLivedToken(shortToken: string): Promise<TokenExchangeResult> {
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
    throw new ExternalAPIError("Meta", msg);
  }

  const expiresIn = data.expires_in || 5184000;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  return { accessToken: data.access_token, expiresAt };
}

export async function refreshChannelTokens(): Promise<void> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const whatsappChannels = await db
    .select()
    .from(channels)
    .where(and(eq(channels.type, "whatsapp"), eq(channels.isActive, true)));

  for (const channel of whatsappChannels) {
    const config = channel.config as unknown as WhatsAppChannelConfig;
    const expiresAt = config.tokenExpiresAt;

    if (expiresAt && expiresAt > sevenDaysFromNow) continue;

    const label = `${channel.name} (${channel.id})`;

    try {
      const result = await exchangeForLongLivedToken(config.accessToken);

      await db
        .update(channels)
        .set({
          config: { ...config, accessToken: result.accessToken, tokenExpiresAt: result.expiresAt },
          updatedAt: new Date(),
        })
        .where(eq(channels.id, channel.id));

      logger.info("token-refresh", `Renewed token for channel ${label}`, { expiresAt: result.expiresAt });
    } catch (err) {
      logger.warn("token-refresh", `Failed to renew token for channel ${label}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export async function deleteChannelCascade(id: string) {
  return db.transaction(async (tx) => {
    const convos = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.channelId, id));

    if (convos.length > 0) {
      const convoIds = convos.map((c) => c.id);
      await tx.delete(messages).where(inArray(messages.conversationId, convoIds));
    }

    await tx.delete(conversations).where(eq(conversations.channelId, id));

    const [channel] = await tx
      .delete(channels)
      .where(eq(channels.id, id))
      .returning();

    return channel ?? null;
  });
}

interface WabaInfo {
  id: string;
  name: string;
  phone_numbers: { id: string; display_phone_number: string; verified_name: string; quality_rating?: string }[];
}

export async function fetchMetaAccounts(accessToken: string): Promise<WabaInfo[]> {
  const bizRes = await fetch(
    `https://graph.facebook.com/v21.0/me/businesses?access_token=${accessToken}`,
  );
  const bizData = (await bizRes.json()) as { data?: { id: string; name: string }[]; error?: { message: string } };

  if (!bizRes.ok || !bizData.data) {
    throw new ExternalAPIError("Meta", bizData.error?.message || "Failed to fetch businesses");
  }

  const wabas: WabaInfo[] = [];

  for (const biz of bizData.data) {
    const wabaRes = await fetch(
      `https://graph.facebook.com/v21.0/${biz.id}/owned_whatsapp_business_accounts?access_token=${accessToken}`,
    );
    const wabaData = (await wabaRes.json()) as { data?: { id: string; name: string }[] };
    if (!wabaData.data) continue;

    for (const waba of wabaData.data) {
      const phoneRes = await fetch(
        `https://graph.facebook.com/v21.0/${waba.id}/phone_numbers?access_token=${accessToken}`,
      );
      const phoneData = (await phoneRes.json()) as {
        data?: { id: string; display_phone_number: string; verified_name: string; quality_rating?: string }[];
      };

      wabas.push({
        id: waba.id,
        name: waba.name,
        phone_numbers: phoneData.data || [],
      });
    }
  }

  return wabas;
}

export async function connectWhatsAppChannel(
  shortToken: string,
  phoneNumberId: string,
  wabaId: string,
  name?: string,
) {
  // 1. Exchange for long-lived token
  let longLivedToken: string;
  let tokenExpiresAt: string;
  try {
    const exchanged = await exchangeForLongLivedToken(shortToken);
    longLivedToken = exchanged.accessToken;
    tokenExpiresAt = exchanged.expiresAt;
  } catch {
    longLivedToken = shortToken;
    tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  }

  // 2. Fetch phone number details
  const phoneRes = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}?access_token=${longLivedToken}`,
  );
  const phoneData = (await phoneRes.json()) as Record<string, unknown>;
  if (!phoneRes.ok) {
    throw new ExternalAPIError("Meta", (phoneData.error as Record<string, string>)?.message || "Failed to fetch phone number details");
  }

  const verifiedName = (phoneData.verified_name as string) || "";
  const displayPhone = (phoneData.display_phone_number as string) || "";

  // 3. Subscribe app to WABA webhooks
  const subRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${longLivedToken}` },
  });
  if (!subRes.ok) {
    const subData = (await subRes.json()) as Record<string, unknown>;
    throw new ExternalAPIError("Meta", (subData.error as Record<string, string>)?.message || "Failed to subscribe to WABA webhooks");
  }

  // 4. Create channel
  const verifyToken = crypto.randomUUID();
  const channelName = name || verifiedName || `WhatsApp ${displayPhone}`;

  const [channel] = await db
    .insert(channels)
    .values({
      type: "whatsapp",
      name: channelName,
      config: {
        phoneNumberId,
        accessToken: longLivedToken,
        wabaId,
        verifyToken,
        businessAccountId: wabaId,
        appSecret: "",
        verifiedName,
        displayPhoneNumber: displayPhone,
        tokenExpiresAt,
      },
      isActive: true,
    })
    .returning();

  return channel;
}

export async function resyncWhatsAppChannel(channelId: string, shortToken: string) {
  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
  if (!channel) throw new NotFoundError("Channel");
  if (channel.type !== "whatsapp") throw new ExternalAPIError("Meta", "Resync only supported for WhatsApp channels");

  const config = channel.config as Record<string, unknown>;

  let longLivedToken: string;
  let tokenExpiresAt: string;
  try {
    const exchanged = await exchangeForLongLivedToken(shortToken);
    longLivedToken = exchanged.accessToken;
    tokenExpiresAt = exchanged.expiresAt;
  } catch {
    longLivedToken = shortToken;
    tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  }

  const wabaId = (config.wabaId || config.businessAccountId) as string;
  if (wabaId) {
    const subRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${longLivedToken}` },
    });
    if (!subRes.ok) {
      const subData = (await subRes.json()) as Record<string, unknown>;
      throw new ExternalAPIError("Meta", (subData.error as Record<string, string>)?.message || "Failed to re-subscribe to WABA webhooks");
    }
  }

  const [updated] = await db
    .update(channels)
    .set({
      config: { ...config, accessToken: longLivedToken, tokenExpiresAt },
      updatedAt: new Date(),
    })
    .where(eq(channels.id, channelId))
    .returning();

  return updated;
}
