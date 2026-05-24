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
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { Readable } from "node:stream";
import { isProduction, visualEvidenceStorageEnabled } from "@/lib/config";

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

const LOCAL_EVIDENCE_ROOT = join(process.cwd(), ".accessops", "visual-evidence");

function localEvidencePath(key: string): string {
  const cleaned = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(LOCAL_EVIDENCE_ROOT, cleaned);
}

export function visualEvidenceObjectStorageAvailable(): boolean {
  return visualEvidenceStorageEnabled() && storageConfigured();
}

export function visualEvidenceStorageAvailable(): boolean {
  if (!visualEvidenceStorageEnabled()) return false;
  if (storageConfigured()) return true;
  return !isProduction();
}

export async function putVisualEvidenceObject(args: {
  key: string;
  body: Buffer | Uint8Array;
  contentType?: string;
}): Promise<{ key: string; storage: "s3" | "local" }> {
  if (!visualEvidenceStorageEnabled()) {
    throw new Error("visual_evidence_storage_disabled");
  }
  if (storageConfigured()) {
    await putBuffer({
      key: args.key,
      body: args.body,
      contentType: args.contentType ?? "image/png",
      contentDisposition: "inline",
    });
    return { key: args.key, storage: "s3" };
  }
  if (isProduction()) {
    throw new Error("visual_evidence_storage_not_configured");
  }
  const filePath = localEvidencePath(args.key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, args.body);
  return { key: args.key, storage: "local" };
}

export async function getVisualEvidenceObject(
  key: string
): Promise<{ body: Buffer; contentType: string }> {
  if (storageConfigured()) {
    const c = client();
    const res = await c.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key })
    );
    const body = await streamToBuffer(res.Body);
    return {
      body,
      contentType: res.ContentType ?? "image/png",
    };
  }
  if (isProduction()) {
    throw new Error("visual_evidence_storage_not_configured");
  }
  return {
    body: await readFile(localEvidencePath(key)),
    contentType: "image/png",
  };
}

export async function deleteVisualEvidenceObject(key: string): Promise<void> {
  if (!key) return;
  if (storageConfigured()) {
    const c = client();
    await c
      .send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }))
      .catch(() => undefined);
    return;
  }
  if (!isProduction()) {
    await unlink(localEvidencePath(key)).catch(() => undefined);
  }
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    return Buffer.from(
      await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray()
    );
  }
  throw new Error("unsupported_storage_body");
}
