/** TEMPORARY Phase-1 acceptance helper (deleted after the run): craft doomed jobs + dump audit rows. */
import { createScanJob, updateScanJob, getScanJob, listAuditLogs } from "../src/lib/data/firestore";

const mode = process.argv[2];

(async () => {
  if (mode === "seed") {
    const exhausted = await createScanJob({
      workspaceId: "ws-accept",
      requestedBy: "accept-test",
      baseUrl: "https://example.com",
      scanType: "single",
      maxPages: 1,
      permissionConfirmed: true,
    });
    await updateScanJob("ws-accept", exhausted.id, {
      status: "running",
      processorHeartbeatAt: new Date(Date.now() - 5 * 60_000),
      reclaimAttempts: 3,
    });

    const ancient = new Date(Date.now() - 31 * 60_000);
    const timedOut = await createScanJob({
      workspaceId: "ws-accept",
      requestedBy: "accept-test",
      baseUrl: "https://example.com",
      scanType: "single",
      maxPages: 1,
      permissionConfirmed: true,
      createdAt: ancient,
      updatedAt: ancient,
    });
    console.log(JSON.stringify({ exhausted: exhausted.id, timedOut: timedOut.id }));
    return;
  }

  if (mode === "check") {
    for (const id of process.argv.slice(3)) {
      const job = await getScanJob("ws-accept", id);
      console.log(
        `${id.slice(0, 8)}: status=${job?.status} errorCode=${job?.errorCode} errorMessage="${job?.errorMessage}"`
      );
    }
    const logs = await listAuditLogs("ws-accept", 20);
    for (const row of logs) {
      if (row.action.startsWith("scan.")) {
        console.log(`audit: ${row.action} resource=${String(row.resourceId).slice(0, 8)} meta=${JSON.stringify(row.metadataJson)}`);
      }
    }
  }
})();
