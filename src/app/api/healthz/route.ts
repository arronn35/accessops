import { NextRequest } from "next/server";
import {
  getLatestWorkerHeartbeat,
  isWorkerHeartbeatFresh,
} from "@/lib/data/worker-health";
import { firebaseAdminConfigured, firestore } from "@/lib/firebase/admin";

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
async function checkWorker(): Promise<{ ok: boolean; lastSeenSecondsAgo: number | null }> {
  try {
    const lastSeenAt = await withTimeout(getLatestWorkerHeartbeat(), 3000, "worker-heartbeat");
    return {
      ok: isWorkerHeartbeatFresh(lastSeenAt),
      lastSeenSecondsAgo: lastSeenAt
        ? Math.max(0, Math.round((Date.now() - lastSeenAt.getTime()) / 1000))
        : null,
    };
  } catch {
    return { ok: false, lastSeenSecondsAgo: null };
  }
}

export async function GET(req: NextRequest) {
  const deep = req.nextUrl.searchParams.get("deep") === "1";
  if (!deep) {
    return Response.json({
      ok: true,
      service: "accessops-web",
      mode: "liveness",
      stack: "firebase-firestore-polling-worker",
      ts: new Date().toISOString(),
    });
  }

  const firestoreCheck = await checkFirestore();
  const workerCheck = firestoreCheck.ok
    ? await checkWorker()
    : { ok: false, lastSeenSecondsAgo: null };

  // `ok` (and the 503) reflects only the web app's own dependencies; a
  // stale worker marks the service `degraded` (scans queue but don't run)
  // without pulling web instances out of rotation.
  const ok = firestoreCheck.ok;
  return Response.json(
    {
      ok,
      degraded: ok && !workerCheck.ok,
      service: "accessops-web",
      mode: "readiness",
      dispatch: "firestore-polling-worker",
      checks: { firestore: firestoreCheck, worker: workerCheck },
      ts: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
