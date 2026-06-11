/**
 * Admin CLI: clear all scan data for one account's workspace.
 *
 * Uses the same tracked-deletion machinery as POST /api/privacy/delete-scan-data
 * (create → claim → run with post-delete verification), so the cleanup is
 * identical to what the worker would execute, including cancelling stuck
 * queued/running scans before deleting them and writing an audit entry.
 *
 *   npx tsx scripts/admin-clear-scan-data.ts --email user@example.com          # dry-run report
 *   npx tsx scripts/admin-clear-scan-data.ts --email user@example.com --apply  # delete + verify
 */
import { config as loadEnv } from "dotenv";

loadEnv({
  path: process.env.DOTENV_CONFIG_PATH ?? ".env.local",
});

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf("--email");
  const email = emailIdx >= 0 ? args[emailIdx + 1] : null;
  const apply = args.includes("--apply");
  if (!email) {
    console.error("Usage: tsx scripts/admin-clear-scan-data.ts --email <email> [--apply]");
    process.exit(1);
  }

  // Imported lazily so dotenv runs before the Admin SDK reads env.
  const { firebaseAdminAuth } = await import("@/lib/firebase/admin");
  const { getWorkspaceContext, listScans } = await import("@/lib/data/firestore");
  const { claimDataDeletionJob, createDataDeletionJob, runDataDeletionJob } = await import(
    "@/lib/data/deletion"
  );

  const user = await firebaseAdminAuth().getUserByEmail(email);
  const ctx = await getWorkspaceContext(user.uid);
  if (!ctx) {
    console.error(`No workspace found for ${email} (uid ${user.uid}).`);
    process.exit(1);
  }
  const workspaceId = ctx.workspace.id;
  console.log(`Account:   ${email} (uid ${user.uid})`);
  console.log(`Workspace: ${ctx.workspace.name} (${workspaceId})`);

  const scans = await listScans(workspaceId, 100);
  console.log(`\nScans (${scans.length}):`);
  for (const scan of scans) {
    console.log(
      `  ${scan.id}  ${String(scan.status).padEnd(9)}  ${scan.progressStep ?? "-"}  ${scan.baseUrl}  created ${scan.createdAt.toISOString()}`
    );
  }

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to delete all scan data.");
    return;
  }

  const { job } = await createDataDeletionJob({
    workspaceId,
    requestedBy: user.uid,
  });
  const claimed = await claimDataDeletionJob(job.id, "admin-cli");
  if (!claimed) {
    console.error(`Deletion job ${job.id} could not be claimed (status: ${job.status}).`);
    process.exit(1);
  }
  const finished = await runDataDeletionJob(claimed);
  console.log(`\nDeletion job ${finished.id}: ${finished.status}`);
  console.log(`Verified at: ${finished.verifiedAt?.toISOString() ?? "NOT VERIFIED"}`);
  console.log("Deleted:", JSON.stringify(finished.deletedCounts, null, 2));

  const remaining = await listScans(workspaceId, 10);
  console.log(`Remaining scans: ${remaining.length}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
