/**
 * Cloudflare R2 / generic S3-compatible storage.
 *
 * R2 speaks the S3 API, so we use the AWS SDK with a custom endpoint.
 * Same module works for Backblaze B2, Wasabi, MinIO, real AWS S3, etc.
 *
 * Env vars (set on the worker; web only reads, never writes):
 *   - S3_ENDPOINT          e.g. https://<accountid>.r2.cloudflarestorage.com
 *   - S3_BUCKET            the bucket name
 *   - S3_ACCESS_KEY_ID
 *   - S3_SECRET_ACCESS_KEY
 *   - S3_REGION            optional, defaults to "auto" (works for R2)
 *   - S3_PUBLIC_URL        optional public base URL (e.g. CDN). When
 *                          present, getReportUrl returns this directly
 *                          instead of presigning.
 *
 * Returning a presigned URL keeps the bucket private by default — useful
 * because reports may contain sensitive customer content.
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

export function storageConfigured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY
  );
}

function client(): S3Client {
  if (_client) return _client;
  if (!storageConfigured()) {
    throw new Error("Object storage (S3_*) is not configured.");
  }
  _client = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    // Required for R2 and most non-AWS S3 endpoints.
    forcePathStyle: true,
  });
  return _client;
}

export async function putBuffer(args: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  contentDisposition?: string;
}): Promise<{ key: string }> {
  const c = client();
  await c.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
      ContentDisposition: args.contentDisposition,
    })
  );
  return { key: args.key };
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300
): Promise<string> {
  // Public bucket served via CDN — just return the public URL.
  if (process.env.S3_PUBLIC_URL) {
    const base = process.env.S3_PUBLIC_URL.replace(/\/$/, "");
    return `${base}/${key}`;
  }
  const c = client();
  return getSignedUrl(
    c,
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}
