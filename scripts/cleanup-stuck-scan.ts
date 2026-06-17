import { pathToFileURL } from "node:url";
import type { DocumentReference, Firestore, Query } from "firebase-admin/firestore";
import { config as loadEnv } from "dotenv";
import {
  clampUsageDecrement,
  cleanupDayKey,
  cleanupMonthKey,
  parseCleanupArgs,
  scanHostMatches,
  type CleanupCliArgs,
} from "@/lib/data/cleanup-stuck-scan-utils";

loadEnv({
  path: process.env.DOTENV_CONFIG_PATH ?? process.env.dotenv_config_path ?? ".env.local",
});

interface ScanCandidate {
  workspaceId: string;
  userId: string;
  scanId: string;
  baseUrl: string;
  status: string | null;
  progressStep: string | null;
  createdAt: Date | null;
  completedAt: Date | null;
  pagesScanned: number;
}

interface CleanupPlan {
  scan: ScanCandidate;
  counts: Record<string, number>;
}

let dbPromise: Promise<Firestore> | null = null;

async function initDb(): Promise<Firestore> {
  if (dbPromise) return dbPromise;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  }
  dbPromise = Promise.all([
    import("firebase-admin/app"),
    import("firebase-admin/firestore"),
  ]).then(([app, firestore]) => {
    if (!app.getApps().length) {
      app.initializeApp({ credential: app.cert({ projectId, clientEmail, privateKey }) });
    }
    return firestore.getFirestore();
  });
  return dbPromise;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

async function findCandidates(args: CleanupCliArgs): Promise<ScanCandidate[]> {
  const db = await initDb();
  const users = await db.collection("users").where("email", "==", args.email).limit(10).get();
  const candidates: ScanCandidate[] = [];

  for (const user of users.docs) {
    const userData = user.data();
    const workspaceIds = new Set<string>();
    if (typeof userData.currentWorkspaceId === "string") {
      workspaceIds.add(userData.currentWorkspaceId);
    }
    const memberships = await db
      .collectionGroup("members")
      .where("userId", "==", user.id)
      .where("status", "==", "active")
      .get();
    memberships.docs.forEach((doc) => {
      const workspaceId = doc.ref.parent.parent?.id;
      if (workspaceId) workspaceIds.add(workspaceId);
    });

    for (const workspaceId of workspaceIds) {
      const scans = await db
        .collection("workspaces")
        .doc(workspaceId)
        .collection("scans")
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();
      scans.docs.forEach((doc) => {
        const data = doc.data();
        const baseUrl = String(data.baseUrl ?? "");
        if (!scanHostMatches(baseUrl, args.host)) return;
        candidates.push({
          workspaceId,
          userId: user.id,
          scanId: doc.id,
          baseUrl,
          status: typeof data.status === "string" ? data.status : null,
          progressStep: typeof data.progressStep === "string" ? data.progressStep : null,
          createdAt: asDate(data.createdAt),
          completedAt: asDate(data.completedAt),
          pagesScanned: Number(data.pagesScanned ?? 0),
        });
      });
    }
  }

  return candidates;
}

async function countQuery(query: Query): Promise<number> {
  const snap = await query.get();
  return snap.size;
}

async function buildCleanupPlan(scan: ScanCandidate): Promise<CleanupPlan> {
  const db = await initDb();
  const scanRef = db
    .collection("workspaces")
    .doc(scan.workspaceId)
    .collection("scans")
    .doc(scan.scanId);
  const reports = await db
    .collection("workspaces")
    .doc(scan.workspaceId)
    .collection("reports")
    .where("scanJobId", "==", scan.scanId)
    .get();
  const shareTokens = reports.docs
    .map((doc) => doc.data().publicShareToken)
    .filter((token): token is string => typeof token === "string" && token.length > 0);

  return {
    scan,
    counts: {
      scanDocs: (await scanRef.get()).exists ? 1 : 0,
      pages: await countQuery(scanRef.collection("pages")),
      issues: await countQuery(scanRef.collection("issues")),
      groups: await countQuery(scanRef.collection("groups")),
      meta: await countQuery(scanRef.collection("meta")),
      visualEvidence: await countQuery(
        db.collection("visualEvidence").where("scanJobId", "==", scan.scanId)
      ),
      remediationTasks: await countQuery(
        db
          .collection("workspaces")
          .doc(scan.workspaceId)
          .collection("remediationTasks")
          .where("scanJobId", "==", scan.scanId)
      ),
      reports: reports.size,
      publicReportShares: shareTokens.length,
      auditLogs: await countQuery(db.collection("auditLogs").where("resourceId", "==", scan.scanId)),
    },
  };
}

