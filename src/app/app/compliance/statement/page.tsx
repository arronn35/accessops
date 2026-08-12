import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { getPrivacySettings, listScans } from "@/lib/data/firestore";
import { StatementClient } from "./statement-client";

export const metadata = { title: "Accessibility Statement — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function StatementPage() {
  const ctx = await getCurrentWorkspaceOrRedirect();
  const privacy = await getPrivacySettings(ctx.workspace.id);
  const scans = await listScans(ctx.workspace.id, 20);
  const latestScan = scans.find((s) => s.status === "completed") ?? null;

  return (
    <StatementClient
      workspace={ctx.workspace}
      privacy={privacy}
      latestScan={latestScan}
    />
  );
}
