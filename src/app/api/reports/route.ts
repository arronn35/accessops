import { z } from "zod";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { roleHasPermission } from "@/lib/entitlements";
import {
  audit,
  createOrUpdateReport,
  getScanJob,
  listReports,
} from "@/lib/data/firestore";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";

const Schema = z.object({
  scanJobId: z.string(),
  title: z.string().min(2).max(240),
  reportType: z.enum(["full", "executive", "csv"]).default("full"),
  sections: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "export_reports")) throw new ApiError(403, "forbidden");
    const parsed = Schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    const job = await getScanJob(ctx.workspaceId, parsed.data.scanJobId);
    if (!job) throw new ApiError(404, "scan_not_found");
    if (job.status !== "completed") throw new ApiError(409, "scan_not_complete");
    const report = await createOrUpdateReport(ctx.workspaceId, {
      scanJobId: parsed.data.scanJobId,
      title: parsed.data.title,
      reportType: parsed.data.reportType,
      disclaimerText: COMPLIANCE_COPY.REPORT_NOT_LEGAL,
      sectionsJson: parsed.data.sections,
      createdBy: ctx.userId,
    });
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "report.created",
      resourceType: "report",
      resourceId: report.id,
      metadata: { scanJobId: report.scanJobId, reportType: report.reportType },
    });
    return Response.json({ report }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function GET() {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "export_reports")) throw new ApiError(403, "forbidden");
    return Response.json({ reports: await listReports(ctx.workspaceId) });
  } catch (err) {
    return apiError(err);
  }
}
