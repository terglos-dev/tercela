import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { settings } from "../db/schema";
import { testS3Connection } from "../services/storage";
import type { StorageConfig } from "../services/storage";
import { success, error } from "../utils/response";
import { wrapSuccess, ErrorResponseSchema } from "../utils/openapi-schemas";

const settingsRouter = new OpenAPIHono();

const SettingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.record(z.string(), z.unknown()),
  updatedAt: z.string(),
});

const ALLOWED_SETTINGS_KEYS = ["storage"] as const;

const KeyParam = z.object({
  key: z.enum(ALLOWED_SETTINGS_KEYS).openapi({ param: { name: "key", in: "path" }, example: "storage" }),
});

function maskSettingValue(key: string, value: Record<string, unknown>): Record<string, unknown> {
  if (key === "storage") {
    const masked = { ...value };
    const val = masked.secretAccessKey;
    if (typeof val === "string" && val.length > 4) {
      masked.secretAccessKey = "••••" + val.slice(-4);
    } else if (typeof val === "string" && val.length > 0) {
      masked.secretAccessKey = "••••";
    }
    return masked;
  }
  return value;
}

function serializeSetting(row: typeof settings.$inferSelect) {
  return {
    ...row,
    value: maskSettingValue(row.key, row.value as Record<string, unknown>),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /
settingsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Settings"],
    summary: "List all settings",
    responses: {
      200: {
        description: "List of settings",
        content: { "application/json": { schema: wrapSuccess(z.array(SettingSchema)) } },
      },
    },
  }),
  async (c) => {
    const result = await db.select().from(settings);
    return success(c, result.map(serializeSetting), 200);
  },
);

// PUT /:key
const upsertSchema = z.object({
  value: z.record(z.string(), z.unknown()),
});

settingsRouter.openapi(
  createRoute({
    method: "put",
    path: "/{key}",
    tags: ["Settings"],
    summary: "Upsert a setting by key",
    request: {
      params: KeyParam,
      body: { content: { "application/json": { schema: upsertSchema } } },
    },
    responses: {
      200: {
        description: "Setting saved",
        content: { "application/json": { schema: wrapSuccess(SettingSchema) } },
      },
    },
  }),
  async (c) => {
    const { key } = c.req.valid("param");
    const { value } = c.req.valid("json");

    const [existing] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

    let row: typeof settings.$inferSelect;

    if (existing) {
      const merged = { ...value };
      if (key === "storage" && typeof merged.secretAccessKey === "string" && merged.secretAccessKey.startsWith("••••")) {
        const oldValue = existing.value as Record<string, unknown>;
        merged.secretAccessKey = oldValue.secretAccessKey;
      }

      [row] = await db
        .update(settings)
        .set({ value: merged, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
    } else {
      [row] = await db
        .insert(settings)
        .values({ key, value })
        .returning();
    }

    return success(c, serializeSetting(row), 200);
  },
);

// POST /storage/test
const storageTestSchema = z.object({
  provider: z.string().min(1),
  endpoint: z.string().optional(),
  region: z.string().min(1, "Region is required"),
  bucket: z.string().min(1, "Bucket is required"),
  accessKeyId: z.string().min(1, "Access Key ID is required"),
  secretAccessKey: z.string().min(1, "Secret Access Key is required"),
  pathPrefix: z.string().optional(),
});

settingsRouter.openapi(
  createRoute({
    method: "post",
    path: "/storage/test",
    tags: ["Settings"],
    summary: "Test S3 storage connection",
    request: {
      body: { content: { "application/json": { schema: storageTestSchema } } },
    },
    responses: {
      200: {
        description: "Connection test result",
        content: { "application/json": { schema: wrapSuccess(z.object({ success: z.boolean() })) } },
      },
      400: {
        description: "Connection test failed",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const config = c.req.valid("json");

    // If secretAccessKey is masked, load from DB
    let secretKey = config.secretAccessKey;
    if (secretKey.startsWith("••••")) {
      const [existing] = await db.select().from(settings).where(eq(settings.key, "storage")).limit(1);
      if (existing) {
        const stored = existing.value as Record<string, unknown>;
        secretKey = (stored.secretAccessKey as string) || "";
      }
    }

    try {
      await testS3Connection({ ...config, secretAccessKey: secretKey } as StorageConfig);
      return success(c, { success: true }, 200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return error(c, message, 400);
    }
  },
);

export { settingsRouter };
