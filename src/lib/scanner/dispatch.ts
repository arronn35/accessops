/**
 * Scan dispatch — wakes the browser scan worker when a job becomes claimable.
 *
 * Two modes (selected by `SCAN_DISPATCH_MODE`):
 *
 *  - `poll` (default): no-op. A long-running worker polls Firestore for
 *    `queued` jobs (the legacy always-on container model). Nothing is enqueued
 *    here, so local dev and any always-on worker keep working unchanged.
 *
 *  - `cloud-tasks`: push model for a scale-to-zero Cloud Run worker. We enqueue
 *    a Cloud Tasks HTTP task targeting the worker's `POST /process` endpoint.
 *    Cloud Tasks gives durable delivery + retries + rate limiting; the worker
 *    container only spins up when there is real work, then scales back to zero.
 *
 * Auth: the enqueue call is authorized with an OAuth token minted from the same
 * Firebase Admin service account the app already uses (grant it the
 * "Cloud Tasks Enqueuer" role). We reuse `credential.getAccessToken()` from
 * firebase-admin rather than pulling in google-auth-library. The task itself
 * carries the shared `INTERNAL_WORKER_SECRET` header so the worker rejects
 * anything that is not from us — the same guard the internal scan route uses.
 */
import { firebaseAdminApp } from "@/lib/firebase/admin";

export type ScanDispatchMode = "poll" | "cloud-tasks";

export function scanDispatchMode(): ScanDispatchMode {
  return process.env.SCAN_DISPATCH_MODE === "cloud-tasks" ? "cloud-tasks" : "poll";
}

interface CloudTasksConfig {
  projectId: string;
  location: string;
  queue: string;
  /** Base URL of the deployed Cloud Run worker, e.g. https://scan-worker-xxx.run.app */
  workerUrl: string;
  workerSecret: string;
  /** Service account Cloud Tasks impersonates to invoke private Cloud Run. */
  oidcServiceAccount: string;
}

const CLOUD_TASKS_ENV = [
  "CLOUD_TASKS_LOCATION",
  "CLOUD_TASKS_QUEUE",
  "SCAN_WORKER_URL",
  "INTERNAL_WORKER_SECRET",
  "CLOUD_TASKS_OIDC_SERVICE_ACCOUNT",
] as const;

export interface ScanDispatchConfiguration {
  mode: ScanDispatchMode;
  configured: boolean;
  missing: string[];
}

export function scanDispatchConfiguration(): ScanDispatchConfiguration {
  const mode = scanDispatchMode();
  if (mode === "poll") return { mode, configured: true, missing: [] };

  const missing: string[] = CLOUD_TASKS_ENV.filter(
    (name) => !process.env[name]
  );
  if (!process.env.GCP_PROJECT_ID && !process.env.FIREBASE_PROJECT_ID) {
    missing.unshift("GCP_PROJECT_ID");
  }
  return { mode, configured: missing.length === 0, missing };
}

function readConfig(): CloudTasksConfig | null {
  const status = scanDispatchConfiguration();
  if (!status.configured || status.mode !== "cloud-tasks") return null;
  const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const location = process.env.CLOUD_TASKS_LOCATION;
  const queue = process.env.CLOUD_TASKS_QUEUE;
  const workerUrl = process.env.SCAN_WORKER_URL;
  const workerSecret = process.env.INTERNAL_WORKER_SECRET;
  const oidcServiceAccount = process.env.CLOUD_TASKS_OIDC_SERVICE_ACCOUNT;
  if (
    !projectId ||
    !location ||
    !queue ||
    !workerUrl ||
    !workerSecret ||
    !oidcServiceAccount
  ) {
    return null;
  }
  return {
    projectId,
    location,
    queue,
    workerUrl: workerUrl.replace(/\/+$/, ""),
    workerSecret,
    oidcServiceAccount,
  };
}

// Cache the OAuth token so user-facing scan creation does not mint a new one on
// every enqueue. firebase-admin's service-account credential is granted the
// cloud-platform scope, which covers Cloud Tasks.
let tokenCache: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.value;
  }
  const credential = firebaseAdminApp().options.credential;
  if (!credential) {
    throw new Error("firebase_admin_credential_unavailable");
  }
  const token = await credential.getAccessToken();
  tokenCache = {
    value: token.access_token,
    expiresAt: Date.now() + Math.max(0, token.expires_in) * 1000,
  };
  return tokenCache.value;
}

export interface ScanTaskPayload {
  scanJobId: string;
  reason?:
    | "scan_created"
    | "sweep_requeue"
    | "deletion_created"
    | "monitor_due";
}

export interface DispatchResult {
  enqueued: boolean;
  reason?: "poll_mode" | "not_configured";
}

/**
 * Enqueue a Cloud Task that wakes the worker to drain claimable work. Safe to
 * call in any mode: returns `{ enqueued: false }` (without throwing) when
 * dispatch is not configured. Network/HTTP failures DO throw so callers can
 * log them — the sweeper re-enqueues anything that slips through, so a failed
 * enqueue never silently strands a scan.
 */
export async function enqueueScanTask(
  payload: ScanTaskPayload
): Promise<DispatchResult> {
  if (scanDispatchMode() !== "cloud-tasks") {
    return { enqueued: false, reason: "poll_mode" };
  }
  const cfg = readConfig();
  if (!cfg) {
    return { enqueued: false, reason: "not_configured" };
  }

  const endpoint =
    `https://cloudtasks.googleapis.com/v2/projects/${cfg.projectId}` +
    `/locations/${cfg.location}/queues/${cfg.queue}/tasks`;

  const httpRequest: Record<string, unknown> = {
    httpMethod: "POST",
    url: `${cfg.workerUrl}/process`,
    headers: {
      "content-type": "application/json",
      "x-internal-worker-secret": cfg.workerSecret,
    },
    // Cloud Tasks v2 expects the body as base64-encoded bytes.
    body: Buffer.from(JSON.stringify(payload)).toString("base64"),
  };
  httpRequest.oidcToken = {
    serviceAccountEmail: cfg.oidcServiceAccount,
    audience: cfg.workerUrl,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      task: {
        httpRequest,
        // HTTP tasks may run up to 30 minutes; a browser scan is bounded well
        // under this by WORKER_SCAN_TIMEOUT_MS.
        dispatchDeadline: "600s",
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`cloud_tasks_enqueue_failed_${res.status}: ${detail.slice(0, 500)}`);
  }

  return { enqueued: true };
}
