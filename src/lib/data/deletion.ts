/**
 * Workspace scan-data deletion.
 *
 * Two consumers:
 *   1. `POST /api/privacy/delete-scan-data` creates a tracked `DataDeletionJob`
 *      (202). The browser worker claims it from the `dataDeletionJobs`
 *      collection and runs `runDataDeletionJob`, which deletes every scan,
 *      page, issue, group, summary, visual-evidence record, report (with its
 *      public share), and scan-linked remediation task in the workspace, then
 *      verifies via count queries that nothing remains before reporting
 *      success.
 *   2. The daily data-retention cron calls `purgeExpiredScanData`, which
 *      applies each workspace's `scanDataRetentionDays` to old scans and
 *      sweeps visual evidence past its `expiresAt`.
 *
 * Deletes run in chunked batches (Firestore caps batches at 500 ops).
 */
import { FieldPath, Timestamp, type Query } from "firebase-admin/firestore";
import { firestore } from "@/lib/firebase/admin";
import { audit, getPrivacySettings, readDoc, stripUndefined } from "./firestore";
import { WORKER_STALE_RUNNING_MS } from "./scan-lifecycle";
import type { DataDeletionJob, PrivacySettings, Report } from "./types";

const DELETE_CHUNK_SIZE = 300;
/** Re-delete passes when verification finds residue from in-flight writers. */
const MAX_VERIFY_PASSES = 3;
const RECLAIM_ATTEMPT_LIMIT = 3;

function db() {
  return firestore();
}

function now(): Date {
  return new Date();
}

function jobsCollection() {
  return db().collection("dataDeletionJobs");
}

function workspaceRef(workspaceId: string) {
  return db().collection("workspaces").doc(workspaceId);
}

export interface DeletionCounts extends Record<string, number> {
  scans: number;
  pages: number;
  issues: number;
  groups: number;
  summaries: number;
  visualEvidence: number;
  reports: number;
  reportShares: number;
  remediationTasks: number;
}

function emptyCounts(): DeletionCounts {
  return {
    scans: 0,
    pages: 0,
    issues: 0,
    groups: 0,
    summaries: 0,
    visualEvidence: 0,
    reports: 0,
    reportShares: 0,
    remediationTasks: 0,
  };
}

/** Repeatedly query + batch-delete until the query returns nothing. */
async function deleteQueryDocs(query: Query): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snap = await query.limit(DELETE_CHUNK_SIZE).get();
    if (snap.empty) return deleted;
    const batch = db().batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    deleted += snap.size;
    if (snap.size < DELETE_CHUNK_SIZE) return deleted;
  }
}

async function countQuery(query: Query): Promise<number> {
  const snap = await query.count().get();
  return snap.data().count;
}

/**
 * Delete one scan and everything hanging off it: result subcollections,
 * visual evidence, and the scan document itself.
 */
export async function deleteScanCompletely(
  workspaceId: string,
  scanId: string
): Promise<DeletionCounts> {
  const counts = emptyCounts();
  const scanRef = workspaceRef(workspaceId).collection("scans").doc(scanId);

  counts.pages = await deleteQueryDocs(scanRef.collection("pages"));
  counts.issues = await deleteQueryDocs(scanRef.collection("issues"));
  counts.groups = await deleteQueryDocs(scanRef.collection("groups"));
  counts.summaries = await deleteQueryDocs(scanRef.collection("meta"));
  counts.visualEvidence = await deleteQueryDocs(
    db()
      .collection("visualEvidence")
      .where("workspaceId", "==", workspaceId)
      .where("scanJobId", "==", scanId)
  );
  await scanRef.delete();
  counts.scans = 1;
  return counts;
}

function addCounts(into: DeletionCounts, from: Partial<DeletionCounts>): void {
  for (const [key, value] of Object.entries(from)) {
    if (typeof value === "number") into[key] = (into[key] ?? 0) + value;
  }
}

