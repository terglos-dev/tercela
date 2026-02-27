import { eq } from "drizzle-orm";
import { db } from "../db";
import { media } from "../db/schema";

export async function createMediaRecord(data: {
  s3Key: string;
  mimeType: string;
  filename?: string | null;
  size?: number | null;
  uploadedBy?: string | null;
}) {
  const [record] = await db
    .insert(media)
    .values({
      s3Key: data.s3Key,
      mimeType: data.mimeType,
      filename: data.filename || null,
      size: data.size || null,
      uploadedBy: data.uploadedBy || null,
    })
    .returning();

  return record;
}

export async function getMediaById(id: string) {
  const [record] = await db
    .select()
    .from(media)
    .where(eq(media.id, id))
    .limit(1);

  return record || null;
}
