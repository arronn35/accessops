import { processScanInline } from "@/lib/scanner/inline-runner";
import { findScanJob } from "@/lib/data/firestore";
import { authorizeInternalRequest } from "@/lib/api/internal-auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  // Cloud Tasks attaches an OIDC token; the shared header is the legacy path.
  // Unlike the scheduler routes this one never opens up without a credential:
  // it runs a full scan, so an unconfigured deployment must reject.
  const auth = await authorizeInternalRequest(req, {
    secretEnv: "INTERNAL_WORKER_SECRET",
    secretHeader: "x-internal-worker-secret",
  });
  if (!auth.ok || auth.via === "unauthenticated_dev") {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { scanJobId?: string };
  if (!body.scanJobId) {
    return Response.json({ error: "missing_scan_job_id" }, { status: 400 });
  }
  try {
    console.log("[scan-internal] processing started", { scanJobId: body.scanJobId });
    await processScanInline(body.scanJobId, { allowQueueFailureFallback: true });
    console.log("[scan-internal] processing completed", { scanJobId: body.scanJobId });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[scan-internal] processing failed", {
      scanJobId: body.scanJobId,
      error: err instanceof Error ? err.message : String(err),
    });
    const job = await findScanJob(body.scanJobId);
    if (job?.status === "failed") {
      return Response.json({
        ok: false,
        handled: true,
        status: "failed",
        error: job.errorMessage ?? (err as Error).message,
      });
    }
    throw err;
  }
}
