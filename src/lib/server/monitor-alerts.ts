import "server-only";
import {
  audit,
  getScanJob,
  listMonitorsWithUnalertedScans,
  updateMonitor,
} from "@/lib/data/firestore";
import { resolveComparison } from "@/lib/server/compare";
import {
  decideRegressionAlerts,
  regressionAlertKey,
} from "@/lib/notifications/regression";
import { captureException } from "@/lib/observability";

/**
 * Turn finished monitor runs into regression notifications.
 *
 * Runs from the sweep, not from the worker: the decision needs the previous
 * scan's stored groups, and the sweep is already the job that reconciles
 * finished work. It is safe to run repeatedly — each monitor records the scan
 * it has evaluated, and each alert is written under a deterministic id — so a
 * duplicate scheduler delivery cannot produce a duplicate notification.
 *
 * A scan that regressed but whose comparison is inconclusive produces nothing:
 * see decideRegressionAlerts for why that is deliberate.
 */
export async function dispatchMonitorRegressionAlerts(
  limit = 25
): Promise<{ evaluated: number; alerted: number; skipped: number }> {
  const monitors = await listMonitorsWithUnalertedScans(limit);
  let evaluated = 0;
  let alerted = 0;
  let skipped = 0;

  for (const monitor of monitors) {
    const scanId = monitor.lastScanId;
    if (!scanId) continue;

    try {
      const scan = await getScanJob(monitor.workspaceId, scanId);
      // Still running: leave lastAlertedScanId alone so we look again later.
      if (!scan || scan.status !== "completed") {
        skipped += 1;
        continue;
      }

      evaluated += 1;
      const result = await resolveComparison(scanId, null, monitor.workspaceId);
      const alerts = result.comparable
        ? decideRegressionAlerts(result.comparison, monitor.alertThreshold)
        : [];

      for (const alert of alerts) {
        await audit({
          userId: monitor.createdBy,
          workspaceId: monitor.workspaceId,
          action: `monitor.${alert.kind}`,
          resourceType: "scan",
          resourceId: scanId,
          metadata: {
            monitorId: monitor.id,
            targetUrl: monitor.targetUrl,
            title: alert.title,
            body: alert.body,
          },
          dedupeKey: regressionAlertKey(scanId, alert.kind),
        });
      }
      alerted += alerts.length;

      // Marked evaluated even when nothing was worth saying — silence is the
      // expected outcome for an unchanged scan, not a reason to retry forever.
      await updateMonitor(monitor.workspaceId, monitor.id, {
        lastAlertedScanId: scanId,
      });
    } catch (err) {
      // One broken monitor must not stop the others.
      skipped += 1;
      captureException(err, { monitorId: monitor.id, scanId });
    }
  }

  return { evaluated, alerted, skipped };
}
