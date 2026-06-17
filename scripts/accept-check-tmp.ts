/** TEMPORARY Phase-1 acceptance helper (deleted after the run): print scan job state. */
import { getScanJob } from "../src/lib/data/firestore";

(async () => {
  const job = await getScanJob("ws-accept", process.argv[2]!);
  if (!job) {
    console.log("NOT FOUND");
    return;
  }
  console.log(
    JSON.stringify(
      {
        status: job.status,
        progressStep: job.progressStep,
        claimedBy: job.claimedBy ?? null,
        reclaimAttempts: job.reclaimAttempts ?? 0,
        errorCode: job.errorCode ?? null,
        errorMessage: job.errorMessage,
        pagesScanned: job.pagesScanned,
        timings: job.timings ?? null,
      },
      null,
      2
    )
  );
})();
