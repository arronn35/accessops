import {
  audit,
  claimDueMonitor,
  countInflightScans,
  createScanJob,
  getPrivacySettings,
  getWorkspace,
  listDueMonitors,
  reserveScanQuota,
  updateMonitor,
} from "@/lib/data/firestore";
import { scanCapsForPlan, normalizePlan } from "@/lib/entitlements";
import { pageJobsEnabled } from "@/lib/data/page-jobs";
import { computeNextRunAt } from "@/lib/monitors/schedule";
import { captureException } from "@/lib/observability";
import {
  enqueueScanTask,
  scanDispatchConfiguration,
} from "@/lib/scanner/dispatch";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MONITOR_BATCH_SIZE = Math.max(
  1,
  Math.min(100, Number(process.env.MONITOR_SCHEDULER_BATCH_SIZE ?? 25))
);
const MONITOR_RETRY_MS = Math.max(
  60_000,
  Number(process.env.MONITOR_SCHEDULER_RETRY_MS ?? 15 * 60_000)
);

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runDueMonitors(): Promise<{
  due: number;
  created: number;
  skipped: number;
  failed: number;
}> {
  const due = await listDueMonitors(new Date(), MONITOR_BATCH_SIZE);
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of due) {
    const claimedAt = new Date();
    const monitor = await claimDueMonitor(
      candidate.workspaceId,
      candidate.id,
      claimedAt
    );
    if (!monitor) {
      skipped += 1;
      continue;
    }

    try {
      const workspace = await getWorkspace(monitor.workspaceId);
      if (!workspace) throw new Error("monitor_workspace_not_found");
      const plan = normalizePlan(workspace.plan);
      const caps = scanCapsForPlan(plan);

      const maxConcurrent = Math.max(
        1,
        Number(process.env.MAX_CONCURRENT_SCANS_PER_WORKSPACE ?? 1)
      );
      if ((await countInflightScans(monitor.workspaceId)) >= maxConcurrent) {
        await updateMonitor(monitor.workspaceId, monitor.id, {
          nextRunAt: new Date(Date.now() + MONITOR_RETRY_MS),
        });
        skipped += 1;
        continue;
      }

      const reserved = await reserveScanQuota({
        workspaceId: monitor.workspaceId,
        plan,
        maxPages: Math.min(monitor.scanConfig.maxPages, caps.maxPagesCap),
      });
      const privacy = await getPrivacySettings(monitor.workspaceId);
      const screenshotsAllowed =
        monitor.scanConfig.includeScreenshots &&
        privacy.visualEvidenceEnabled &&
        privacy.screenshotStorageEnabled;

      const scan = await createScanJob({
        workspaceId: monitor.workspaceId,
        requestedBy: monitor.createdBy,
        scanType: monitor.scanConfig.scanType,
        status: "queued",
        baseUrl: monitor.targetUrl,
        maxPages: reserved.maxPages,
        includeScreenshots: monitor.scanConfig.includeScreenshots,
        storeScreenshots: screenshotsAllowed,
        visualEvidenceMaxScreenshots: screenshotsAllowed
          ? caps.visualEvidenceMaxPerScan
          : 0,
        aiExplanationsEnabled: false,
        aiRemediationEnabled: false,
        permissionConfirmed: true,
        progressStep: "queued",
        usePageJobs: pageJobsEnabled(),
      });

      await updateMonitor(monitor.workspaceId, monitor.id, {
        lastRunAt: claimedAt,
        lastScanId: scan.id,
        nextRunAt: computeNextRunAt(monitor.frequency, claimedAt),
      });
      await audit({
        userId: monitor.createdBy,
        workspaceId: monitor.workspaceId,
        action: "monitor.scan_scheduled",
        resourceType: "scan",
        resourceId: scan.id,
        metadata: { monitorId: monitor.id, targetUrl: monitor.targetUrl },
      });
      await enqueueScanTask({
        scanJobId: scan.id,
        reason: "monitor_due",
      });
      created += 1;
    } catch (err) {
      failed += 1;
      await updateMonitor(monitor.workspaceId, monitor.id, {
        nextRunAt: new Date(Date.now() + MONITOR_RETRY_MS),
      }).catch(() => undefined);
      void captureException(err, {
        scope: "monitor.scheduler",
        workspaceId: monitor.workspaceId,
        monitorId: monitor.id,
      });
    }
  }

  return { due: due.length, created, skipped, failed };
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
  const dispatch = scanDispatchConfiguration();
  if (!dispatch.configured || dispatch.mode !== "cloud-tasks") {
    return Response.json(
      {
        ok: false,
        error: "scan_dispatch_not_configured",
        missing: dispatch.missing,
      },
      { status: 503 }
    );
  }
  try {
    return Response.json({ ok: true, ...(await runDueMonitors()) });
  } catch (err) {
    void captureException(err, { scope: "cron.monitor-scheduler" });
    return Response.json(
      { ok: false, error: "monitor_scheduler_failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
