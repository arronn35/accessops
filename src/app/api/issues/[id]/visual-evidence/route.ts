/**
 * GET /api/issues/:id/visual-evidence
 *
 * Returns visual evidence metadata only. Image bytes are served through the
 * authenticated /api/visual-evidence/:id/image proxy.
 */
import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessibilityIssues, scanJobs, visualEvidence } from "@/lib/db/schema";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const rl = await checkRateLimit("visualEvidence", `${ctx.workspaceId}:${ctx.userId}`);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining);

    const { id } = await params;
    const [issue] = await db
      .select({ id: accessibilityIssues.id, workspaceId: scanJobs.workspaceId })
      .from(accessibilityIssues)
      .leftJoin(scanJobs, eq(accessibilityIssues.scanJobId, scanJobs.id))
      .where(eq(accessibilityIssues.id, id))
      .limit(1);

    if (!issue || issue.workspaceId !== ctx.workspaceId) {
      throw new ApiError(404, "not_found");
    }

    const [evidence] = await db
      .select()
      .from(visualEvidence)
      .where(
        and(
          eq(visualEvidence.issueId, id),
          eq(visualEvidence.workspaceId, ctx.workspaceId)
        )
      )
      .orderBy(desc(visualEvidence.createdAt))
      .limit(1);

    if (!evidence) return Response.json({ evidence: null });

    const unavailable = !!evidence.deletedAt || evidence.expiresAt <= new Date();
    return Response.json({
      evidence: {
        id: evidence.id,
        screenshotStatus: unavailable ? "skipped" : evidence.screenshotStatus,
        selector: evidence.selector,
        viewport: evidence.viewportJson,
        state: evidence.state,
        boundingBox: evidence.boundingBoxJson,
        redactionApplied: evidence.redactionApplied,
        failureReason: unavailable
          ? "expired_or_deleted"
          : evidence.failureReason,
        expiresAt: evidence.expiresAt.toISOString(),
        createdAt: evidence.createdAt.toISOString(),
        imageUrl:
          !unavailable &&
          evidence.screenshotKey &&
          (evidence.screenshotStatus === "captured" ||
            evidence.screenshotStatus === "redacted")
            ? `/api/visual-evidence/${evidence.id}/image`
            : null,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
