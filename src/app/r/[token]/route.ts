import { NextRequest } from "next/server";
import { findPublicReport } from "@/lib/data/firestore";
import { agencyBrandingEnabled } from "@/lib/entitlements";
import { buildReportInput } from "@/lib/reports/build-input";
import { renderHtml } from "@/lib/reports/render";
import { captureException } from "@/lib/observability";

const NOT_FOUND = new Response("Not found", {
  status: 404,
  headers: { "content-type": "text/plain; charset=utf-8" },
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || token.length < 16) return NOT_FOUND.clone();
    const shared = await findPublicReport(token);
    if (!shared) return NOT_FOUND.clone();
    const input = await buildReportInput({
      scanJobId: shared.report.scanJobId,
      workspaceId: shared.workspace.id,
      title: shared.report.title,
      workspaceName: shared.workspace.name,
      agencyBranding: agencyBrandingEnabled(shared.workspace.plan),
    });
    if (!input) return NOT_FOUND.clone();
    return new Response(renderHtml(input), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  } catch (err) {
    void captureException(err, { scope: "report.public-share" });
    return new Response("Internal error", { status: 500 });
  }
}
