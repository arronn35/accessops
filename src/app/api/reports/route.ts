/**
 * POST /api/reports — create a report from a completed scan
 * GET  /api/reports — list reports for the workspace
 */
import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { reports, scanJobs } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";

const Schema = z.object({
  scanJobId: z.string().uuid(),
  title: z.string().min(2).max(240),
  reportType: z.enum(["full", "executive", "csv"]).default("full"),
  sections: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSession();
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "invalid_input");

    const [job] = await db
      .select({ workspaceId: scanJobs.workspaceId, status: scanJobs.status })
      .from(scanJobs)
      .where(eq(scanJobs.id, parsed.data.scanJobId))
      .limit(1);
    if (!job || job.workspaceId !== ctx.workspaceId) {
      throw new ApiError(404, "scan_not_found");
    }
    if (job.status !== "completed") {
      throw new ApiError(409, "scan_not_complete");
    }

    const [report] = await db
      .insert(reports)
      .values({
        workspaceId: ctx.workspaceId,
        scanJobId: parsed.data.scanJobId,
        title: parsed.data.title,
        reportType: parsed.data.reportType,
        disclaimerText: COMPLIANCE_COPY.REPORT_NOT_LEGAL,
        sectionsJson: parsed.data.sections,
        createdBy: ctx.userId,
      })
      .returning();

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "report.created",
      resourceType: "report",
      resourceId: report.id,
    });

    return Response.json({ report }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function GET() {
  try {
    const ctx = await requireSession();
    const rows = await db
      .select()
      .from(reports)
      .where(eq(reports.workspaceId, ctx.workspaceId))
      .orderBy(desc(reports.createdAt));
    return Response.json({ reports: rows });
  } catch (err) {
    return apiError(err);
  }
}
