/**
 * BullMQ queue layer.
 *
 * Shared between the web app (producer) and the worker (consumer).
 * Both import `scanQueue` (producer side) or `scanQueueName` + a
 * direct ioredis client (consumer side, see worker/index.ts).
 *
 * Why ioredis (not @upstash/redis): BullMQ needs a long-lived
 * stream/blocking-pop connection, which the @upstash/redis REST
 * client cannot provide. Upstash Redis still works — we connect via
 * the `rediss://` URL Upstash exposes for non-REST clients.
 */
import { Queue, type RedisOptions } from "bullmq";
import IORedis, { type Redis } from "ioredis";

export const scanQueueName = "accessops-scans";
export const reportPdfQueueName = "accessops-reports-pdf";

export interface ScanJobPayload {
  scanJobId: string; // UUID in scan_jobs table
  workspaceId: string;
  requestedBy: string;
}

export interface ReportPdfJobPayload {
  reportId: string;
  workspaceId: string;
  requestedBy: string;
}

let _connection: Redis | null = null;
let _queue: Queue<ScanJobPayload> | null = null;
let _reportQueue: Queue<ReportPdfJobPayload> | null = null;

export function getRedisConnectionOptions(): RedisOptions {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required");
  return {
    // BullMQ requires this for blocking commands.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // Allow rediss:// (TLS) URLs from Upstash; ioredis parses both.
    lazyConnect: false,
  };
}

export function getRedis(): Redis {
  if (_connection) return _connection;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required");
  _connection = new IORedis(url, getRedisConnectionOptions());
  return _connection;
}

export function getScanQueue(): Queue<ScanJobPayload> {
  if (_queue) return _queue;
  _queue = new Queue<ScanJobPayload>(scanQueueName, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
      removeOnFail: { age: 60 * 60 * 24 * 7 },
    },
  });
  return _queue;
}

/**
 * Producer-side helper. Web API calls this after persisting the
 * scan_job row.
 */
export async function enqueueScan(payload: ScanJobPayload): Promise<void> {
  const queue = getScanQueue();
  await queue.add("scan", payload, { jobId: payload.scanJobId });
}

export function getReportPdfQueue(): Queue<ReportPdfJobPayload> {
  if (_reportQueue) return _reportQueue;
  _reportQueue = new Queue<ReportPdfJobPayload>(reportPdfQueueName, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
      removeOnFail: { age: 60 * 60 * 24 * 7 },
    },
  });
  return _reportQueue;
}

export async function enqueueReportPdf(
  payload: ReportPdfJobPayload
): Promise<void> {
  const queue = getReportPdfQueue();
  // Same jobId as reportId — re-enqueueing the same report (e.g. retry)
  // is a no-op while one is already in flight.
  await queue.add("report-pdf", payload, { jobId: payload.reportId });
}

/**
 * Soft-close. Useful during graceful shutdown.
 */
export async function closeQueue() {
  if (_queue) await _queue.close().catch(() => undefined);
  if (_reportQueue) await _reportQueue.close().catch(() => undefined);
  if (_connection) await _connection.quit().catch(() => undefined);
  _queue = null;
  _reportQueue = null;
  _connection = null;
}