/**
 * Stop in-flight scans so the scan worker does not write results back into
 * collections we are about to delete.
 */
async function cancelActiveScans(workspaceId: string): Promise<void> {
  const snap = await workspaceRef(workspaceId)
    .collection("scans")
    .where("status", "in", ["queued", "running"])
    .get();
  if (snap.empty) return;
  const at = now();
  const batch = db().batch();
  for (const doc of snap.docs) {
    batch.set(
      doc.ref,
      {
        status: "failed",
        progressStep: "failed",
        completedAt: at,
        errorMessage: "workspace_scan_data_deleted",
        updatedAt: at,
      },
      { merge: true }
    );
  }
  await batch.commit();
}

async function deleteWorkspaceScanData(workspaceId: string): Promise<DeletionCounts> {
  const counts = emptyCounts();

  await cancelActiveScans(workspaceId);

  // Scans + per-scan artifacts.
  for (;;) {
    const snap = await workspaceRef(workspaceId)
      .collection("scans")
      .limit(DELETE_CHUNK_SIZE)
      .select(FieldPath.documentId())
      .get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      addCounts(counts, await deleteScanCompletely(workspaceId, doc.id));
    }
  }

  // Visual evidence not tied to a still-existing scan (orphans, legacy rows).
  counts.visualEvidence += await deleteQueryDocs(
    db().collection("visualEvidence").where("workspaceId", "==", workspaceId)
  );

  // Reports, revoking public shares first so tokens stop resolving.
  for (;;) {
    const snap = await workspaceRef(workspaceId)
      .collection("reports")
      .limit(DELETE_CHUNK_SIZE)
      .get();
    if (snap.empty) break;
    const batch = db().batch();
    for (const doc of snap.docs) {
      const report = readDoc<Report>(doc.id, doc.data());
      if (report?.publicShareToken) {
        batch.delete(db().collection("publicReportShares").doc(report.publicShareToken));
        counts.reportShares += 1;
      }
      batch.delete(doc.ref);
      counts.reports += 1;
    }
    await batch.commit();
    if (snap.size < DELETE_CHUNK_SIZE) break;
  }

  // Remediation tasks generated from scans. Manually created tasks
  // (scanJobId == null) carry no scan content and are kept. Firestore cannot
  // query `!= null`, so filter in memory.
  counts.remediationTasks += await deleteScanLinkedRemediationTasks(workspaceId);

  return counts;
}

async function listScanLinkedRemediationTaskRefs(workspaceId: string) {
  const snap = await workspaceRef(workspaceId).collection("remediationTasks").get();
  return snap.docs.filter((doc) => doc.get("scanJobId") != null).map((doc) => doc.ref);
}

async function deleteScanLinkedRemediationTasks(workspaceId: string): Promise<number> {
  const refs = await listScanLinkedRemediationTaskRefs(workspaceId);
  for (let i = 0; i < refs.length; i += DELETE_CHUNK_SIZE) {
    const batch = db().batch();
    for (const ref of refs.slice(i, i + DELETE_CHUNK_SIZE)) batch.delete(ref);
    await batch.commit();
  }
  return refs.length;
}

/** True when every scan-data collection for the workspace is empty. */
async function verifyWorkspaceScanDataDeleted(workspaceId: string): Promise<boolean> {
  const [scans, evidence, reports, taskRefs] = await Promise.all([
    countQuery(workspaceRef(workspaceId).collection("scans")),
    countQuery(db().collection("visualEvidence").where("workspaceId", "==", workspaceId)),
    countQuery(workspaceRef(workspaceId).collection("reports")),
    listScanLinkedRemediationTaskRefs(workspaceId),
  ]);
  return scans === 0 && evidence === 0 && reports === 0 && taskRefs.length === 0;
}

