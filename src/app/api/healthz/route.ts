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
    return { ok: false, detail: "Firebase Admin environment is not configured" };
  }
  try {
    await withTimeout(firestore().collection("systemUsage").limit(1).get(), 3000, "firestore");
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
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
  return Response.json(
    {
      ok,
      degraded: ok && (!dispatch.configured || !workerCheck.ok),
      service: "percevia-web",
      mode: "readiness",
      dispatch,
      checks: { firestore: firestoreCheck, worker: workerCheck },
      ts: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
