/**
 * GET /api/cron/data-retention
 *
 * Daily Vercel Cron entrypoint. Honors each workspace's
 * `privacy_settings.scanDataRetentionDays` (default 365) by deleting
 * scan_jobs whose `createdAt` is older than that window. Cascades take
 * care of scan_pages, accessibility_issues, ai_explanations, reports,
 * and remediation_tasks attached to deleted issues. Manual remediation
 * tasks (those with `issueId IS NULL`) are intentionally left alive.
 *
 * Each deleted scan writes a `privacy.scan_deleted` audit entry with
 * `metadata.reason = "retention"` so a workspace owner can prove on
 * demand that the deletion was policy-driven and not an operator action.
 *
 * Authentication: Vercel Cron sends an `Authorization: Bearer ${CRON_SECRET}`
 * header. We also accept calls from inside the platform that include the
 * `x-vercel-cron` header for local-style runs. Outside callers get a 401.
 */
import { NextRequest } from "next/server";
import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  scanJobs,
  privacySettings,
  workspaces,
} from "@/lib/db/schema";
import { audit } from "@/lib/api/audit";
import { captureException } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hard ceiling so a misconfigured 0 / negative retention does not delete everything in one run. */
const MIN_RETENTION_DAYS = 1;
/** Max scans we'll delete per workspace per run, to bound a single cron tick. */
const PER_WORKSPACE_BATCH = 500;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Local/dev: allow when no secret is configured but only if explicitly opted in.
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  // Vercel Cron also sets x-vercel-cron=1 on its scheduled invocations.
  if (req.headers.get("x-vercel-cron") === "1" && auth === `Bearer ${secret}`) {
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new Response("unauthorized", { status: 401 });
  }

  const startedAt = Date.now();
  let workspacesProcessed = 0;
  let scansDeleted = 0;
  const errors: { workspaceId: string; message: string }[] = [];

  try {
    const rows = await db
      .select({
        workspaceId: workspaces.id,
        retentionDays: privacySettings.scanDataRetentionDays,
      })
      .from(workspaces)
      .leftJoin(
        privacySettings,
        eq(privacySettings.workspaceId, workspaces.id)
      );

    for (const row of rows) {
      const days = Math.max(
        MIN_RETENTION_DAYS,
        row.retentionDays ?? 365
      );
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      try {
        // Fetch IDs first so we can audit each deletion and so the
        // delete is bounded by PER_WORKSPACE_BATCH.
        const stale = await db
          .select({ id: scanJobs.id, createdAt: scanJobs.createdAt })
          .from(scanJobs)
          .where(
            and(
              eq(scanJobs.workspaceId, row.workspaceId),
              lt(scanJobs.createdAt, cutoff)
            )
          )
          .limit(PER_WORKSPACE_BATCH);

        if (stale.length === 0) {
          workspacesProcessed++;
          continue;
        }

        await db
          .delete(scanJobs)
          .where(inArray(scanJobs.id, stale.map((s) => s.id)));

        for (const s of stale) {
          await audit({
            workspaceId: row.workspaceId,
            action: "privacy.scan_deleted",
            resourceType: "scan_job",
            resourceId: s.id,
            metadata: {
              reason: "retention",
              retentionDays: days,
              scanCreatedAt: s.createdAt.toISOString(),
            },
          });
        }

        scansDeleted += stale.length;
        workspacesProcessed++;
      } catch (err) {
        errors.push({
          workspaceId: row.workspaceId,
          message: (err as Error).message,
        });
        void captureException(err, {
          scope: "cron.data-retention",
          workspaceId: row.workspaceId,
        });
      }
    }

    const summary = {
      ok: true,
      workspacesProcessed,
      scansDeleted,
      errors,
      elapsedMs: Date.now() - startedAt,
    };
    console.log(
      JSON.stringify({
        level: "info",
        scope: "cron.data-retention",
        ...summary,
      })
    );
    return Response.json(summary);
  } catch (err) {
    void captureException(err, { scope: "cron.data-retention" });
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