export async function createDataDeletionJob(input: {
  workspaceId: string;
  requestedBy: string;
}): Promise<{ job: DataDeletionJob; created: boolean }> {
  // Idempotent: one pending deletion per workspace at a time.
  const pending = await jobsCollection()
    .where("workspaceId", "==", input.workspaceId)
    .where("status", "in", ["queued", "running"])
    .limit(1)
    .get();
  if (!pending.empty) {
    const doc = pending.docs[0];
    return { job: readDoc<DataDeletionJob>(doc.id, doc.data())!, created: false };
  }

  const jobId = crypto.randomUUID();
  const at = now();
  const job: DataDeletionJob = {
    id: jobId,
    workspaceId: input.workspaceId,
    scope: "all_scan_data",
    status: "queued",
    requestedBy: input.requestedBy,
    claimedBy: null,
    attempts: 0,
    startedAt: null,
    heartbeatAt: null,
    completedAt: null,
    deletedCounts: null,
    verifiedAt: null,
    error: null,
    createdAt: at,
    updatedAt: at,
  };
  await jobsCollection().doc(jobId).set(job);
  return { job, created: true };
}

export async function getDataDeletionJob(
  workspaceId: string,
  jobId: string
): Promise<DataDeletionJob | null> {
  const snap = await jobsCollection().doc(jobId).get();
  const job = readDoc<DataDeletionJob>(snap.id, snap.data());
  if (!job || job.workspaceId !== workspaceId) return null;
  return job;
}

export async function getLatestDataDeletionJob(
  workspaceId: string
): Promise<DataDeletionJob | null> {
  const snap = await jobsCollection()
    .where("workspaceId", "==", workspaceId)
    .limit(50)
    .get();
  const jobs = snap.docs
    .map((d) => readDoc<DataDeletionJob>(d.id, d.data())!)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return jobs[0] ?? null;
}

function isDeletionJobStale(job: DataDeletionJob, at = Date.now()): boolean {
  if (job.status !== "running") return false;
  const reference =
    job.heartbeatAt ?? job.startedAt ?? job.updatedAt ?? job.createdAt ?? null;
  if (!reference) return true;
  return at - reference.getTime() > WORKER_STALE_RUNNING_MS;
}

/**
 * Deletion jobs the worker should pick up: queued ones plus running ones
 * whose heartbeat went stale (worker crashed mid-delete).
 */
export async function listClaimableDataDeletionJobs(
  limit = 1
): Promise<DataDeletionJob[]> {
  const queued = await jobsCollection()
    .where("status", "==", "queued")
    .limit(Math.max(limit * 5, 10))
    .get();
  const out = queued.docs
    .map((d) => readDoc<DataDeletionJob>(d.id, d.data())!)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (out.length < limit) {
    const running = await jobsCollection()
      .where("status", "==", "running")
      .limit(25)
      .get();
    out.push(
      ...running.docs
        .map((d) => readDoc<DataDeletionJob>(d.id, d.data())!)
        .filter((job) => isDeletionJobStale(job))
    );
  }
  return out.slice(0, limit);
}

/**
 * Atomically claim a deletion job. Mirrors `claimScanJob`: succeeds only when
 * the job is queued or running-but-stale; stale jobs that already burned
 * through the reclaim budget are marked failed instead.
 */
export async function claimDataDeletionJob(
  jobId: string,
  workerId: string
): Promise<DataDeletionJob | null> {
  const ref = jobsCollection().doc(jobId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<DataDeletionJob>(snap.id, snap.data());
    if (!job) return null;

    const claimable =
      job.status === "queued" || (job.status === "running" && isDeletionJobStale(job));
    if (!claimable) return null;

    const at = now();
    if (job.status === "running" && job.attempts >= RECLAIM_ATTEMPT_LIMIT) {
      tx.set(
        ref,
        {
          status: "failed",
          error: "deletion_worker_heartbeat_stale",
          completedAt: at,
          updatedAt: at,
        },
        { merge: true }
      );
      return null;
    }

    const attempts = job.attempts + 1;
    tx.set(
      ref,
      stripUndefined({
        status: "running",
        claimedBy: workerId,
        attempts,
        startedAt: job.startedAt ?? at,
        heartbeatAt: at,
        error: null,
        updatedAt: at,
      } as Record<string, unknown>),
      { merge: true }
    );
    return { ...job, status: "running", claimedBy: workerId, attempts, heartbeatAt: at };
  });
}

