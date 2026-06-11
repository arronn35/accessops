import { randomBytes } from "node:crypto";
import { z } from "zod";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, getReport, setReportShare } from "@/lib/data/firestore";

const BodySchema = z.object({ public: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_body");
    const report = await getReport(ctx.workspaceId, id);
    if (!report) throw new ApiError(404, "not_found");
    if (parsed.data.public) {
      const token = report.publicShareToken ?? randomBytes(24).toString("base64url");
      await setReportShare(ctx.workspaceId, id, token);
      await audit({ userId: ctx.userId, workspaceId: ctx.workspaceId, action: "report.shared", resourceType: "report", resourceId: id });
      return Response.json({ public: true, token, shareUrl: `/r/${token}` });
    }
    await setReportShare(ctx.workspaceId, id, null);
    await audit({ userId: ctx.userId, workspaceId: ctx.workspaceId, action: "report.unshared", resourceType: "report", resourceId: id });
    return Response.json({ public: false });
  } catch (err) {
    return apiError(err);
  }
}
