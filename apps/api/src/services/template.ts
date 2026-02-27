import { eq, and, ilike } from "drizzle-orm";
import { db } from "../db";
import { channels, templates } from "../db/schema";
import { NotFoundError, ExternalAPIError, ValidationError } from "../utils/errors";
import type { WhatsAppChannelConfig, TemplateComponent } from "@tercela/shared";

async function loadWhatsAppChannel(channelId: string) {
  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
  if (!channel) throw new NotFoundError("Channel");
  if (channel.type !== "whatsapp") throw new ExternalAPIError("Meta", "Templates only supported for WhatsApp channels");

  const config = channel.config as unknown as WhatsAppChannelConfig;
  const wabaId = config.wabaId || config.businessAccountId;
  if (!wabaId) throw new ExternalAPIError("Meta", "Channel has no WABA ID configured");

  return { channel, config, wabaId };
}

interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: TemplateComponent[];
}

interface MetaTemplatesResponse {
  data?: MetaTemplate[];
  paging?: { cursors?: { after?: string }; next?: string };
  error?: { message: string };
}

export async function syncTemplates(channelId: string) {
  const { config, wabaId } = await loadWhatsAppChannel(channelId);

  const allMetaTemplates: MetaTemplate[] = [];
  let url: string | null =
    `https://graph.facebook.com/v21.0/${wabaId}/message_templates?fields=id,name,status,category,language,components&limit=100&access_token=${config.accessToken}`;

  while (url) {
    const res = await fetch(url);
    const data = (await res.json()) as MetaTemplatesResponse;

    if (!res.ok || !data.data) {
      throw new ExternalAPIError("Meta", data.error?.message || "Failed to fetch templates");
    }

    allMetaTemplates.push(...data.data);
    url = data.paging?.next || null;
  }

  const now = new Date();

  // Upsert each template
  for (const mt of allMetaTemplates) {
    const existing = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.channelId, channelId),
          eq(templates.name, mt.name),
          eq(templates.language, mt.language),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(templates)
        .set({
          metaId: mt.id,
          category: mt.category,
          status: mt.status,
          components: mt.components || [],
          updatedAt: now,
          syncedAt: now,
        })
        .where(eq(templates.id, existing[0].id));
    } else {
      await db.insert(templates).values({
        channelId,
        metaId: mt.id,
        name: mt.name,
        language: mt.language,
        category: mt.category,
        status: mt.status,
        components: mt.components || [],
        syncedAt: now,
      });
    }
  }

  // Delete local records not present in Meta response
  if (allMetaTemplates.length > 0) {
    const metaKeys = allMetaTemplates.map((t) => `${t.name}::${t.language}`);
    const localTemplates = await db
      .select()
      .from(templates)
      .where(eq(templates.channelId, channelId));

    const toDelete = localTemplates.filter((t) => !metaKeys.includes(`${t.name}::${t.language}`));
    for (const t of toDelete) {
      await db.delete(templates).where(eq(templates.id, t.id));
    }
  } else {
    // No templates in Meta — delete all local
    await db.delete(templates).where(eq(templates.channelId, channelId));
  }

  return db.select().from(templates).where(eq(templates.channelId, channelId));
}

export async function listTemplates(
  channelId: string,
  opts?: { status?: string; search?: string },
) {
  const conditions = [eq(templates.channelId, channelId)];

  if (opts?.status) {
    conditions.push(eq(templates.status, opts.status));
  }

  if (opts?.search) {
    conditions.push(ilike(templates.name, `%${opts.search}%`));
  }

  return db
    .select()
    .from(templates)
    .where(and(...conditions))
    .orderBy(templates.name);
}

export async function listAllTemplates(
  opts?: { status?: string; search?: string; channelId?: string },
) {
  const conditions = [];

  if (opts?.channelId) {
    conditions.push(eq(templates.channelId, opts.channelId));
  }

  if (opts?.status) {
    conditions.push(eq(templates.status, opts.status));
  }

  if (opts?.search) {
    conditions.push(ilike(templates.name, `%${opts.search}%`));
  }

  return db
    .select({
      id: templates.id,
      channelId: templates.channelId,
      metaId: templates.metaId,
      name: templates.name,
      language: templates.language,
      category: templates.category,
      status: templates.status,
      components: templates.components,
      createdAt: templates.createdAt,
      updatedAt: templates.updatedAt,
      syncedAt: templates.syncedAt,
      channelName: channels.name,
    })
    .from(templates)
    .innerJoin(channels, eq(templates.channelId, channels.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(templates.name);
}

export async function createTemplate(
  channelId: string,
  data: {
    name: string;
    language: string;
    category: string;
    components: TemplateComponent[];
  },
) {
  const { config, wabaId } = await loadWhatsAppChannel(channelId);

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        name: data.name,
        language: data.language,
        category: data.category,
        components: data.components,
      }),
    },
  );

  const result = (await res.json()) as { id?: string; error?: { message: string } };

  if (!res.ok || !result.id) {
    throw new ExternalAPIError("Meta", result.error?.message || "Failed to create template");
  }

  const [template] = await db
    .insert(templates)
    .values({
      channelId,
      metaId: result.id,
      name: data.name,
      language: data.language,
      category: data.category,
      status: "PENDING",
      components: data.components,
    })
    .returning();

  return template;
}

export async function getTemplate(channelId: string, templateId: string) {
  const [template] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.channelId, channelId), eq(templates.id, templateId)))
    .limit(1);

  if (!template) throw new NotFoundError("Template");
  return template;
}

export async function getTemplateById(templateId: string) {
  const [result] = await db
    .select({
      id: templates.id,
      channelId: templates.channelId,
      metaId: templates.metaId,
      name: templates.name,
      language: templates.language,
      category: templates.category,
      status: templates.status,
      components: templates.components,
      createdAt: templates.createdAt,
      updatedAt: templates.updatedAt,
      syncedAt: templates.syncedAt,
      channelName: channels.name,
    })
    .from(templates)
    .innerJoin(channels, eq(templates.channelId, channels.id))
    .where(eq(templates.id, templateId))
    .limit(1);

  if (!result) throw new NotFoundError("Template");
  return result;
}

export async function updateTemplate(
  channelId: string,
  templateId: string,
  data: { components: TemplateComponent[] },
) {
  const [template] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.channelId, channelId), eq(templates.id, templateId)))
    .limit(1);

  if (!template) throw new NotFoundError("Template");

  if (template.status === "IN_APPEAL") {
    throw new ValidationError("Templates under appeal cannot be edited");
  }

  if (!template.metaId) {
    throw new ValidationError("Template has no Meta ID — cannot update on Meta");
  }

  const { config } = await loadWhatsAppChannel(channelId);

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${template.metaId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({ components: data.components }),
    },
  );

  const result = (await res.json()) as { success?: boolean; error?: { message: string } };

  if (!res.ok) {
    throw new ExternalAPIError("Meta", result.error?.message || "Failed to update template");
  }

  const now = new Date();
  await db
    .update(templates)
    .set({
      components: data.components,
      updatedAt: now,
    })
    .where(eq(templates.id, templateId));

  return getTemplate(channelId, templateId);
}

export async function deleteTemplate(channelId: string, templateName: string) {
  const { config, wabaId } = await loadWhatsAppChannel(channelId);

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.accessToken}` },
    },
  );

  const result = (await res.json()) as { success?: boolean; error?: { message: string } };

  if (!res.ok) {
    throw new ExternalAPIError("Meta", result.error?.message || "Failed to delete template");
  }

  await db
    .delete(templates)
    .where(and(eq(templates.channelId, channelId), eq(templates.name, templateName)));

  return { success: true };
}
