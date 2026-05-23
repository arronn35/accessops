import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scanJobs } from "@/lib/db/schema";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
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

  const [job] = await db
    .select()
    .from(scanJobs)
    .where(and(eq(scanJobs.id, id), eq(scanJobs.workspaceId, ctx.workspace.id)))
    .limit(1);

  if (!job) {
    redirect("/app");
  }

  // If the scan already completed by the time the user lands here, fast-skip.
  if (job.status === "completed") {
    redirect(`/app/scans/${id}`);
  }

  return <ProgressClient initial={job} />;
}
