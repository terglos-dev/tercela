import { z } from "@hono/zod-openapi";

export function wrapSuccess<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    success: z.literal(true),
    data: schema,
  });
}

export function wrapPaginated<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: z.object({
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
    }),
  });
}

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});
