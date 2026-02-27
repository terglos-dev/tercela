import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { settings } from "../db/schema";

export interface StorageConfig {
  provider: string;
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  pathPrefix?: string;
}

let cachedClient: S3Client | null = null;
let cachedConfig: StorageConfig | null = null;
let cachedConfigHash = "";

export async function getStorageConfig(): Promise<StorageConfig | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "storage")).limit(1);
  if (!row) return null;

  const value = row.value as Record<string, unknown>;
  if (!value.bucket || !value.accessKeyId || !value.secretAccessKey) return null;

  return {
    provider: (value.provider as string) || "aws",
    endpoint: value.endpoint as string | undefined,
    region: (value.region as string) || "us-east-1",
    bucket: value.bucket as string,
    accessKeyId: value.accessKeyId as string,
    secretAccessKey: value.secretAccessKey as string,
    pathPrefix: value.pathPrefix as string | undefined,
  };
}

function getClient(config: StorageConfig): S3Client {
  const hash = JSON.stringify(config);
  if (cachedClient && hash === cachedConfigHash) return cachedClient;

  if (cachedClient) cachedClient.destroy();

  const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
    clientConfig.forcePathStyle = true;
  }

  cachedClient = new S3Client(clientConfig);
  cachedConfig = config;
  cachedConfigHash = hash;
  return cachedClient;
}

export async function uploadMedia(buffer: Buffer | Uint8Array, key: string, mimeType: string): Promise<string> {
  const config = await getStorageConfig();
  if (!config) throw new Error("Storage not configured");

  const fullKey = config.pathPrefix ? `${config.pathPrefix}${key}` : key;
  const client = getClient(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: fullKey,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return fullKey;
}

export async function getMediaStream(key: string): Promise<{
  stream: ReadableStream;
  contentType: string;
  contentLength: number;
}> {
  const config = await getStorageConfig();
  if (!config) throw new Error("Storage not configured");

  const client = getClient(config);

  const res = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );

  return {
    stream: res.Body!.transformToWebStream(),
    contentType: res.ContentType || "application/octet-stream",
    contentLength: res.ContentLength || 0,
  };
}

export async function getPresignedUrl(key: string, expiresIn = 86400): Promise<string> {
  const config = await getStorageConfig();
  if (!config) throw new Error("Storage not configured");

  const client = getClient(config);

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
    { expiresIn },
  );
}

export async function testS3Connection(config: StorageConfig): Promise<void> {
  const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
    region: config.region || "us-east-1",
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
    clientConfig.forcePathStyle = true;
  }

  const client = new S3Client(clientConfig);
  const testKey = `${config.pathPrefix || ""}tercela-test-${crypto.randomUUID()}`;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: testKey,
        Body: "tercela-connection-test",
        ContentType: "text/plain",
      }),
    );

    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: testKey,
      }),
    );
  } finally {
    client.destroy();
  }
}
