import "server-only";
import { getVisualEvidence } from "@/lib/data/firestore";
import type { ReportEvidence } from "@/lib/reports/render";

/**
 * Embedded screenshots make HTML/PDF reports heavy (each image can be up
 * to ~650 KB), so loading stops after this many images. Callers pass
 * issue ids ordered by severity so the most important findings win.
 */
export const MAX_REPORT_EVIDENCE = 12;

export async function loadReportEvidence(
  workspaceId: string,
  issueIds: string[]
): Promise<Map<string, ReportEvidence>> {
  const out = new Map<string, ReportEvidence>();
  for (const issueId of issueIds) {
    if (out.size >= MAX_REPORT_EVIDENCE) break;
    // Evidence docs are keyed by issue id.
    const evidence = await getVisualEvidence(workspaceId, issueId);
    if (!evidence?.imageDataBase64) continue;
    if (evidence.screenshotStatus !== "captured" && evidence.screenshotStatus !== "redacted") {
      continue;
    }
    if (evidence.expiresAt <= new Date()) continue;
    out.set(issueId, {
      dataUri: `data:${evidence.imageContentType ?? "image/png"};base64,${evidence.imageDataBase64}`,
      selector: evidence.selector,
      redactionApplied: evidence.redactionApplied,
    });
  }
  return out;
}
