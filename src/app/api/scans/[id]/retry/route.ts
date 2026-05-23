/**
 * POST /api/scans/:id/retry — re-enqueue a failed scan.
 *
 * Why a dedicated endpoint instead of "create a new scan with the same
 * URL": preserving the same `scanJobId` means existing report drafts,
 * remediation tasks (if any), and audit history stay attached, and the
 * progress page the user is on keeps polling the same record.
 *
 * Constraints:
 *   - Must be the same workspace.
 *   - Scan must be in `failed` state. Re-queueing a running or completed
 *     scan would clobber valid data.
 *   - Counts against the `scanCreate` rate limit (5/min/user) — a retry
 *     is, from the abuse-prevention POV, the same kind of cost as a
 *     fresh scan creation.
 *   - Falls back to inline static scan when Redis is unavailable, mirroring
 *     POST /api/scans behaviour.
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scanJobs } from "@/lib/db/schema";
import {
  apiError,
  ApiError,
  rateLimitError,
  requireSession,
} from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { audit } from "@/lib/api/audit";
import { enqueueScan } from "@/lib/queue";
import {
  inlineScanFallbackEnabled,
  processScanInline,
} from "@/lib/scanner/inline-runner";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;

    const [job] = await db
      .select({
        id: scanJobs.id,
        status: scanJobs.status,
        workspaceId: scanJobs.workspaceId,
      })
      .from(scanJobs)
      .where(and(eq(scanJobs.id, id), eq(scanJobs.workspaceId, ctx.workspaceId)))
      .limit(1);

    if (!job) throw new ApiError(404, "not_found");
    if (job.status !== "failed") {
      throw new ApiError(
        409,
        "not_retryable",
        `Only failed scans can be retried (current status: ${job.status}).`
      );
    }

    const rl = await checkRateLimit("scanCreate", ctx.userId);
    if (!rl.ok) {
      throw rateLimitError(rl.reset, rl.remaining, "Too many scans started recently.");
    }

    // Reset progress fields so the polling UI starts clean.
    await db
      .update(scanJobs)
      .set({
        status: "queued",
        progressStep: "queued",
        pagesScanned: 0,
        pagesDiscovered: 0,
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(scanJobs.id, id));

    let executionMode: "queue" | "inline" = "queue";
    try {
      await enqueueScan({
        scanJobId: id,
        workspaceId: ctx.workspaceId,
        requestedBy: ctx.userId,
      });
    } catch (err) {
      if (!inlineScanFallbackEnabled()) {
        await db
          .update(scanJobs)
          .set({
            status: "failed",
            progressStep: "failed",
            errorMessage: `enqueue_failed: ${(err as Error).message}`,
          })
          .where(eq(scanJobs.id, id));
        throw new ApiError(503, "queue_unavailable");
      }
      executionMode = "inline";
      try {
        await processScanInline(id);
      } catch {
        // Inline runner persists its own failed status; let the caller
        // see the retry succeeded at the API layer.
      }
    }

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "scan.retried",
      resourceType: "scan_job",
      resourceId: id,
      metadata: { mode: executionMode },
    });

    return Response.json({ ok: true, scanJobId: id, mode: executionMode });
  } catch (err) {
    return apiError(err);
  }
}
