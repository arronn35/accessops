import { NextRequest } from "next/server";
import {
  getLatestWorkerHeartbeat,
  isWorkerHeartbeatFresh,
} from "@/lib/data/worker-health";
import { firebaseAdminConfigured, firestore } from "@/lib/firebase/admin";
import {
  listClaimablePageJobRefs,
  listClaimableScanRefs,
} from "@/lib/data/firestore";
import { listClaimableDataDeletionJobs } from "@/lib/data/deletion";
import {
  scanDispatchConfiguration,
  type ScanDispatchConfiguration,
} from "@/lib/scanner/dispatch";

export const dynamic = "force-dynamic";

/**
 * Detailed diagnostics are operator-only. The public readiness shape carries
 * just ok/degraded/service/mode/ts; anything naming internal env vars, raw
 * dependency errors, or worker timing stays behind INTERNAL_DIAGNOSTICS_TOKEN.
 * When the token is unset, detailed diagnostics are closed, not open.
 */
function isDiagnosticsAuthorized(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_DIAGNOSTICS_TOKEN;
  if (!expected) return false;
  return req.headers.get("x-diagnostics-token") === expected;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timeout`)), ms)
    ),
  ]);
}

async function checkFirestore(): Promise<{ ok: boolean; detail?: string }> {
  if (!firebaseAdminConfigured()) {
    return { ok: false, detail: "dependency_unavailable" };
  }
  try {
    await withTimeout(firestore().collection("systemUsage").limit(1).get(), 3000, "firestore");
    return { ok: true };
  } catch (err) {
    // Raw driver messages name collections and SDK internals — log them,
    // never serialize them to unauthenticated callers.
    console.error("[healthz] firestore check failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, detail: "dependency_unavailable" };
  }
}

/**
 * Scan-worker liveness from `workerHeartbeats`. Sanitized: exposes only
 * freshness and beat age, never worker ids, hosts, or job details.
 */
async function checkWorker(dispatch: ScanDispatchConfiguration): Promise<{
  ok: boolean;
  state: "active" | "idle_or_scaled_to_zero" | "stale" | "not_configured";
  lastSeenSecondsAgo: number | null;
  pending: boolean | null;
}> {
  if (!dispatch.configured) {
    return {
      ok: false,
      state: "not_configured",
      lastSeenSecondsAgo: null,
      pending: null,
    };
  }
  try {
    const [lastSeenAt, pending] = await Promise.all([
      withTimeout(getLatestWorkerHeartbeat(), 3000, "worker-heartbeat"),
      dispatch.mode === "cloud-tasks"
        ? withTimeout(
            Promise.all([
              listClaimableScanRefs(1),
              listClaimablePageJobRefs(1),
              listClaimableDataDeletionJobs(1),
            ]).then((groups) => groups.some((group) => group.length > 0)),
            3000,
            "pending-work"
          )
        : Promise.resolve(false),
    ]);
    const fresh = isWorkerHeartbeatFresh(lastSeenAt);
    const ok =
      dispatch.mode === "cloud-tasks"
        ? !pending || fresh
        : fresh;
    return {
      ok,
      state: fresh
        ? "active"
        : dispatch.mode === "cloud-tasks" && !pending
          ? "idle_or_scaled_to_zero"
          : "stale",
      lastSeenSecondsAgo: lastSeenAt
        ? Math.max(0, Math.round((Date.now() - lastSeenAt.getTime()) / 1000))
        : null,
      pending,
    };
  } catch {
    return {
      ok: false,
      state: "stale",
      lastSeenSecondsAgo: null,
      pending: null,
    };
  }
}

export async function GET(req: NextRequest) {
  const deep = req.nextUrl.searchParams.get("deep") === "1";
  if (!deep) {
    return Response.json({
      ok: true,
      service: "percevia-web",
      mode: "liveness",
      stack: "firebase-firestore-polling-worker",
      ts: new Date().toISOString(),
    });
  }

  const dispatch = scanDispatchConfiguration();
  const firestoreCheck = await checkFirestore();
  const workerCheck = firestoreCheck.ok
    ? await checkWorker(dispatch)
    : {
        ok: false,
        state: "stale" as const,
        lastSeenSecondsAgo: null,
        pending: null,
      };

  // `ok` (and the 503) reflects only the web app's own dependencies; a
  // stale worker marks the service `degraded` (scans queue but don't run)
  // without pulling web instances out of rotation.
  const ok = firestoreCheck.ok;
  const degraded = ok && (!dispatch.configured || !workerCheck.ok);

  // Public shape: summary only. Missing-env names, raw error detail, and
  // worker timing stay out of unauthenticated responses.
  if (!isDiagnosticsAuthorized(req)) {
    return Response.json(
      { ok, degraded, service: "percevia-web", mode: "readiness", ts: new Date().toISOString() },
      { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } }
    );
  }

  return Response.json(
    {
      ok,
      degraded,
      service: "percevia-web",
      mode: "readiness",
      dispatch: { mode: dispatch.mode, configured: dispatch.configured },
      checks: {
        firestore: { ok: firestoreCheck.ok },
        worker: { ok: workerCheck.ok, state: workerCheck.state },
      },
      ts: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
