/**
 * Same as admin-clear-scan-data.ts, but authenticates with the local Firebase
 * CLI login through Application Default Credentials instead of a
 * FIREBASE_PRIVATE_KEY service-account secret. Lets an operator clear an
 * account's scan data without provisioning production service-account creds
 * locally.
 *
 * The default admin app is pre-initialized here with the CLI credential, so
 * `firebaseAdminApp()` (which returns the existing app if one exists) and the
 * shared deletion machinery run unchanged.
 *
 *   npx tsx scripts/admin-clear-scan-data-cli.ts --email user@example.com          # dry-run report
 *   npx tsx scripts/admin-clear-scan-data-cli.ts --email user@example.com --apply  # delete + verify
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";

// Public desktop-app OAuth client baked into open-source firebase-tools.
const CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "accessops-720e4";

function cliRefreshToken(): string {
  const cfgPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
  if (!fs.existsSync(cfgPath)) {
    throw new Error(`No firebase CLI config at ${cfgPath} — run \`firebase login\` first.`);
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const rt = cfg?.tokens?.refresh_token;
  if (!rt) throw new Error("No firebase CLI refresh token — run `firebase login` first.");
  return rt;
}

function configureFirebaseCliAdc(): () => void {
  // Firestore does not accept firebase-admin's refreshToken() credential. The
  // Google client libraries do accept an authorized-user ADC file, so expose
  // the Firebase CLI login through ADC for the lifetime of this process.
  const refreshToken = cliRefreshToken();
  const previousCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const previousProject = process.env.GOOGLE_CLOUD_PROJECT;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "accessops-firebase-adc-"));
  const credentialPath = path.join(tempDir, "application_default_credentials.json");
  fs.writeFileSync(
    credentialPath,
    JSON.stringify({
      type: "authorized_user",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      quota_project_id: PROJECT_ID,
    }),
    { mode: 0o600 }
  );
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
  process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;

  return () => {
    if (previousCredentials === undefined) {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    } else {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = previousCredentials;
    }
    if (previousProject === undefined) {
      delete process.env.GOOGLE_CLOUD_PROJECT;
    } else {
      process.env.GOOGLE_CLOUD_PROJECT = previousProject;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf("--email");
  const email = emailIdx >= 0 ? args[emailIdx + 1] : null;
  const apply = args.includes("--apply");
  if (!email) {
    console.error("Usage: tsx scripts/admin-clear-scan-data-cli.ts --email <email> [--apply]");
    process.exit(1);
  }

  const cleanupAdc = configureFirebaseCliAdc();
  try {
    if (!getApps().length) {
      initializeApp({
        credential: applicationDefault(),
        projectId: PROJECT_ID,
      });
    }

    // Imported after the app exists so the shared helpers reuse it.
    const { firebaseAdminAuth } = await import("@/lib/firebase/admin");
    const { getWorkspaceContext, listScans } = await import("@/lib/data/firestore");
    const { claimDataDeletionJob, createDataDeletionJob, runDataDeletionJob } = await import(
      "@/lib/data/deletion"
    );

    const user = await firebaseAdminAuth().getUserByEmail(email);
    const ctx = await getWorkspaceContext(user.uid);
    if (!ctx) {
      throw new Error(`No workspace found for ${email} (uid ${user.uid}).`);
    }
    const workspaceId = ctx.workspace.id;
    console.log(`Project:   ${PROJECT_ID}`);
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

    const { job } = await createDataDeletionJob({ workspaceId, requestedBy: user.uid });
    const claimed = await claimDataDeletionJob(job.id, "admin-cli");
    if (!claimed) {
      throw new Error(`Deletion job ${job.id} could not be claimed (status: ${job.status}).`);
    }
    const finished = await runDataDeletionJob(claimed);
    console.log(`\nDeletion job ${finished.id}: ${finished.status}`);
    console.log(`Verified at: ${finished.verifiedAt?.toISOString() ?? "NOT VERIFIED"}`);
    console.log("Deleted:", JSON.stringify(finished.deletedCounts, null, 2));

    const remaining = await listScans(workspaceId, 10);
    console.log(`Remaining scans: ${remaining.length}`);
  } finally {
    cleanupAdc();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
