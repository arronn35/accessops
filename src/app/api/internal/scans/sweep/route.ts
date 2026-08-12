import { randomUUID } from "node:crypto";
import {
  applyPageJobSweepAction,
  applySweepAction,
  claimAggregation,
  getScanJob,
  listAggregationCandidates,
  listClaimablePageJobRefs,
  listClaimableScanRefs,
  listSweepablePageJobs,
  listSweepableScans,
} from "@/lib/data/firestore";
import { sweepScans } from "@/lib/data/scan-sweeper";
import { sweepPageJobs } from "@/lib/data/page-jobs";
import { listClaimableDataDeletionJobs } from "@/lib/data/deletion";
import { aggregateScan } from "@/lib/scanner/persistence";
import { enqueueScanTask, scanDispatchMode } from "@/lib/scanner/dispatch";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";
import { captureException } from "@/lib/observability";

export const dynamic = "force-dynamic";
// Aggregation + sweeps can walk many docs; give the function room to finish.
export const maxDuration = 300;

const SWEEP_WORKER_ID = `sweep-${randomUUID().slice(0, 8)}`;
// How many /process tasks to enqueue when work is pending. A single task drains
// everything (drain-all), but a small fan-out lets Cloud Run scale out for big
// multi-page backlogs. Atomic claims keep extra tasks harmless.
const SWEEP_MAX_FANOUT = Math.max(
  1,
  Math.floor(Number(process.env.SWEEP_MAX_FANOUT ?? 3))
);

/**
 * Crash recovery + dispatch safety net for the scale-to-zero scan worker.
 * Triggered every 1–2 minutes by Cloud Scheduler. Browser-free: it only does
 * Firestore bookkeeping (requeue stale jobs, fail timeouts), aggregates
 * finished scans, and re-enqueues a Cloud Task so the worker wakes for any
 * still-pending work. The heavy Playwright engine never runs here.
 *
 * Auth: when CRON_SECRET is set, require it as a bearer token (Cloud Scheduler
 * sends it); reject everything else so the sweep cannot be triggered publicly.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runSweep(): Promise<{
  applied: number;
  aggregated: number;
  enqueued: number;
  pending: number;
}> {
  let applied = 0;
  let aggregated = 0;

  // 1) Bookkeeping: requeue stale-running jobs, fail timeouts.
  const [scanDocs, pageDocs] = await Promise.all([
    listSweepableScans(),
    listSweepablePageJobs(),
  ]);
  const at = new Date();
  const scanActions = sweepScans(at, scanDocs);
  const pageActions = sweepPageJobs(at, pageDocs);
  const [scanResults, pageResults] = await Promise.all([
    Promise.allSettled(scanActions.map(applySweepAction)),
    Promise.allSettled(pageActions.map(applyPageJobSweepAction)),
  ]);
  for (const result of scanResults) {
    if (result.status === "fulfilled") {
      if (result.value) applied += 1;
    } else {
      console.error("[sweep] scan action failed", result.reason);
    }
  }
  const aggregationScans = new Set<string>();
  for (let i = 0; i < pageResults.length; i += 1) {
    const result = pageResults[i];
    if (result.status === "fulfilled") {
      if (result.value.applied) applied += 1;
      if (result.value.aggregationWon) {
        const action = pageActions[i];
        aggregationScans.add(`${action.workspaceId}/${action.scanId}`);
      }
    } else {
      console.error("[sweep] page action failed", result.reason);
    }
  }

  // 2) Aggregate scans whose page jobs all finished (browser-free).
  const aggregate = async (workspaceId: string, scanId: string) => {
    if (!(await claimAggregation(workspaceId, scanId, SWEEP_WORKER_ID))) return;
    const scan = await getScanJob(workspaceId, scanId);
    if (!scan) return;
    const result = await aggregateScan(scan.id, {
      workspaceId: scan.workspaceId,
      userId: scan.requestedBy,
      workerId: SWEEP_WORKER_ID,
    });
    if (result) aggregated += 1;
  };
  for (const key of aggregationScans) {
    const [workspaceId, scanId] = key.split("/");
    await aggregate(workspaceId, scanId).catch((err) =>
      console.error(`[sweep] aggregate ${scanId} failed`, err)
    );
  }
  const candidates = await listAggregationCandidates();
  for (const scan of candidates) {
    await aggregate(scan.workspaceId, scan.id).catch((err) =>
      console.error(`[sweep] aggregate ${scan.id} failed`, err)
    );
  }

  // 3) Wake the worker for any still-pending work (push dispatch only).
  let pending = 0;
  let enqueued = 0;
  if (scanDispatchMode() === "cloud-tasks") {
    const [scanRefs, pageRefs, deletionJobs] = await Promise.all([
      listClaimableScanRefs(SWEEP_MAX_FANOUT),
      listClaimablePageJobRefs(SWEEP_MAX_FANOUT),
      listClaimableDataDeletionJobs(1),
    ]);
    pending = scanRefs.length + pageRefs.length + deletionJobs.length;
    if (pending > 0) {
      const tasks = Math.min(SWEEP_MAX_FANOUT, pending);
      const triggerId = scanRefs[0]?.scanId ?? pageRefs[0]?.scanId ?? "sweep";
      for (let i = 0; i < tasks; i += 1) {
        try {
          const result = await enqueueScanTask({
            scanJobId: triggerId,
            reason: "sweep_requeue",
          });
          if (result.enqueued) enqueued += 1;
        } catch (err) {
          void captureException(err, { scope: "scan.sweep.dispatch" });
        }
      }
    }
  }

  return { applied, aggregated, enqueued, pending };
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!firebaseAdminConfigured()) {
    return Response.json(
      { ok: false, error: "firebase_admin_not_configured" },
      { status: 503 }
    );
  }
  try {
    const result = await runSweep();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    void captureException(err, { scope: "cron.scan-sweep" });
    return Response.json({ ok: false, error: "sweep_failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