export async function touchDataDeletionJob(jobId: string): Promise<void> {
  await jobsCollection()
    .doc(jobId)
    .set({ heartbeatAt: now(), updatedAt: now() }, { merge: true });
}

/**
 * Execute a claimed deletion job. Deletes, then verifies with count queries;
 * re-runs the delete pass when verification finds residue (e.g. a racing
 * writer). Only a verified-empty workspace is reported as completed.
 */
export async function runDataDeletionJob(job: DataDeletionJob): Promise<DataDeletionJob> {
  const ref = jobsCollection().doc(job.id);
  const counts = emptyCounts();
  try {
    let verified = false;
    for (let pass = 0; pass < MAX_VERIFY_PASSES && !verified; pass++) {
      addCounts(counts, await deleteWorkspaceScanData(job.workspaceId));
      verified = await verifyWorkspaceScanDataDeleted(job.workspaceId);
    }
    if (!verified) {
      throw new Error("verification_failed_after_retries");
    }

    const at = now();
    await ref.set(
      {
        status: "completed",
        completedAt: at,
        deletedCounts: counts,
        verifiedAt: at,
        error: null,
        updatedAt: at,
      },
      { merge: true }
    );
    await audit({
      userId: job.requestedBy,
      workspaceId: job.workspaceId,
      action: "privacy.all_scans_deleted",
      resourceType: "workspace",
      resourceId: job.workspaceId,
      metadata: { deletionJobId: job.id, deletedCounts: counts },
    });
    return (await getDataDeletionJob(job.workspaceId, job.id))!;
  } catch (err) {
    const at = now();
    await ref.set(
      {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        completedAt: at,
        deletedCounts: counts,
        updatedAt: at,
      },
      { merge: true }
    );
    throw err;
  }
}

export interface RetentionSweepResult {
  workspacesProcessed: number;
  scansDeleted: number;
  evidenceDeleted: number;
}

/**
 * Daily retention sweep: delete scans older than each workspace's
 * `scanDataRetentionDays` and visual evidence past its own `expiresAt`.
 */
export async function purgeExpiredScanData(): Promise<RetentionSweepResult> {
  const result: RetentionSweepResult = {
    workspacesProcessed: 0,
    scansDeleted: 0,
    evidenceDeleted: 0,
  };

  const workspaces = await db().collection("workspaces").select(FieldPath.documentId()).get();
  for (const doc of workspaces.docs) {
    const workspaceId = doc.id;
    result.workspacesProcessed += 1;

    const privacy: PrivacySettings = await getPrivacySettings(workspaceId);
    const retentionDays = Math.max(1, privacy.scanDataRetentionDays || 365);
    const cutoff = Timestamp.fromMillis(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const expired = await workspaceRef(workspaceId)
      .collection("scans")
      .where("createdAt", "<", cutoff)
      .select(FieldPath.documentId())
      .get();
    if (expired.empty) continue;

    let scansDeleted = 0;
    for (const scanDoc of expired.docs) {
      const counts = await deleteScanCompletely(workspaceId, scanDoc.id);
      scansDeleted += counts.scans;
      result.evidenceDeleted += counts.visualEvidence;
    }
    result.scansDeleted += scansDeleted;

    await audit({
      userId: null,
      workspaceId,
      action: "privacy.retention_purge",
      resourceType: "workspace",
      resourceId: workspaceId,
      metadata: { scansDeleted, retentionDays },
    });
  }

  // Visual evidence carries its own expiry, independent of scan retention.
  result.evidenceDeleted += await deleteQueryDocs(
    db().collection("visualEvidence").where("expiresAt", "<", Timestamp.fromDate(now()))
  );

  return result;
}
