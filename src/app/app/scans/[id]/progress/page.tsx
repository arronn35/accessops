import { redirect } from "next/navigation";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { getScanJob } from "@/lib/data/firestore";
import { ProgressClient } from "./progress-client";

export const metadata = { title: "Scan running — AccessOps AI" };
export const dynamic = "force-dynamic";

export default async function ScanProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentWorkspaceOrRedirect();

  const job = await getScanJob(ctx.workspace.id, id);

  if (!job) {
    redirect("/app");
  }

  // If the scan already completed by the time the user lands here, fast-skip.
  if (job.status === "completed") {
    redirect(`/app/scans/${id}`);
  }

  return <ProgressClient initial={job} />;
}
