/**
 * GET /api/visual-evidence/:id/image
 *
 * Authenticated image proxy. Never redirects to raw bucket URLs.
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { visualEvidence } from "@/lib/db/schema";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getVisualEvidenceObject } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const rl = await checkRateLimit("visualEvidence", `${ctx.workspaceId}:${ctx.userId}:image`);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining);

    const { id } = await params;
    const [row] = await db
      .select()
      .from(visualEvidence)
      .where(
        and(
          eq(visualEvidence.id, id),
          eq(visualEvidence.workspaceId, ctx.workspaceId)
        )
      )
      .limit(1);

    if (!row) throw new ApiError(404, "not_found");
    if (row.deletedAt || row.expiresAt <= new Date()) {
      throw new ApiError(410, "expired_or_deleted");
    }
    if (
      !row.screenshotKey ||
      (row.screenshotStatus !== "captured" && row.screenshotStatus !== "redacted")
    ) {
      throw new ApiError(404, row.failureReason ?? "image_not_available");
    }

    const object = await getVisualEvidenceObject(row.screenshotKey);
    const body = new Uint8Array(object.body);
    return new Response(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength), {
      status: 200,
      headers: {
        "content-type": object.contentType,
        "cache-control": "private, no-store",
        "content-security-policy": "default-src 'none'; img-src 'self'",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