async function deleteRefs(refs: DocumentReference[]): Promise<void> {
  const db = await initDb();
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function collectCleanupRefs(scan: ScanCandidate): Promise<DocumentReference[]> {
  const db = await initDb();
  const scanRef = db
    .collection("workspaces")
    .doc(scan.workspaceId)
    .collection("scans")
    .doc(scan.scanId);
  const refs: DocumentReference[] = [];

  for (const name of ["pages", "issues", "groups", "meta"] as const) {
    const snap = await scanRef.collection(name).get();
    snap.docs.forEach((doc) => refs.push(doc.ref));
  }

  const visualEvidence = await db
    .collection("visualEvidence")
    .where("scanJobId", "==", scan.scanId)
    .get();
  visualEvidence.docs.forEach((doc) => refs.push(doc.ref));

  const remediationTasks = await db
    .collection("workspaces")
    .doc(scan.workspaceId)
    .collection("remediationTasks")
    .where("scanJobId", "==", scan.scanId)
    .get();
  remediationTasks.docs.forEach((doc) => refs.push(doc.ref));

  const reports = await db
    .collection("workspaces")
    .doc(scan.workspaceId)
    .collection("reports")
    .where("scanJobId", "==", scan.scanId)
    .get();
  for (const report of reports.docs) {
    const token = report.data().publicShareToken;
    if (typeof token === "string" && token) {
      refs.push(db.collection("publicReportShares").doc(token));
    }
    refs.push(report.ref);
  }

  const auditLogs = await db.collection("auditLogs").where("resourceId", "==", scan.scanId).get();
  auditLogs.docs
    .filter((doc) => doc.data().workspaceId === scan.workspaceId)
    .forEach((doc) => refs.push(doc.ref));

  refs.push(scanRef);
  return refs;
}

async function rollbackUsage(scan: ScanCandidate): Promise<void> {
  if (!scan.createdAt) return;
  const db = await initDb();
  const usageRef = db
    .collection("workspaces")
    .doc(scan.workspaceId)
    .collection("usage")
    .doc("current");
  const systemRef = db.collection("systemUsage").doc(cleanupDayKey(scan.createdAt));
  const today = new Date();

  await db.runTransaction(async (tx) => {
    const [usageSnap, systemSnap] = await Promise.all([tx.get(usageRef), tx.get(systemRef)]);
    const usage = usageSnap.data() ?? {};
    const patch: Record<string, unknown> = { updatedAt: today };
    if (cleanupDayKey(scan.createdAt!) === cleanupDayKey(today)) {
      patch.scansUsedToday = clampUsageDecrement(usage.scansUsedToday, 1);
    }
    if (cleanupMonthKey(scan.createdAt!) === cleanupMonthKey(today)) {
      patch.scansUsedThisMonth = clampUsageDecrement(usage.scansUsedThisMonth, 1);
      patch.pagesScannedThisMonth = clampUsageDecrement(usage.pagesScannedThisMonth, scan.pagesScanned);
    }
    tx.set(usageRef, patch, { merge: true });

    const system = systemSnap.data();
    if (system) {
      tx.set(
        systemRef,
        {
          scansStarted: clampUsageDecrement(system.scansStarted, 1),
          updatedAt: today,
        },
        { merge: true }
      );
    }
  });
}

async function run(args: CleanupCliArgs): Promise<void> {
  const candidates = await findCandidates(args);
  if (!candidates.length) {
    console.log(JSON.stringify({ ok: true, matches: [] }, null, 2));
    return;
  }

  const plans = await Promise.all(candidates.map(buildCleanupPlan));
  if (args.dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, matches: plans }, null, 2));
    return;
  }

  const target = plans.find((plan) => plan.scan.scanId === args.confirmScanId);
  if (!target) {
    throw new Error(`--confirm scan id not found in ${args.email}/${args.host} matches`);
  }

  const refs = await collectCleanupRefs(target.scan);
  await deleteRefs(refs);
  await rollbackUsage(target.scan);
  console.log(
    JSON.stringify(
      {
        ok: true,
        deletedScanId: target.scan.scanId,
        deletedRefs: refs.length,
        previousCounts: target.counts,
      },
      null,
      2
    )
  );
}

const entryArgIndex = process.argv.findIndex((arg) =>
  arg.endsWith("scripts/cleanup-stuck-scan.ts") || arg.endsWith("cleanup-stuck-scan.ts")
);

if (
  entryArgIndex >= 0 &&
  import.meta.url === pathToFileURL(process.argv[entryArgIndex]).href
) {
  const args = parseCleanupArgs(process.argv.slice(entryArgIndex + 1));
  const timeout = setTimeout(() => {
    console.error(`cleanup timed out after ${args.timeoutMs}ms`);
    process.exit(2);
  }, args.timeoutMs);
  void run(args)
    .catch((err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    })
    .finally(() => clearTimeout(timeout));
}
