import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Settings — AccessOps AI" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { workspace, member } = await getCurrentWorkspaceOrRedirect();
  const canEditWorkspace = member.role === "owner" || member.role === "admin";

  return (
    <SettingsClient
      workspace={{
        name: workspace.name,
        companyName: workspace.companyName,
        region: workspace.region,
        framework: workspace.framework,
        targetStandard: workspace.targetStandard,
      }}
      canEditWorkspace={canEditWorkspace}
    />
  );
}
