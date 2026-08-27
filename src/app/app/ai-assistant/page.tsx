import { AiAssistantClient, type AssistantResult, type AssistantScan } from "./ai-assistant-client";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { getLatestAssistantResults, listScans } from "@/lib/data/firestore";

export const metadata = { title: "AI fix assistant - Percevia AI" };
export const dynamic = "force-dynamic";

export default async function AiAssistantPage() {
  const ctx = await getCurrentWorkspaceOrRedirect();
  const scans = (await listScans(ctx.workspace.id, 50))
    .filter((scan) => scan.status === "completed")
    .map<AssistantScan>((scan) => ({
      id: scan.id,
      baseUrl: scan.baseUrl,
      projectId: scan.projectId ?? null,
      pagesScanned: scan.pagesScanned,
      completedAt: scan.completedAt?.toISOString() ?? null,
      aiRemediationEnabled: scan.aiRemediationEnabled,
      storeScreenshots: scan.storeScreenshots,
    }));

  // Restore the last generated plan per scan so returning to the page does
  // not require a new paid generation.
  const stored = await getLatestAssistantResults(
    ctx.workspace.id,
    scans.map((scan) => scan.id)
  );
  const initialResults: Record<string, AssistantResult> = {};
  for (const [scanId, record] of Object.entries(stored)) {
    initialResults[scanId] = {
      explanationPlain: record.explanationPlain,
      remediationSummary: record.remediationSummary,
      codeFixExample: record.codeFixExample,
      verification: record.verification,
      clientFriendlyExplanation: record.clientFriendlyExplanation,
      reactFix: record.reactFix,
      projectGuidance: record.projectGuidance,
      modelProvider: record.modelProvider,
      model: record.model,
      preset: record.preset,
      framework: record.framework,
      primaryIssueSnippet: record.primaryIssueSnippet,
      createdAt: record.createdAt.toISOString(),
    };
  }

  return (
    <AiAssistantClient
      scans={scans}
      workspaceName={ctx.workspace.name}
      initialResults={initialResults}
    />
  );
}
