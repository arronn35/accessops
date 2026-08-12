/**
 * Structured single-line JSON logging for the worker.
 *
 * Every line carries the scan document id as the correlation id (`scanId`),
 * so a single scan's full trail — claim, browser-start, page-start, page-end,
 * save, complete, fail, reclaim — can be grepped out of the platform log
 * stream (e.g. Cloud Run / Cloud Logging) with one filter.
 */

export type WorkerLogLevel = "info" | "warn" | "error";

export interface WorkerLogFields {
  scanId?: string;
  workspaceId?: string;
  [key: string]: unknown;
}

export function logScanEvent(
  level: WorkerLogLevel,
  event: string,
  fields: WorkerLogFields = {}
): void {
  const { scanId, workspaceId, ...details } = fields;
  // JSON.stringify drops undefined values, keeping lines compact.
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scanId,
    workspaceId,
    event,
    ...details,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
