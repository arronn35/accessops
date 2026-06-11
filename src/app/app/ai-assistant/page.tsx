import { AiAssistantClient, type AssistantScan } from "./ai-assistant-client";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { listScans } from "@/lib/data/firestore";

export const metadata = { title: "AI fix assistant - AccessOps AI" };
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

  return <AiAssistantClient scans={scans} workspaceName={ctx.workspace.name} />;
}
