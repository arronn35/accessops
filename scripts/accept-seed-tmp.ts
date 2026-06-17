/** TEMPORARY Phase-1 acceptance helper (deleted after the run): seed one scan job in the emulator. */
import { createScanJob } from "../src/lib/data/firestore";

(async () => {
  const job = await createScanJob({
    workspaceId: "ws-accept",
    requestedBy: "accept-test",
    baseUrl: "https://example.com",
    scanType: "single",
    maxPages: 1,
    permissionConfirmed: true,
  });
  console.log(`seeded scan ${job.id} status=${job.status}`);
})();
