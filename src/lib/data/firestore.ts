import { createHash } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { firestore } from "@/lib/firebase/admin";
import {
  bootstrapEntitlementForEmail,
  scanCapsForPlan,
  type PlanTier,
  type WorkspaceRole,
} from "@/lib/entitlements";
import { projectFolderForScan } from "@/lib/remediation/project-folder";
import {
  isScanOwnedByWorker,
  isScanWorkerHeartbeatStale,
} from "./scan-lifecycle";
import {
  sweepScans,
  SWEEP_ERROR_MESSAGES,
  type SweepAction,
} from "./scan-sweeper";
import {
  PAGE_JOB_DEADLINE_MS,
  PAGE_JOB_MAX_ATTEMPTS,
  PAGE_JOB_STALE_MS,
  pageJobAttemptsExhausted,
  pageJobParentClaimDecision,
  planPageFinalize,
  sweepPageJobs,
  type PageJobSweepAction,
} from "./page-jobs";
import type {
  AccessibilityIssue,
  AiAssistantResultRecord,
  AiExplanationRecord,
  AuditLog,
  IssueGroup,
  Monitor,
  MonitorFrequency,
  PageJob,
  PrivacySettings,
  RemediationTask,
  Report,
  ScanJob,
  ScanPage,
  ScanPhase,
  ScanSummary,
  UsageLimits,
  User,
  VisualEvidence,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
} from "./types";

const MAX_PERSISTED_ISSUES_PER_SCAN = Number(
  process.env.MAX_PERSISTED_ISSUES_PER_SCAN ?? 100
);

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export interface WorkspaceContext {
  userId: string;
  user: User;
  workspace: Workspace;
  member: WorkspaceMember;
  privacy: PrivacySettings;
  limits: UsageLimits;
}

function db() {
  return firestore();
}

function id(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

function nextUtcMidnight(from = now()): Date {
  const d = new Date(from);
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

function nextMonth(from = now()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
}

function dayKey(date = now()): string {
  return date.toISOString().slice(0, 10);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  ) as T;
}

function convertDates(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(convertDates);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        convertDates(v),
      ])
    );
  }
  return value;
}

export function readDoc<T>(docId: string, data: DocumentData | undefined): T | null {
  if (!data) return null;
  return { id: docId, ...(convertDates(data) as Record<string, unknown>) } as T;
}

async function getDoc<T>(ref: DocumentReference): Promise<T | null> {
  const snap = await ref.get();
  return readDoc<T>(snap.id, snap.data());
}

function orderByCreatedDesc<T extends Query>(query: T): Query {
  return query.orderBy("createdAt", "desc");
}

export function defaultPrivacySettings(workspaceId: string): PrivacySettings {
  return {
    id: "settings",
    workspaceId,
    scanDataRetentionDays: 365,
    screenshotStorageEnabled: false,
    visualEvidenceEnabled: false,
    visualEvidenceRetentionDays: 30,
    aiProcessingEnabled: false,
    regionPreference: "eu",
    statementContactEmail: null,
    statementLimitations: null,
    statementPublished: false,
    updatedAt: now(),
  };
}

export function defaultUsageLimits(
  workspaceId: string,
  plan: PlanTier = "free"
): UsageLimits {
  return {
    id: "current",
    workspaceId,
    plan,
    scansUsedToday: 0,
    scansUsedThisMonth: 0,
    pagesScannedThisMonth: 0,
    aiRequestsThisMonth: 0,
    resetDailyAt: nextUtcMidnight(),
    resetMonthlyAt: nextMonth(),
  };
}

export async function ensureUserAndWorkspace(token: DecodedIdToken): Promise<WorkspaceContext> {
  const userRef = db().collection("users").doc(token.uid);
  const snap = await userRef.get();
  const email = token.email ?? `${token.uid}@firebase.local`;
  const displayName =
    (typeof token.name === "string" && token.name) ||
    (typeof token.firebase?.sign_in_provider === "string"
      ? email.split("@")[0]
      : null);

  if (!snap.exists) {
    const entitlement = bootstrapEntitlementForEmail(email);
    const workspaceId = id();
    const workspace: Workspace = {
      id: workspaceId,
      ownerUserId: token.uid,
      name: `${displayName || email.split("@")[0]}'s workspace`,
      companyName: null,
      region: "eu",
      framework: null,
      targetStandard: "wcag22aa",
      plan: entitlement.plan,
      createdAt: now(),
      updatedAt: now(),
    };
    const member: WorkspaceMember = {
      id: token.uid,
      workspaceId,
      userId: token.uid,
      role: entitlement.role,
      permissionsJson: null,
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    };
    const user: User = {
      id: token.uid,
      uid: token.uid,
      name: displayName,
      email,
      emailVerified: token.email_verified ? now() : null,
      image: typeof token.picture === "string" ? token.picture : null,
      fullName: displayName,
      currentWorkspaceId: workspaceId,
      createdAt: now(),
      updatedAt: now(),
    };
    const batch = db().batch();
    batch.set(userRef, stripUndefined({ ...user, uid: undefined }));
    batch.set(db().collection("workspaces").doc(workspaceId), workspace);
    batch.set(
      db().collection("workspaces").doc(workspaceId).collection("members").doc(token.uid),
      member
    );
    batch.set(
      db().collection("workspaces").doc(workspaceId).collection("privacy").doc("settings"),
      defaultPrivacySettings(workspaceId)
    );
    batch.set(
      db().collection("workspaces").doc(workspaceId).collection("usage").doc("current"),
      defaultUsageLimits(workspaceId, entitlement.plan)
    );
    await batch.commit();
  } else {
    await userRef.set(
      stripUndefined({
        name: displayName,
        email,
        emailVerified: token.email_verified ? now() : null,
        image: typeof token.picture === "string" ? token.picture : null,
        updatedAt: now(),
      }),
      { merge: true }
    );
  }

  const ctx = await getWorkspaceContext(token.uid);
  if (!ctx) throw new Error("workspace_bootstrap_failed");
  return ctx;
}

export async function getWorkspaceContext(userId: string): Promise<WorkspaceContext | null> {
  const user = await getDoc<User>(db().collection("users").doc(userId));
  if (!user) return null;

  let member: WorkspaceMember | null = null;
  if (user.currentWorkspaceId) {
    member = await getDoc<WorkspaceMember>(
      db()
        .collection("workspaces")
        .doc(user.currentWorkspaceId)
        .collection("members")
        .doc(userId)
    );
    if (member?.status !== "active") member = null;
  }

  const memberships = member
    ? null
    : await db()
    .collectionGroup("members")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .limit(1)
    .get();
  member = member ?? (memberships?.docs[0]
    ? readDoc<WorkspaceMember>(memberships.docs[0].id, memberships.docs[0].data())
    : null);
  if (!member) return null;

  const workspace = await getWorkspace(member.workspaceId);
  if (!workspace) return null;

  const privacy = await getPrivacySettings(workspace.id);
  const limits = await getUsageLimits(workspace.id, workspace.plan);
  return { userId, user, workspace, member, privacy, limits };
}

export async function getUser(userId: string): Promise<User | null> {
  return getDoc<User>(db().collection("users").doc(userId));
}

export async function setCurrentWorkspace(userId: string, workspaceId: string) {
  await db().collection("users").doc(userId).set(
    {
      currentWorkspaceId: workspaceId,
      updatedAt: now(),
    },
    { merge: true }
  );
}

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  return getDoc<Workspace>(db().collection("workspaces").doc(workspaceId));
}

export async function updateWorkspace(
  workspaceId: string,
  patch: Partial<Pick<Workspace, "name" | "companyName" | "framework" | "targetStandard" | "region" | "plan">>
) {
  await db()
    .collection("workspaces")
    .doc(workspaceId)
    .set(stripUndefined({ ...patch, updatedAt: now() }), { merge: true });
}

/**
 * Update billing-related workspace fields. Separate from updateWorkspace (which
 * is for user-editable profile fields) because this is written by the Polar
 * webhook, not the user — the client cannot reach it.
 */
export async function updateWorkspaceBilling(
  workspaceId: string,
  patch: Partial<
    Pick<
      Workspace,
      | "plan"
      | "polarCustomerId"
      | "polarSubscriptionId"
      | "subscriptionStatus"
      | "currentPeriodEnd"
    >
  >
): Promise<void> {
  await db()
    .collection("workspaces")
    .doc(workspaceId)
    .set(
      stripUndefined({ ...patch, updatedAt: now() } as Record<string, unknown>),
      { merge: true }
    );
}

/** Fallback workspace lookup for webhooks that only carry a Polar customer id. */
export async function findWorkspaceByPolarCustomerId(
  customerId: string
): Promise<Workspace | null> {
  const snap = await db()
    .collection("workspaces")
    .where("polarCustomerId", "==", customerId)
    .limit(1)
    .get();
  return snap.docs[0]
    ? readDoc<Workspace>(snap.docs[0].id, snap.docs[0].data())
    : null;
}

export async function getPrivacySettings(workspaceId: string): Promise<PrivacySettings> {
  const ref = db().collection("workspaces").doc(workspaceId).collection("privacy").doc("settings");
  const existing = await getDoc<PrivacySettings>(ref);
  if (existing) return existing;
  const settings = defaultPrivacySettings(workspaceId);
  await ref.set(settings);
  return settings;
}

export async function updatePrivacySettings(
  workspaceId: string,
  patch: Partial<Omit<PrivacySettings, "id" | "workspaceId" | "updatedAt">>
) {
  await db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("privacy")
    .doc("settings")
    .set(stripUndefined({ ...patch, updatedAt: now() }), { merge: true });
}

export async function getUsageLimits(
  workspaceId: string,
  plan: PlanTier = "free"
): Promise<UsageLimits> {
  const ref = db().collection("workspaces").doc(workspaceId).collection("usage").doc("current");
  const existing = await getDoc<UsageLimits>(ref);
  if (existing) return resetUsageIfNeeded(workspaceId, existing);
  const limits = defaultUsageLimits(workspaceId, plan);
  await ref.set(limits);
  return limits;
}

async function resetUsageIfNeeded(workspaceId: string, limits: UsageLimits): Promise<UsageLimits> {
  const patch: Partial<UsageLimits> = {};
  const current = now();
  if (current > limits.resetDailyAt) {
    patch.scansUsedToday = 0;
    patch.resetDailyAt = nextUtcMidnight(current);
  }
  if (current > limits.resetMonthlyAt) {
    patch.scansUsedThisMonth = 0;
    patch.pagesScannedThisMonth = 0;
    patch.aiRequestsThisMonth = 0;
    patch.resetMonthlyAt = nextMonth(current);
  }
  if (!Object.keys(patch).length) return limits;
  await db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("usage")
    .doc("current")
    .set(patch, { merge: true });
  return { ...limits, ...patch };
}

export async function reserveScanQuota(args: {
  workspaceId: string;
  plan: PlanTier;
  maxPages: number;
}): Promise<{ maxPages: number; usage: UsageLimits }> {
  const caps = scanCapsForPlan(args.plan);
  const globalCap = Number(process.env.FREE_GLOBAL_SCANS_PER_DAY ?? 50);
  const cappedPages = Math.min(args.maxPages, caps.maxPagesCap);
  const usageRef = db()
    .collection("workspaces")
    .doc(args.workspaceId)
    .collection("usage")
    .doc("current");
  const systemRef = db().collection("systemUsage").doc(dayKey());

  const usage = await db().runTransaction(async (tx) => {
    const usageSnap = await tx.get(usageRef);
    let current = readDoc<UsageLimits>(usageSnap.id, usageSnap.data()) ??
      defaultUsageLimits(args.workspaceId, args.plan);
    current = await resetUsageValues(current);

    const systemSnap = await tx.get(systemRef);
    const system = systemSnap.data() ?? {};
    const globalUsed = Number(system.scansStarted ?? 0);

    if (current.scansUsedToday >= caps.dailyScanCap) {
      throw new Error(`daily_workspace_capacity_reached:${caps.dailyScanCap}`);
    }
    if (globalUsed >= globalCap) {
      throw new Error(`daily_free_capacity_reached:${globalCap}`);
    }

    const nextUsage = {
      ...current,
      scansUsedToday: current.scansUsedToday + 1,
      scansUsedThisMonth: current.scansUsedThisMonth + 1,
    };
    tx.set(usageRef, nextUsage, { merge: true });
    tx.set(
      systemRef,
      {
        scansStarted: FieldValue.increment(1),
        updatedAt: now(),
      },
      { merge: true }
    );
    return nextUsage;
  });

  return { maxPages: cappedPages, usage };
}

function resetUsageValues(limits: UsageLimits): UsageLimits {
  const current = now();
  const next: Writeable<UsageLimits> = { ...limits };
  if (current > next.resetDailyAt) {
    next.scansUsedToday = 0;
    next.resetDailyAt = nextUtcMidnight(current);
  }
  if (current > next.resetMonthlyAt) {
    next.scansUsedThisMonth = 0;
    next.pagesScannedThisMonth = 0;
    next.aiRequestsThisMonth = 0;
    next.resetMonthlyAt = nextMonth(current);
  }
  return next;
}

export async function createScanJob(input: Partial<ScanJob> & {
  workspaceId: string;
  requestedBy: string;
  baseUrl: string;
}): Promise<ScanJob> {
  const scanId = input.id ?? id();
  const job: ScanJob = {
    id: scanId,
    workspaceId: input.workspaceId,
    projectId: input.projectId ?? null,
    requestedBy: input.requestedBy,
    scanType: input.scanType ?? "single",
    status: input.status ?? "queued",
    baseUrl: input.baseUrl,
    sourceUrlsJson: input.sourceUrlsJson ?? null,
    maxPages: input.maxPages ?? 3,
    pagesDiscovered: input.pagesDiscovered ?? 0,
    pagesScanned: input.pagesScanned ?? 0,
    includeScreenshots: input.includeScreenshots ?? false,
    storeScreenshots: input.storeScreenshots ?? false,
    visualEvidenceMaxScreenshots: input.visualEvidenceMaxScreenshots ?? 0,
    aiExplanationsEnabled: input.aiExplanationsEnabled ?? false,
    aiRemediationEnabled: input.aiRemediationEnabled ?? false,
    permissionConfirmed: input.permissionConfirmed ?? false,
    progressStep: input.progressStep ?? "queued",
    startedAt: input.startedAt ?? null,
    completedAt: input.completedAt ?? null,
    errorMessage: input.errorMessage ?? null,
    queueAttempts: input.queueAttempts ?? 0,
    lastQueuePublishedAt: input.lastQueuePublishedAt ?? null,
    processorStartedAt: input.processorStartedAt ?? null,
    processorHeartbeatAt: input.processorHeartbeatAt ?? null,
    processorError: input.processorError ?? null,
    claimedBy: input.claimedBy ?? null,
    timings: input.timings ?? null,
    reclaimAttempts: input.reclaimAttempts ?? 0,
    errorCode: input.errorCode ?? null,
    usePageJobs: input.usePageJobs ?? false,
    phase: input.phase ?? null,
    pagesDone: input.pagesDone ?? 0,
    pagesTotal: input.pagesTotal ?? 0,
    pagesFailed: input.pagesFailed ?? 0,
    currentUrl: input.currentUrl ?? null,
    currentStep: input.currentStep ?? input.progressStep ?? "queued",
    currentState: input.currentState ?? null,
    lastProgressAt: input.lastProgressAt ?? null,
    createdAt: input.createdAt ?? now(),
    updatedAt: input.updatedAt ?? now(),
  };
  await scanRef(input.workspaceId, scanId).set(job);
  return job;
}

function scanRef(workspaceId: string, scanId: string) {
  return db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("scans")
    .doc(scanId);
}

export async function getScanJob(
  workspaceId: string,
  scanId: string
): Promise<ScanJob | null> {
  return getDoc<ScanJob>(scanRef(workspaceId, scanId));
}

export async function findScanJob(scanId: string): Promise<ScanJob | null> {
  const snap = await db()
    .collectionGroup("scans")
    .where("id", "==", scanId)
    .limit(1)
    .get();
  return snap.docs[0] ? readDoc<ScanJob>(snap.docs[0].id, snap.docs[0].data()) : null;
}

export async function updateScanJob(
  workspaceId: string,
  scanId: string,
  patch: Partial<ScanJob>
) {
  await scanRef(workspaceId, scanId).set(
    stripUndefined({ ...patch, updatedAt: now() } as Record<string, unknown>),
    { merge: true }
  );
}

export async function listScans(workspaceId: string, limit = 20): Promise<ScanJob[]> {
  const snap = await orderByCreatedDesc(
    db().collection("workspaces").doc(workspaceId).collection("scans")
  )
    .limit(limit)
    .get();
  return snap.docs.map((d) => readDoc<ScanJob>(d.id, d.data())!);
}

export async function countInflightScans(
  workspaceId: string,
  excludeScanId?: string
): Promise<number> {
  const snap = await db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("scans")
    .where("status", "in", ["queued", "running"])
    .get();
  return snap.docs
    .filter((doc) => doc.id !== excludeScanId)
    .map((d) => readDoc<ScanJob>(d.id, d.data()))
    .filter((job): job is ScanJob => {
      if (!job) return false;
      if (job.status === "queued") return true;
      if (
        job.usePageJobs &&
        (job.phase === "scanning" || job.phase === "aggregating")
      ) {
        return true;
      }
      return job.status === "running" && !isScanWorkerHeartbeatStale(job);
    }).length;
}

export interface ClaimableScanRef {
  workspaceId: string;
  scanId: string;
}

function workspaceIdFromScanDoc(
  doc: QueryDocumentSnapshot
): string | null {
  // collectionGroup path: workspaces/{workspaceId}/scans/{scanId}
  return doc.ref.parent.parent?.id ?? null;
}

/**
 * Cross-workspace poll for queued jobs the browser worker should pick up.
 * Stale running jobs are returned to this queue exclusively by the sweeper,
 * so every reclaim increments reclaimAttempts and produces an audit event.
 *
 * Uses Firestore collection-group queries. The first run will throw a
 * FAILED_PRECONDITION error containing a console link to create the required
 * collection-group index on `scans` (status, createdAt) — create it once,
 * then polling works.
 */
export async function listClaimableScanRefs(limit = 5): Promise<ClaimableScanRef[]> {
  const out: ClaimableScanRef[] = [];
  const seen = new Set<string>();
  const add = (doc: QueryDocumentSnapshot) => {
    const workspaceId = workspaceIdFromScanDoc(doc);
    if (!workspaceId) return;
    const data = doc.data() as Partial<ScanJob>;
    const scanId = (data.id as string) ?? doc.id;
    const key = `${workspaceId}/${scanId}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ workspaceId, scanId });
  };

  const queued = await db()
    .collectionGroup("scans")
    .where("status", "==", "queued")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();
  queued.docs.forEach(add);

  return out.slice(0, limit);
}

/** A freshly claimed queued job. */
export interface ClaimedScanJob extends ScanJob {
  wasReclaimed: boolean;
}

/**
 * Atomically claim a queued scan for processing. Stale running jobs must first
 * pass through the sweeper so reclaim accounting and audit logging cannot be
 * bypassed. Returns null if another worker won the race.
 */
export async function claimScanJob(
  workspaceId: string,
  scanId: string,
  workerId: string
): Promise<ClaimedScanJob | null> {
  const ref = scanRef(workspaceId, scanId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<ScanJob>(snap.id, snap.data());
    if (!job) return null;

    if (job.status !== "queued") return null;

    const startedAt = now();
    const phase = job.usePageJobs ? "crawling" : job.phase ?? null;
    tx.set(
      ref,
      stripUndefined({
        status: "running",
        progressStep: job.storeScreenshots ? "starting_browser" : "crawling",
        phase,
        currentStep: job.usePageJobs ? "crawling" : job.currentStep,
        startedAt: job.startedAt ?? startedAt,
        processorStartedAt: startedAt,
        processorHeartbeatAt: startedAt,
        processorError: null,
        claimedBy: workerId,
        queueAttempts: job.queueAttempts ?? 0,
        timings: { claimedAt: startedAt },
        updatedAt: startedAt,
      } as Record<string, unknown>),
      { merge: true }
    );

    return {
      ...job,
      status: "running",
      startedAt: job.startedAt ?? startedAt,
      processorStartedAt: startedAt,
      processorHeartbeatAt: startedAt,
      processorError: null,
      claimedBy: workerId,
      phase,
      queueAttempts: job.queueAttempts ?? 0,
      timings: { ...(job.timings ?? {}), claimedAt: startedAt },
      wasReclaimed: false,
    };
  });
}

/**
 * Re-check a scan claim against the live document and refresh its heartbeat in
 * the same transaction. The write conflicts with a concurrent sweeper/claim,
 * so a stale worker cannot pass this gate using an old in-memory ScanJob.
 */
export async function renewOwnedScanClaim(
  workspaceId: string,
  scanId: string,
  workerId: string
): Promise<ScanJob | null> {
  const ref = scanRef(workspaceId, scanId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<ScanJob>(snap.id, snap.data());
    if (!isScanOwnedByWorker(job, workerId)) return null;

    const at = now();
    tx.set(
      ref,
      {
        processorHeartbeatAt: at,
        lastProgressAt: at,
        updatedAt: at,
      },
      { merge: true }
    );
    return {
      ...job,
      processorHeartbeatAt: at,
      lastProgressAt: at,
      updatedAt: at,
    };
  });
}

/**
 * Terminalize a scan only while the caller still owns its live running claim.
 * All terminal fields are committed together so a sweeper cancellation/failure
 * or a newer worker claim turns a stale completion into a no-op.
 */
export async function finalizeOwnedScanJob(
  workspaceId: string,
  scanId: string,
  workerId: string,
  patch: Partial<ScanJob> & { status: "completed" | "failed" }
): Promise<boolean> {
  const ref = scanRef(workspaceId, scanId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<ScanJob>(snap.id, snap.data());
    if (!isScanOwnedByWorker(job, workerId)) return false;

    tx.set(
      ref,
      stripUndefined({
        ...patch,
        claimedBy: null,
        updatedAt: patch.updatedAt ?? now(),
      } as Record<string, unknown>),
      { merge: true }
    );
    return true;
  });
}

/**
 * Snapshot of all non-terminal scan jobs across workspaces for the sweeper.
 * This deliberately does not cap results: repeatedly reading only the first
 * page could leave later running jobs outside the watchdog forever.
 */
export async function listSweepableScans(): Promise<ScanJob[]> {
  const [queued, running] = await Promise.all([
    db().collectionGroup("scans").where("status", "==", "queued").get(),
    db().collectionGroup("scans").where("status", "==", "running").get(),
  ]);

  const out: ScanJob[] = [];
  for (const doc of [...queued.docs, ...running.docs]) {
    const job = readDoc<ScanJob>(doc.id, doc.data());
    if (!job) continue;
    // Trust the document path for workspaceId over the stored field.
    const workspaceId = doc.ref.parent.parent?.id ?? job.workspaceId;
    out.push({ ...job, workspaceId });
  }
  return out;
}

/**
 * Apply one sweeper action inside a transaction. The predicate is re-derived
 * from the live document (`sweepScans` on the fresh snapshot), so a stale
 * snapshot, a concurrent sweeper, or a worker that resumed heartbeating all
 * degrade to a no-op. Returns true only if the transition was written.
 */
export async function applySweepAction(action: SweepAction): Promise<boolean> {
  const ref = scanRef(action.workspaceId, action.scanId);
  const auditRef = db().collection("auditLogs").doc();
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<ScanJob>(snap.id, snap.data());
    if (!job) return false;

    const ts = now();
    const [fresh] = sweepScans(ts, [
      { ...job, workspaceId: action.workspaceId },
    ]);
    if (!fresh || fresh.type !== action.type) return false;
    if (
      fresh.type === "fail" &&
      action.type === "fail" &&
      fresh.errorCode !== action.errorCode
    ) {
      return false;
    }

    if (fresh.type === "requeue") {
      tx.set(
        ref,
        {
          status: "queued",
          progressStep: "queued",
          claimedBy: null,
          reclaimAttempts: (job.reclaimAttempts ?? 0) + 1,
          processorStartedAt: null,
          processorHeartbeatAt: null,
          processorError: "worker_heartbeat_stale",
          errorCode: null,
          errorMessage: null,
          completedAt: null,
          updatedAt: ts,
        },
        { merge: true }
      );
    } else {
      tx.set(
        ref,
        {
          status: "failed",
          phase: job.usePageJobs ? ("failed" as ScanPhase) : job.phase ?? null,
          progressStep: "failed",
          errorCode: fresh.errorCode,
          errorMessage: SWEEP_ERROR_MESSAGES[fresh.errorCode],
          processorError: fresh.errorCode,
          claimedBy: null,
          reclaimAttempts: fresh.reclaimAttempts,
          completedAt: ts,
          updatedAt: ts,
          timings: { finishedAt: ts },
        },
        { merge: true }
      );
    }
    tx.set(auditRef, {
      id: auditRef.id,
      userId: null,
      workspaceId: action.workspaceId,
      action: action.type === "requeue" ? "scan.reclaimed" : "scan.failed_by_sweeper",
      resourceType: "scan_job",
      resourceId: action.scanId,
      metadataJson:
        fresh.type === "requeue"
          ? { by: "sweeper", reclaimAttempts: fresh.previousAttempts + 1 }
          : {
              by: "sweeper",
              errorCode: fresh.errorCode,
              reclaimAttempts: fresh.reclaimAttempts,
            },
      createdAt: ts,
    });
    return true;
  });
}

/**
 * Graceful-shutdown path: hand a job this worker cannot finish back to the
 * queue instead of leaving it `running` for the full stale window. Only
 * touches jobs still running AND still claimed by this worker; does not
 * count against reclaimAttempts because nothing actually went wrong.
 */
export async function requeueScanOnShutdown(
  workspaceId: string,
  scanId: string,
  workerId: string
): Promise<boolean> {
  const ref = scanRef(workspaceId, scanId);
  const auditRef = db().collection("auditLogs").doc();
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<ScanJob>(snap.id, snap.data());
    if (!job) return false;
    if (job.status !== "running" || job.claimedBy !== workerId) return false;

    const ts = now();
    tx.set(
      ref,
      {
        status: "queued",
        progressStep: "queued",
        claimedBy: null,
        processorStartedAt: null,
        processorHeartbeatAt: null,
        processorError: "worker_shutdown",
        errorCode: null,
        errorMessage: null,
        completedAt: null,
        updatedAt: ts,
      },
      { merge: true }
    );
    tx.set(auditRef, {
      id: auditRef.id,
      userId: null,
      workspaceId,
      action: "scan.requeued_on_shutdown",
      resourceType: "scan_job",
      resourceId: scanId,
      metadataJson: { by: "worker", workerId },
      createdAt: ts,
    });
    return true;
  });
}

// ===========================================================================
// Per-page job model (Phase 3)
// ===========================================================================

function pageJobsCol(workspaceId: string, scanId: string) {
  return scanRef(workspaceId, scanId).collection("pageJobs");
}

function pageJobRef(workspaceId: string, scanId: string, pageJobId: string) {
  return pageJobsCol(workspaceId, scanId).doc(pageJobId);
}

function pageJobIdForUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 32);
}

/** Resolve {workspaceId, scanId, pageJobId} from a collection-group pageJob doc. */
function pageJobPath(
  doc: QueryDocumentSnapshot
): { workspaceId: string; scanId: string; pageJobId: string } | null {
  // path: workspaces/{ws}/scans/{scanId}/pageJobs/{pageJobId}
  const scanDoc = doc.ref.parent.parent;
  const scanId = scanDoc?.id;
  const workspaceId = scanDoc?.parent.parent?.id;
  if (!scanId || !workspaceId) return null;
  return { workspaceId, scanId, pageJobId: doc.id };
}

/** Create one queued pageJob per resolved URL. Returns the number created. */
export async function createPageJobs(
  workspaceId: string,
  scanId: string,
  urls: string[]
): Promise<number> {
  const at = now();
  const uniqueUrls = [...new Set(urls)];
  let batch = db().batch();
  let n = 0;
  for (const url of uniqueUrls) {
    const pjId = pageJobIdForUrl(url);
    batch.set(pageJobRef(workspaceId, scanId, pjId), {
      id: pjId,
      scanJobId: scanId,
      workspaceId,
      url,
      status: "queued",
      attempts: 0,
      maxAttempts: PAGE_JOB_MAX_ATTEMPTS,
      claimedBy: null,
      heartbeatAt: null,
      deadlineMs: PAGE_JOB_DEADLINE_MS,
      error: null,
      errorCode: null,
      createdAt: at,
      startedAt: null,
      finishedAt: null,
    } satisfies PageJob);
    n += 1;
    if (n % 400 === 0) {
      await batch.commit();
      batch = db().batch();
    }
  }
  if (n % 400 !== 0) await batch.commit();
  await scanRef(workspaceId, scanId).set(
    {
      phase: "scanning" as ScanPhase,
      progressStep: "scanning",
      currentStep: "scanning",
      currentUrl: null,
      currentState: null,
      pagesDiscovered: n,
      pagesScanned: 0,
      pagesDone: 0,
      pagesFailed: 0,
      pagesTotal: n,
      claimedBy: null,
      processorStartedAt: null,
      processorHeartbeatAt: at,
      lastProgressAt: at,
      updatedAt: at,
    },
    { merge: true }
  );
  return n;
}

export async function deletePageJobs(
  workspaceId: string,
  scanId: string
): Promise<number> {
  const snap = await pageJobsCol(workspaceId, scanId).get();
  if (snap.empty) return 0;
  let batch = db().batch();
  let count = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    count += 1;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db().batch();
    }
  }
  if (count % 400 !== 0) await batch.commit();
  return count;
}

export async function getPageJob(
  workspaceId: string,
  scanId: string,
  pageJobId: string
): Promise<PageJob | null> {
  return getDoc<PageJob>(pageJobRef(workspaceId, scanId, pageJobId));
}

export async function listPageJobs(
  workspaceId: string,
  scanId: string
): Promise<PageJob[]> {
  const snap = await pageJobsCol(workspaceId, scanId).get();
  return snap.docs.map((d) => readDoc<PageJob>(d.id, d.data())!);
}

export interface ClaimablePageJobRef {
  workspaceId: string;
  scanId: string;
  pageJobId: string;
}

export type PageJobClaimResult =
  | { disposition: "claimed"; job: PageJob }
  | { disposition: "discarded" | "unavailable"; job: null };

/**
 * Cross-scan poll for queued pageJobs to process (FIFO). Stale running jobs
 * must first pass through the sweeper so retry accounting and audit events are
 * never bypassed.
 */
export async function listClaimablePageJobRefs(
  limit = 5
): Promise<ClaimablePageJobRef[]> {
  const out: ClaimablePageJobRef[] = [];
  const add = (doc: QueryDocumentSnapshot) => {
    const p = pageJobPath(doc);
    if (!p) return;
    out.push(p);
  };

  const queued = await db()
    .collectionGroup("pageJobs")
    .where("status", "==", "queued")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();
  queued.docs.forEach(add);
  return out.slice(0, limit);
}

/**
 * Atomically claim a queued pageJob. The parent scan is read in the same
 * transaction so jobs from failed/completed scans can never start.
 */
export async function claimPageJob(
  workspaceId: string,
  scanId: string,
  pageJobId: string,
  workerId: string
): Promise<PageJobClaimResult> {
  const ref = pageJobRef(workspaceId, scanId, pageJobId);
  const sRef = scanRef(workspaceId, scanId);
  return db().runTransaction(async (tx) => {
    const [snap, sSnap] = await Promise.all([tx.get(ref), tx.get(sRef)]);
    const job = readDoc<PageJob>(snap.id, snap.data());
    const scan = readDoc<ScanJob>(sSnap.id, sSnap.data());
    if (!job || job.status !== "queued") {
      return { disposition: "unavailable", job: null };
    }

    const parentDecision = pageJobParentClaimDecision(scan);
    if (parentDecision === "discard") {
      const at = now();
      tx.set(
        ref,
        {
          status: "failed",
          claimedBy: null,
          heartbeatAt: at,
          finishedAt: at,
          error: scan
            ? `Parent scan is already ${scan.status}.`
            : "Parent scan no longer exists.",
          errorCode: scan ? "parent_scan_terminal" : "parent_scan_missing",
        },
        { merge: true }
      );
      return { disposition: "discarded", job: null };
    }
    if (parentDecision === "wait") {
      return { disposition: "unavailable", job: null };
    }

    const at = now();
    if (pageJobAttemptsExhausted(job.attempts, job.maxAttempts)) {
      tx.set(
        ref,
        {
          status: "failed",
          claimedBy: null,
          heartbeatAt: at,
          finishedAt: at,
          error: "Page job retry attempts are exhausted.",
          errorCode: "attempts_exhausted",
        },
        { merge: true }
      );
      return { disposition: "discarded", job: null };
    }
    const attempts = (job.attempts ?? 0) + 1;
    tx.set(
      ref,
      stripUndefined({
        status: "running",
        attempts,
        claimedBy: workerId,
        startedAt: job.startedAt ?? at,
        heartbeatAt: at,
      } as Record<string, unknown>),
      { merge: true }
    );
    tx.set(
      sRef,
      {
        currentUrl: job.url,
        currentStep: "scanning",
        progressStep: "scanning",
        processorHeartbeatAt: at,
        lastProgressAt: at,
        updatedAt: at,
      },
      { merge: true }
    );
    return {
      disposition: "claimed",
      job: {
        ...job,
        status: "running",
        attempts,
        claimedBy: workerId,
        startedAt: job.startedAt ?? at,
        heartbeatAt: at,
      },
    };
  });
}

export async function touchPageJob(
  workspaceId: string,
  scanId: string,
  pageJobId: string,
  workerId: string
): Promise<boolean> {
  const ref = pageJobRef(workspaceId, scanId, pageJobId);
  const sRef = scanRef(workspaceId, scanId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<PageJob>(snap.id, snap.data());
    if (!job || job.status !== "running" || job.claimedBy !== workerId) return false;
    const at = now();
    tx.set(ref, { heartbeatAt: at }, { merge: true });
    tx.set(
      sRef,
      { processorHeartbeatAt: at, lastProgressAt: at, currentUrl: job.url, updatedAt: at },
      { merge: true }
    );
    return true;
  });
}

/**
 * Plan the scan-counter update for a terminal pageJob. Reading the scan inside
 * the transaction serializes concurrent completions, so exactly one of them
 * sees the final page complete and wins the right to aggregate.
 */
function pageFinalizePatch(
  scan: ScanJob | null,
  kind: "done" | "failed",
  workerId: string | null
): { patch: Record<string, unknown> | null; won: boolean } {
  if (
    !scan ||
    scan.status !== "running" ||
    !scan.usePageJobs ||
    scan.phase !== "scanning"
  ) {
    return { patch: null, won: false };
  }
  const ts = now();
  const patch: Record<string, unknown> = {
    updatedAt: ts,
    lastProgressAt: ts,
    pagesDone: FieldValue.increment(kind === "done" ? 1 : 0),
    pagesFailed: FieldValue.increment(kind === "failed" ? 1 : 0),
  };
  const plan = planPageFinalize(
    {
      pagesTotal: scan.pagesTotal ?? 0,
      pagesDone: scan.pagesDone ?? 0,
      pagesFailed: scan.pagesFailed ?? 0,
      phase: scan.phase,
    },
    kind
  );
  if (plan.aggregationWon) {
    patch.phase = "aggregating" as ScanPhase;
    patch.progressStep = "processing";
    patch.currentStep = "aggregating";
    patch.currentUrl = null;
    patch.currentState = null;
    patch.claimedBy = workerId;
    patch.processorHeartbeatAt = ts;
  }
  return { patch, won: plan.aggregationWon };
}

/** Mark a pageJob completed and bump scan counters. Returns aggregation winner. */
export async function completePageJob(
  workspaceId: string,
  scanId: string,
  pageJobId: string,
  workerId: string
): Promise<{ aggregationWon: boolean }> {
  const ref = pageJobRef(workspaceId, scanId, pageJobId);
  const sRef = scanRef(workspaceId, scanId);
  let won = false;
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<PageJob>(snap.id, snap.data());
    if (!job || job.status !== "running" || job.claimedBy !== workerId) return;
    const sSnap = await tx.get(sRef);
    const scan = readDoc<ScanJob>(sSnap.id, sSnap.data());
    const fin = pageFinalizePatch(scan, "done", workerId);
    if (fin.patch) tx.set(sRef, fin.patch, { merge: true });
    tx.set(
      ref,
      {
        status: "completed",
        claimedBy: null,
        heartbeatAt: now(),
        finishedAt: now(),
        error: null,
        errorCode: null,
      },
      { merge: true }
    );
    won = fin.won;
  });
  return { aggregationWon: won };
}

/**
 * Record a page failure. Policy: attempts < maxAttempts → requeue once;
 * otherwise mark failed, bump pagesFailed, and (maybe) win aggregation.
 */
export async function failPageJob(
  workspaceId: string,
  scanId: string,
  pageJobId: string,
  error: string,
  errorCode: string,
  workerId: string
): Promise<{ requeued: boolean; aggregationWon: boolean }> {
  const ref = pageJobRef(workspaceId, scanId, pageJobId);
  const sRef = scanRef(workspaceId, scanId);
  let requeued = false;
  let won = false;
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<PageJob>(snap.id, snap.data());
    if (!job || job.status !== "running" || job.claimedBy !== workerId) return;

    const attempts = job.attempts ?? 0;
    const maxAttempts = job.maxAttempts ?? PAGE_JOB_MAX_ATTEMPTS;
    if (attempts < maxAttempts) {
      tx.set(
        ref,
        {
          status: "queued",
          claimedBy: null,
          heartbeatAt: null,
          startedAt: null,
          error,
          errorCode,
        },
        { merge: true }
      );
      requeued = true;
      return;
    }

    const sSnap = await tx.get(sRef);
    const scan = readDoc<ScanJob>(sSnap.id, sSnap.data());
    const fin = pageFinalizePatch(scan, "failed", workerId);
    if (fin.patch) tx.set(sRef, fin.patch, { merge: true });
    tx.set(
      ref,
      {
        status: "failed",
        claimedBy: null,
        heartbeatAt: now(),
        finishedAt: now(),
        error,
        errorCode,
      },
      { merge: true }
    );
    won = fin.won;
  });
  return { requeued, aggregationWon: won };
}

/** Hand a running pageJob this worker owns back to the queue on shutdown. */
export async function requeuePageJobOnShutdown(
  workspaceId: string,
  scanId: string,
  pageJobId: string,
  workerId: string
): Promise<boolean> {
  const ref = pageJobRef(workspaceId, scanId, pageJobId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<PageJob>(snap.id, snap.data());
    if (!job || job.status !== "running" || job.claimedBy !== workerId) return false;
    // Step attempts back so a clean shutdown does not consume a retry.
    const attempts = Math.max(0, (job.attempts ?? 1) - 1);
    tx.set(
      ref,
      { status: "queued", claimedBy: null, heartbeatAt: null, attempts },
      { merge: true }
    );
    return true;
  });
}

/** Running pageJobs across all scans, for the watchdog sweep. */
export async function listSweepablePageJobs(max = 200): Promise<PageJob[]> {
  const running = await db()
    .collectionGroup("pageJobs")
    .where("status", "==", "running")
    .limit(max)
    .get();
  const out: PageJob[] = [];
  for (const doc of running.docs) {
    const job = readDoc<PageJob>(doc.id, doc.data());
    if (!job) continue;
    const p = pageJobPath(doc);
    out.push({ ...job, workspaceId: p?.workspaceId ?? job.workspaceId, scanJobId: p?.scanId ?? job.scanJobId });
  }
  return out;
}

/** Apply one pageJob sweep action in a state-re-checking transaction. */
export async function applyPageJobSweepAction(
  action: PageJobSweepAction
): Promise<{ applied: boolean; aggregationWon: boolean }> {
  const ref = pageJobRef(action.workspaceId, action.scanId, action.pageJobId);
  const sRef = scanRef(action.workspaceId, action.scanId);
  const auditRef = db().collection("auditLogs").doc();
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<PageJob>(snap.id, snap.data());
    if (!job) return { applied: false, aggregationWon: false };

    const ts = now();
    const [fresh] = sweepPageJobs(ts, [job]);
    if (!fresh || fresh.type !== action.type) {
      return { applied: false, aggregationWon: false };
    }

    let aggregationWon = false;
    if (action.type === "requeue") {
      tx.set(
        ref,
        { status: "queued", claimedBy: null, heartbeatAt: null, error: action.previousAttempts ? "reclaimed_after_worker_stall" : null },
        { merge: true }
      );
    } else {
      const sSnap = await tx.get(sRef);
      const scan = readDoc<ScanJob>(sSnap.id, sSnap.data());
      const fin = pageFinalizePatch(scan, "failed", null);
      if (fin.patch) tx.set(sRef, fin.patch, { merge: true });
      tx.set(
        ref,
        {
          status: "failed",
          claimedBy: null,
          heartbeatAt: ts,
          finishedAt: ts,
          error: action.error,
          errorCode: action.errorCode,
        },
        { merge: true }
      );
      aggregationWon = fin.won;
    }
    tx.set(auditRef, {
      id: auditRef.id,
      userId: null,
      workspaceId: action.workspaceId,
      action: action.type === "requeue" ? "pageJob.reclaimed" : "pageJob.failed_by_sweeper",
      resourceType: "page_job",
      resourceId: action.pageJobId,
      metadataJson: { by: "sweeper", scanId: action.scanId },
      createdAt: ts,
    });
    return { applied: true, aggregationWon };
  });
}

/**
 * Transactionally claim the right to aggregate a scan whose pages are all
 * terminal but which never aggregated (crashed aggregator). Exactly one caller
 * wins by flipping phase scanning → aggregating.
 */
export async function claimAggregation(
  workspaceId: string,
  scanId: string,
  workerId: string
): Promise<boolean> {
  const sRef = scanRef(workspaceId, scanId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(sRef);
    const scan = readDoc<ScanJob>(snap.id, snap.data());
    if (!scan) return false;
    const total = scan.pagesTotal ?? 0;
    const terminal = (scan.pagesDone ?? 0) + (scan.pagesFailed ?? 0);
    if (scan.status !== "running" || !scan.usePageJobs || total <= 0 || terminal < total) {
      return false;
    }

    const at = now();
    const heartbeatMs =
      scan.processorHeartbeatAt?.getTime() ?? scan.lastProgressAt?.getTime() ?? 0;
    const crashedAggregator =
      scan.phase === "aggregating" && at.getTime() - heartbeatMs > PAGE_JOB_STALE_MS;
    const unownedAggregator =
      scan.phase === "aggregating" && !scan.claimedBy;
    if (scan.phase === "scanning" || unownedAggregator || crashedAggregator) {
      tx.set(
        sRef,
        {
          phase: "aggregating" as ScanPhase,
          progressStep: "processing",
          currentStep: "aggregating",
          claimedBy: workerId,
          processorHeartbeatAt: at,
          lastProgressAt: at,
          updatedAt: at,
        },
        { merge: true }
      );
      return true;
    }
    return false;
  });
}

/**
 * Find scans whose pageJobs are all terminal and therefore need aggregation,
 * including stale `aggregating` scans whose prior aggregation worker crashed.
 */
export async function listAggregationCandidates(max = 50): Promise<ScanJob[]> {
  const [scanning, aggregating] = await Promise.all([
    db().collectionGroup("scans").where("phase", "==", "scanning").limit(max).get(),
    db().collectionGroup("scans").where("phase", "==", "aggregating").limit(max).get(),
  ]);
  const candidates: ScanJob[] = [];
  for (const doc of [...scanning.docs, ...aggregating.docs]) {
    const scan = readDoc<ScanJob>(doc.id, doc.data());
    if (!scan || scan.status !== "running" || !scan.usePageJobs) continue;
    const total = scan.pagesTotal ?? 0;
    const terminal = (scan.pagesDone ?? 0) + (scan.pagesFailed ?? 0);
    if (total <= 0 || terminal < total) continue;
    const workspaceId = workspaceIdFromScanDoc(doc) ?? scan.workspaceId;
    const jobs = await listPageJobs(workspaceId, scan.id);
    if (
      jobs.length > 0 &&
      jobs.length === total &&
      jobs.every((job) => job.status === "completed" || job.status === "failed")
    ) {
      candidates.push({ ...scan, workspaceId });
    }
  }
  return candidates;
}

/** Merge a phase (and optional extra fields) onto a scan doc. */
export async function setScanPhase(
  workspaceId: string,
  scanId: string,
  phase: ScanPhase,
  extra: Partial<ScanJob> = {}
): Promise<void> {
  await scanRef(workspaceId, scanId).set(
    stripUndefined({ ...extra, phase, updatedAt: now() } as Record<string, unknown>),
    { merge: true }
  );
}

/** Delete only the grouped-issue docs (for idempotent re-aggregation). */
export async function clearScanGroups(workspaceId: string, scanId: string) {
  const snap = await scanRef(workspaceId, scanId).collection("groups").get();
  if (snap.empty) return;
  let batch = db().batch();
  let n = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    n += 1;
    if (n % 400 === 0) {
      await batch.commit();
      batch = db().batch();
    }
  }
  if (n % 400 !== 0) await batch.commit();
}

export async function listScanPages(
  workspaceId: string,
  scanId: string
): Promise<ScanPage[]> {
  const snap = await scanRef(workspaceId, scanId)
    .collection("pages")
    .orderBy("scannedAt", "asc")
    .get();
  return snap.docs.map((d) => readDoc<ScanPage>(d.id, d.data())!);
}

export async function listIssues(
  workspaceId: string,
  scanId: string,
  limit?: number
): Promise<AccessibilityIssue[]> {
  let query: Query = scanRef(workspaceId, scanId).collection("issues");
  query = query.orderBy("severity", "asc");
  if (limit) query = query.limit(limit);
  const snap = await query.get();
  return snap.docs.map((d) => readDoc<AccessibilityIssue>(d.id, d.data())!);
}

export async function getIssue(
  workspaceId: string,
  scanId: string,
  issueId: string
): Promise<AccessibilityIssue | null> {
  return getDoc<AccessibilityIssue>(scanRef(workspaceId, scanId).collection("issues").doc(issueId));
}

export async function findIssueInWorkspace(
  workspaceId: string,
  issueId: string
): Promise<{ issue: AccessibilityIssue; scan: ScanJob } | null> {
  const scans = await listScans(workspaceId, 100);
  for (const scan of scans) {
    const issue = await getIssue(workspaceId, scan.id, issueId);
    if (issue) return { issue, scan };
  }
  return null;
}

export async function getScanPage(
  workspaceId: string,
  scanId: string,
  pageId: string
): Promise<ScanPage | null> {
  return getDoc<ScanPage>(scanRef(workspaceId, scanId).collection("pages").doc(pageId));
}

export async function updateIssue(
  workspaceId: string,
  scanId: string,
  issueId: string,
  patch: Partial<
    Pick<AccessibilityIssue, "status" | "falsePositive" | "humanReviewRequired">
  >
): Promise<AccessibilityIssue | null> {
  const existing = await getIssue(workspaceId, scanId, issueId);
  if (!existing) return null;
  await scanRef(workspaceId, scanId)
    .collection("issues")
    .doc(issueId)
    .set(
      stripUndefined({ ...patch, updatedAt: now() } as Record<string, unknown>),
      { merge: true }
    );
  return getIssue(workspaceId, scanId, issueId);
}

/**
 * Soft-delete one visual-evidence record: drops the stored image bytes and
 * marks the doc deleted so reads (and the image endpoint) stop serving it.
 */
export async function softDeleteVisualEvidence(
  workspaceId: string,
  evidenceId: string
): Promise<boolean> {
  const evidence = await getVisualEvidence(workspaceId, evidenceId);
  if (!evidence) return false;
  await db().collection("visualEvidence").doc(evidenceId).set(
    {
      deletedAt: now(),
      imageDataBase64: FieldValue.delete(),
      imageContentType: FieldValue.delete(),
    },
    { merge: true }
  );
  return true;
}

export async function listIssueGroups(
  workspaceId: string,
  scanId: string
): Promise<IssueGroup[]> {
  const snap = await scanRef(workspaceId, scanId)
    .collection("groups")
    .orderBy("priority", "asc")
    .get();
  return snap.docs.map((d) => readDoc<IssueGroup>(d.id, d.data())!);
}

export async function getScanSummary(
  workspaceId: string,
  scanId: string
): Promise<ScanSummary | null> {
  return getDoc<ScanSummary>(scanRef(workspaceId, scanId).collection("meta").doc("summary"));
}

export async function writeScanPage(
  workspaceId: string,
  scanId: string,
  page: Omit<ScanPage, "id">,
  pageId = id()
): Promise<ScanPage> {
  const row = { id: pageId, ...page };
  await scanRef(workspaceId, scanId).collection("pages").doc(pageId).set(row);
  return row;
}

export async function writeIssue(
  workspaceId: string,
  scanId: string,
  issue: Omit<AccessibilityIssue, "id" | "createdAt" | "updatedAt">,
  issueId = id()
): Promise<AccessibilityIssue> {
  const row: AccessibilityIssue = {
    id: issueId,
    ...issue,
    createdAt: now(),
    updatedAt: now(),
  };
  await scanRef(workspaceId, scanId).collection("issues").doc(issueId).set(row);
  return row;
}

export async function writeVisualEvidence(
  evidence: Omit<VisualEvidence, "id" | "createdAt" | "deletedAt">
): Promise<VisualEvidence> {
  const row: VisualEvidence = {
    id: evidence.issueId,
    ...evidence,
    createdAt: now(),
    deletedAt: null,
  };
  await db().collection("visualEvidence").doc(row.id).set(row);
  return row;
}

export async function getVisualEvidence(
  workspaceId: string,
  evidenceId: string
): Promise<VisualEvidence | null> {
  const evidence = await getDoc<VisualEvidence>(
    db().collection("visualEvidence").doc(evidenceId)
  );
  if (!evidence || evidence.workspaceId !== workspaceId || evidence.deletedAt) return null;
  return evidence;
}

export async function getVisualEvidenceForIssue(
  workspaceId: string,
  issueId: string
): Promise<VisualEvidence | null> {
  return getVisualEvidence(workspaceId, issueId);
}

/**
 * Visual-evidence records for a workspace with image bytes stripped —
 * used by the privacy export, which ships metadata, not screenshots.
 */
export async function listVisualEvidenceMeta(
  workspaceId: string,
  limit = 1000
): Promise<Array<Omit<VisualEvidence, "imageDataBase64">>> {
  const snap = await db()
    .collection("visualEvidence")
    .where("workspaceId", "==", workspaceId)
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const row = readDoc<VisualEvidence>(d.id, d.data())!;
    delete row.imageDataBase64;
    return row;
  });
}

export async function writeIssueGroup(
  workspaceId: string,
  scanId: string,
  group: Omit<IssueGroup, "id" | "createdAt">
): Promise<IssueGroup> {
  const groupId = id();
  const row: IssueGroup = { id: groupId, ...group, createdAt: now() };
  await scanRef(workspaceId, scanId).collection("groups").doc(groupId).set(row);
  return row;
}

export async function updateIssueGroupId(
  workspaceId: string,
  scanId: string,
  issueIds: string[],
  groupId: string
) {
  const batch = db().batch();
  for (const issueId of issueIds) {
    batch.set(
      scanRef(workspaceId, scanId).collection("issues").doc(issueId),
      { groupId, updatedAt: now() },
      { merge: true }
    );
  }
  await batch.commit();
}

export async function writeScanSummary(
  workspaceId: string,
  scanId: string,
  summary: Omit<ScanSummary, "id" | "scanJobId" | "createdAt">
) {
  const row: ScanSummary = {
    id: "summary",
    scanJobId: scanId,
    ...summary,
    createdAt: now(),
  };
  await scanRef(workspaceId, scanId).collection("meta").doc("summary").set(row);
}

export async function clearScanResultCollections(workspaceId: string, scanId: string) {
  for (const name of ["pages", "issues", "groups"] as const) {
    const snap = await scanRef(workspaceId, scanId).collection(name).get();
    if (snap.empty) continue;
    const batch = db().batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
  }
  await scanRef(workspaceId, scanId).collection("meta").doc("summary").delete().catch(() => {});
}

/** Remove one deterministic page result before a pageJob retry rewrites it. */
export async function clearScanPageResult(
  workspaceId: string,
  scanId: string,
  pageId: string
): Promise<void> {
  const issues = await scanRef(workspaceId, scanId)
    .collection("issues")
    .where("scanPageId", "==", pageId)
    .get();
  let batch = db().batch();
  let operations = 0;
  for (const issue of issues.docs) {
    batch.delete(issue.ref);
    batch.delete(db().collection("visualEvidence").doc(issue.id));
    operations += 2;
    if (operations >= 400) {
      await batch.commit();
      batch = db().batch();
      operations = 0;
    }
  }
  batch.delete(scanRef(workspaceId, scanId).collection("pages").doc(pageId));
  operations += 1;
  if (operations > 0) await batch.commit();
}

export async function incrementPagesUsage(workspaceId: string, pages: number) {
  await db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("usage")
    .doc("current")
    .set({ pagesScannedThisMonth: FieldValue.increment(pages) }, { merge: true });
}

export async function audit(input: {
  userId?: string | null;
  workspaceId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: unknown;
}) {
  const row: AuditLog = {
    id: id(),
    userId: input.userId ?? null,
    workspaceId: input.workspaceId ?? null,
    action: input.action,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    metadataJson: input.metadata ?? null,
    createdAt: now(),
  };
  await db().collection("auditLogs").doc(row.id).set(row);
}

export async function listAuditLogs(workspaceId: string, limit = 50): Promise<AuditLog[]> {
  try {
    const snap = await db()
      .collection("auditLogs")
      .where("workspaceId", "==", workspaceId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => readDoc<AuditLog>(d.id, d.data())!);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("index")) throw error;

    const snap = await db()
      .collection("auditLogs")
      .where("workspaceId", "==", workspaceId)
      .limit(Math.max(limit * 4, 100))
      .get();
    return snap.docs
      .map((d) => readDoc<AuditLog>(d.id, d.data())!)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export async function listNotifications(workspaceId: string, limit = 20): Promise<AuditLog[]> {
  return listAuditLogs(workspaceId, limit);
}

function memberRef(workspaceId: string, userId: string) {
  return db().collection("workspaces").doc(workspaceId).collection("members").doc(userId);
}

export async function getNotificationsSeenAt(
  workspaceId: string,
  userId: string
): Promise<Date | null> {
  const member = await getDoc<WorkspaceMember>(memberRef(workspaceId, userId));
  return member?.notificationsSeenAt ?? null;
}

export async function markNotificationsSeen(
  workspaceId: string,
  userId: string
): Promise<void> {
  await memberRef(workspaceId, userId).set(
    { notificationsSeenAt: now(), updatedAt: now() },
    { merge: true }
  );
}

export interface WorkspaceMemberWithUser {
  memberId: string;
  role: WorkspaceRole;
  status: WorkspaceMember["status"];
  createdAt: Date;
  name: string | null;
  email: string;
}

export async function listWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMemberWithUser[]> {
  const snap = await db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("members")
    .where("status", "==", "active")
    .get();
  const members = snap.docs.map((d) => readDoc<WorkspaceMember>(d.id, d.data())!);
  const users = await Promise.all(
    members.map((m) => getDoc<User>(db().collection("users").doc(m.userId)))
  );
  return members.map((m, index) => ({
    memberId: m.id,
    role: m.role,
    status: m.status,
    createdAt: m.createdAt,
    name: users[index]?.name ?? null,
    email: users[index]?.email ?? m.userId,
  }));
}

export async function countWorkspaceSeats(workspaceId: string): Promise<number> {
  const [active, pending] = await Promise.all([
    db()
      .collection("workspaces")
      .doc(workspaceId)
      .collection("members")
      .where("status", "==", "active")
      .get(),
    db()
      .collection("workspaceInvitations")
      .where("workspaceId", "==", workspaceId)
      .where("status", "==", "pending")
      .get(),
  ]);
  const nowTs = now();
  const activePending = pending.docs.filter((doc) => {
    const invite = readDoc<WorkspaceInvitation>(doc.id, doc.data());
    return invite ? invite.expiresAt > nowTs : false;
  });
  return active.size + activePending.length;
}

export async function listPendingInvitations(
  workspaceId: string
): Promise<WorkspaceInvitation[]> {
  const snap = await db()
    .collection("workspaceInvitations")
    .where("workspaceId", "==", workspaceId)
    .where("status", "==", "pending")
    .get();
  return snap.docs
    .map((d) => readDoc<WorkspaceInvitation>(d.id, d.data())!)
    .filter((i) => i.expiresAt > now())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createWorkspaceInvitation(input: {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedByUserId: string;
}): Promise<WorkspaceInvitation> {
  const token = crypto.randomUUID().replace(/-/g, "");
  const invitation: WorkspaceInvitation = {
    id: token,
    workspaceId: input.workspaceId,
    email: normalizeEmail(input.email),
    role: input.role,
    invitedByUserId: input.invitedByUserId,
    token,
    status: "pending",
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    acceptedByUserId: null,
    createdAt: now(),
  };
  await db().collection("workspaceInvitations").doc(token).set(invitation);
  return invitation;
}

export async function revokeWorkspaceInvitation(
  workspaceId: string,
  token: string
): Promise<boolean> {
  const ref = db().collection("workspaceInvitations").doc(token);
  const invite = await getDoc<WorkspaceInvitation>(ref);
  if (!invite || invite.workspaceId !== workspaceId || invite.status !== "pending") {
    return false;
  }
  await ref.set({ status: "revoked" }, { merge: true });
  return true;
}

export async function acceptWorkspaceInvitation(input: {
  token: string;
  userId: string;
  email: string;
}): Promise<WorkspaceInvitation> {
  const ref = db().collection("workspaceInvitations").doc(input.token);
  const invitation = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const invite = readDoc<WorkspaceInvitation>(snap.id, snap.data());
    if (!invite) throw new Error("invite_not_found");
    if (invite.status !== "pending") throw new Error("invite_not_pending");
    if (invite.expiresAt <= now()) throw new Error("invite_expired");
    if (normalizeEmail(invite.email) !== normalizeEmail(input.email)) {
      throw new Error("invite_email_mismatch");
    }
    const memberRef = db()
      .collection("workspaces")
      .doc(invite.workspaceId)
      .collection("members")
      .doc(input.userId);
    const member: WorkspaceMember = {
      id: input.userId,
      workspaceId: invite.workspaceId,
      userId: input.userId,
      role: invite.role,
      permissionsJson: null,
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    };
    tx.set(memberRef, member, { merge: true });
    tx.set(
      ref,
      {
        status: "accepted",
        acceptedAt: now(),
        acceptedByUserId: input.userId,
      },
      { merge: true }
    );
    tx.set(
      db().collection("users").doc(input.userId),
      {
        currentWorkspaceId: invite.workspaceId,
        updatedAt: now(),
      },
      { merge: true }
    );
    return invite;
  });
  return invitation;
}

function remediationCollection(workspaceId: string) {
  return db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("remediationTasks");
}

function remediationDoc(workspaceId: string, taskId: string) {
  return remediationCollection(workspaceId).doc(taskId);
}

export async function listRemediationTasks(
  workspaceId: string,
  limit = 100
): Promise<RemediationTask[]> {
  const snap = await remediationCollection(workspaceId)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => readDoc<RemediationTask>(d.id, d.data())!);
}

export async function getRemediationTask(
  workspaceId: string,
  taskId: string
): Promise<RemediationTask | null> {
  return getDoc<RemediationTask>(remediationDoc(workspaceId, taskId));
}

export async function createRemediationTask(
  workspaceId: string,
  input: Partial<RemediationTask> & { title: string }
): Promise<RemediationTask> {
  const taskId = input.id ?? id();
  const row: RemediationTask = {
    id: taskId,
    workspaceId,
    scanJobId: input.scanJobId ?? null,
    issueId: input.issueId ?? null,
    issueGroupId: input.issueGroupId ?? null,
    ruleId: input.ruleId ?? null,
    severity: input.severity ?? null,
    sourceUrl: input.sourceUrl ?? null,
    projectKey: input.projectKey ?? null,
    projectLabel: input.projectLabel ?? null,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "to_do",
    priority: input.priority ?? "medium",
    assignedToMemberId: input.assignedToMemberId ?? null,
    dueAt: input.dueAt ?? null,
    notes: input.notes ?? null,
    createdAt: input.createdAt ?? now(),
    updatedAt: now(),
  };
  await remediationDoc(workspaceId, taskId).set(stripUndefined(row as unknown as Record<string, unknown>));
  return row;
}

export async function updateRemediationTask(
  workspaceId: string,
  taskId: string,
  patch: Partial<Pick<RemediationTask, "title" | "description" | "status" | "priority" | "assignedToMemberId" | "dueAt" | "notes">>
): Promise<RemediationTask | null> {
  const existing = await getRemediationTask(workspaceId, taskId);
  if (!existing) return null;
  await remediationDoc(workspaceId, taskId).set(
    stripUndefined({ ...patch, updatedAt: now() } as Record<string, unknown>),
    { merge: true }
  );
  return getRemediationTask(workspaceId, taskId);
}

export async function deleteRemediationTask(
  workspaceId: string,
  taskId: string
): Promise<boolean> {
  const existing = await getRemediationTask(workspaceId, taskId);
  if (!existing) return false;
  await remediationDoc(workspaceId, taskId).delete();
  return true;
}

// ---------------------------------------------------------------------------
// Persisted AI output. Both collections live under the workspace and are
// keyed deterministically so regenerating overwrites the previous result
// instead of accumulating paid-for history. Server-only (Admin SDK).
// ---------------------------------------------------------------------------

function aiExplanationsCollection(workspaceId: string) {
  return db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("aiExplanations");
}

/** Doc ids must stay Firestore-path-safe; frameworks come from enum values. */
function aiExplanationDocId(issueId: string, framework: string): string {
  return `${issueId}_${framework.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

export async function getAiExplanation(
  workspaceId: string,
  issueId: string,
  framework: string
): Promise<AiExplanationRecord | null> {
  return getDoc<AiExplanationRecord>(
    aiExplanationsCollection(workspaceId).doc(aiExplanationDocId(issueId, framework))
  );
}

/**
 * Most recently stored explanation for an issue, regardless of framework.
 * The issue detail page renders this as the initial AI card so revisiting
 * the page does not require a new paid generation.
 */
export async function getLatestAiExplanationForIssue(
  workspaceId: string,
  issueId: string
): Promise<AiExplanationRecord | null> {
  const snap = await aiExplanationsCollection(workspaceId)
    .where("issueId", "==", issueId)
    .limit(10)
    .get();
  const records = snap.docs
    .map((d) => readDoc<AiExplanationRecord>(d.id, d.data())!)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return records[0] ?? null;
}

export async function saveAiExplanation(
  workspaceId: string,
  input: {
    scanJobId: string;
    issueId: string;
    framework: string;
    mode: string;
    createdBy: string;
    payload: Omit<
      AiExplanationRecord,
      | "id"
      | "workspaceId"
      | "scanJobId"
      | "issueId"
      | "framework"
      | "mode"
      | "createdBy"
      | "createdAt"
    >;
  }
): Promise<AiExplanationRecord> {
  const docId = aiExplanationDocId(input.issueId, input.framework);
  const row: AiExplanationRecord = {
    ...input.payload,
    id: docId,
    workspaceId,
    scanJobId: input.scanJobId,
    issueId: input.issueId,
    framework: input.framework,
    mode: input.mode,
    createdBy: input.createdBy,
    createdAt: now(),
  };
  await aiExplanationsCollection(workspaceId)
    .doc(docId)
    .set(stripUndefined(row as unknown as Record<string, unknown>));
  return row;
}

function aiAssistantResultsCollection(workspaceId: string) {
  return db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("aiAssistantResults");
}

export async function saveAssistantResult(
  workspaceId: string,
  input: {
    scanJobId: string;
    preset: string;
    framework: string;
    primaryIssueSnippet: string | null;
    createdBy: string;
    payload: Omit<
      AiAssistantResultRecord,
      | "id"
      | "workspaceId"
      | "scanJobId"
      | "preset"
      | "framework"
      | "primaryIssueSnippet"
      | "createdBy"
      | "createdAt"
    >;
  }
): Promise<AiAssistantResultRecord> {
  const row: AiAssistantResultRecord = {
    ...input.payload,
    id: input.scanJobId,
    workspaceId,
    scanJobId: input.scanJobId,
    preset: input.preset,
    framework: input.framework,
    primaryIssueSnippet: input.primaryIssueSnippet,
    createdBy: input.createdBy,
    createdAt: now(),
  };
  await aiAssistantResultsCollection(workspaceId)
    .doc(input.scanJobId)
    .set(stripUndefined(row as unknown as Record<string, unknown>));
  return row;
}

/**
 * Latest assistant results for a set of scans, keyed by scan id. Used by the
 * AI Assistant page to restore the last generated plan per scan without
 * burning a new paid generation on every visit.
 */
export async function getLatestAssistantResults(
  workspaceId: string,
  scanIds: readonly string[]
): Promise<Record<string, AiAssistantResultRecord>> {
  const out: Record<string, AiAssistantResultRecord> = {};
  const refs = scanIds.map((scanId) =>
    aiAssistantResultsCollection(workspaceId).doc(scanId)
  );
  if (refs.length === 0) return out;
  const snaps = await db().getAll(...refs);
  for (const snap of snaps) {
    const record = readDoc<AiAssistantResultRecord>(snap.id, snap.data());
    if (record) out[snap.id] = record;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Monitors (Layer 2 — continuous monitoring). Stored as a subcollection so the
// scheduler can sweep them across all workspaces with one collectionGroup
// query, mirroring how the worker claims scans. Server-only (Admin SDK).
// ---------------------------------------------------------------------------

function monitorsCollection(workspaceId: string) {
  return db().collection("workspaces").doc(workspaceId).collection("monitors");
}

function monitorDoc(workspaceId: string, monitorId: string) {
  return monitorsCollection(workspaceId).doc(monitorId);
}

export async function listMonitors(
  workspaceId: string,
  limit = 100
): Promise<Monitor[]> {
  const snap = await orderByCreatedDesc(monitorsCollection(workspaceId))
    .limit(limit)
    .get();
  return snap.docs.map((d) => readDoc<Monitor>(d.id, d.data())!);
}

export async function countMonitors(workspaceId: string): Promise<number> {
  const snap = await monitorsCollection(workspaceId).count().get();
  return snap.data().count;
}

export async function getMonitor(
  workspaceId: string,
  monitorId: string
): Promise<Monitor | null> {
  return getDoc<Monitor>(monitorDoc(workspaceId, monitorId));
}

export async function createMonitor(
  workspaceId: string,
  input: Partial<Monitor> & {
    targetUrl: string;
    frequency: MonitorFrequency;
    nextRunAt: Date;
    createdBy: string;
  }
): Promise<Monitor> {
  const monitorId = input.id ?? id();
  const row: Monitor = {
    id: monitorId,
    workspaceId,
    name: input.name ?? input.targetUrl,
    targetUrl: input.targetUrl,
    frequency: input.frequency,
    status: input.status ?? "active",
    scanConfig: {
      scanType: input.scanConfig?.scanType ?? "single",
      maxPages: input.scanConfig?.maxPages ?? 1,
      includeScreenshots: input.scanConfig?.includeScreenshots ?? false,
    },
    nextRunAt: input.nextRunAt,
    lastRunAt: input.lastRunAt ?? null,
    lastScanId: input.lastScanId ?? null,
    alertChannels: {
      email: input.alertChannels?.email ?? [],
      slackWebhookUrl: input.alertChannels?.slackWebhookUrl ?? null,
    },
    alertThreshold: {
      onNewCritical: input.alertThreshold?.onNewCritical ?? true,
      onScoreDropBy: input.alertThreshold?.onScoreDropBy ?? 5,
    },
    createdBy: input.createdBy,
    createdAt: input.createdAt ?? now(),
    updatedAt: now(),
  };
  await monitorDoc(workspaceId, monitorId).set(
    stripUndefined(row as unknown as Record<string, unknown>)
  );
  return row;
}

export async function updateMonitor(
  workspaceId: string,
  monitorId: string,
  patch: Partial<
    Pick<
      Monitor,
      | "name"
      | "frequency"
      | "status"
      | "scanConfig"
      | "nextRunAt"
      | "lastRunAt"
      | "lastScanId"
      | "alertChannels"
      | "alertThreshold"
    >
  >
): Promise<Monitor | null> {
  const existing = await getMonitor(workspaceId, monitorId);
  if (!existing) return null;
  await monitorDoc(workspaceId, monitorId).set(
    stripUndefined({ ...patch, updatedAt: now() } as Record<string, unknown>),
    { merge: true }
  );
  return getMonitor(workspaceId, monitorId);
}

export async function deleteMonitor(
  workspaceId: string,
  monitorId: string
): Promise<boolean> {
  const existing = await getMonitor(workspaceId, monitorId);
  if (!existing) return false;
  await monitorDoc(workspaceId, monitorId).delete();
  return true;
}

/**
 * Monitors whose next run is due, across all workspaces — the query the
 * scheduler (B-3) will poll. Needs a collectionGroup composite index on
 * (status ASC, nextRunAt ASC); see firestore.indexes.json.
 */
export async function listDueMonitors(
  at: Date = now(),
  limit = 50
): Promise<Monitor[]> {
  const snap = await db()
    .collectionGroup("monitors")
    .where("status", "==", "active")
    .where("nextRunAt", "<=", at)
    .orderBy("nextRunAt", "asc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => readDoc<Monitor>(d.id, d.data())!);
}

/**
 * Atomically lease one due monitor so duplicate Cloud Scheduler deliveries
 * cannot create duplicate scans. A short lease is written into nextRunAt; the
 * scheduler replaces it with the real cadence after creating the scan.
 */
export async function claimDueMonitor(
  workspaceId: string,
  monitorId: string,
  at: Date = now(),
  leaseMs = 10 * 60_000
): Promise<Monitor | null> {
  const ref = monitorDoc(workspaceId, monitorId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const monitor = readDoc<Monitor>(snap.id, snap.data());
    if (
      !monitor ||
      monitor.status !== "active" ||
      monitor.nextRunAt.getTime() > at.getTime()
    ) {
      return null;
    }
    tx.set(
      ref,
      {
        nextRunAt: new Date(at.getTime() + leaseMs),
        updatedAt: at,
      },
      { merge: true }
    );
    return monitor;
  });
}

export async function syncRemediationTasksForScan(
  workspaceId: string,
  scanId: string
): Promise<number> {
  const [scan, groups, issues, pages] = await Promise.all([
    getScanJob(workspaceId, scanId),
    listIssueGroups(workspaceId, scanId),
    listIssues(workspaceId, scanId),
    listScanPages(workspaceId, scanId),
  ]);
  if (!scan) return 0;
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const project = projectFolderForScan(scan);
  let written = 0;

  if (groups.length) {
    for (const group of groups) {
      const taskId = `${scanId}__group__${group.id}`;
      const existing = await getRemediationTask(workspaceId, taskId);
      if (existing) continue;
      await createRemediationTask(workspaceId, {
        id: taskId,
        scanJobId: scanId,
        issueId: null,
        issueGroupId: group.id,
        ruleId: group.ruleId,
        severity: group.severity,
        title: group.title,
        description:
          group.recommendedFix ??
          group.summary ??
          `${group.affectedCount} finding(s) from ${scan.baseUrl}`,
        priority: priorityForSeverity(group.severity),
        status: "to_do",
        sourceUrl: scan.baseUrl,
        projectKey: project.projectKey,
        projectLabel: project.projectLabel,
      });
      written++;
    }
    return written;
  }

  for (const issue of issues.slice(0, maxPersistedIssuesPerScan())) {
    const taskId = `${scanId}__issue__${issue.id}`;
    const existing = await getRemediationTask(workspaceId, taskId);
    if (existing) continue;
    await createRemediationTask(workspaceId, {
      id: taskId,
      scanJobId: scanId,
      issueId: issue.id,
      ruleId: issue.ruleId,
      severity: issue.severity,
      title: issue.help,
      description: issue.description,
      priority: priorityForSeverity(issue.severity),
      status: "to_do",
      sourceUrl: issue.scanPageId ? pageById.get(issue.scanPageId)?.url ?? scan.baseUrl : scan.baseUrl,
      projectKey: project.projectKey,
      projectLabel: project.projectLabel,
    });
    written++;
  }
  return written;
}

function priorityForSeverity(severity: string | null | undefined): string {
  switch (severity) {
    case "critical":
      return "urgent";
    case "moderate":
      return "high";
    case "minor":
      return "medium";
    default:
      return "low";
  }
}

export async function listReports(workspaceId: string, limit = 50): Promise<Report[]> {
  const snap = await db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("reports")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => readDoc<Report>(d.id, d.data())!);
}

export async function getReport(workspaceId: string, reportId: string): Promise<Report | null> {
  return getDoc<Report>(
    db().collection("workspaces").doc(workspaceId).collection("reports").doc(reportId)
  );
}

export async function findPublicReport(token: string): Promise<{
  report: Report;
  workspace: Workspace;
} | null> {
  const share = await getDoc<{ id: string; workspaceId: string; reportId: string }>(
    db().collection("publicReportShares").doc(token)
  );
  if (!share) return null;
  const [workspace, report] = await Promise.all([
    getWorkspace(share.workspaceId),
    getReport(share.workspaceId, share.reportId),
  ]);
  if (!workspace || !report) return null;
  return { workspace, report };
}

export async function createOrUpdateReport(
  workspaceId: string,
  report: Partial<Report> & { scanJobId: string; title: string; createdBy?: string | null }
): Promise<Report> {
  const reportId = report.id ?? id();
  const row: Report = {
    id: reportId,
    workspaceId,
    scanJobId: report.scanJobId,
    title: report.title,
    reportType: report.reportType ?? "full",
    summaryText: report.summaryText ?? null,
    disclaimerText:
      report.disclaimerText ??
      "This automated report is not a legal certification. Human review remains required.",
    sectionsJson: report.sectionsJson ?? null,
    exportPath: null,
    publicShareToken: report.publicShareToken ?? null,
    sharedAt: report.sharedAt ?? null,
    createdBy: report.createdBy ?? null,
    createdAt: report.createdAt ?? now(),
    updatedAt: now(),
  };
  await db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("reports")
    .doc(reportId)
    .set(row, { merge: true });
  return row;
}

export async function setReportShare(
  workspaceId: string,
  reportId: string,
  token: string | null
) {
  const reportRef = db().collection("workspaces").doc(workspaceId).collection("reports").doc(reportId);
  if (token) {
    await db().collection("publicReportShares").doc(token).set({
      workspaceId,
      reportId,
      createdAt: now(),
    });
    await reportRef.set({ publicShareToken: token, sharedAt: now(), updatedAt: now() }, { merge: true });
  } else {
    const report = await getDoc<Report>(reportRef);
    if (report?.publicShareToken) {
      await db().collection("publicReportShares").doc(report.publicShareToken).delete().catch(() => {});
    }
    await reportRef.set(
      { publicShareToken: null, sharedAt: null, updatedAt: now() },
      { merge: true }
    );
  }
}

export async function getInvitationByToken(
  token: string
): Promise<WorkspaceInvitation | null> {
  return getDoc<WorkspaceInvitation>(db().collection("workspaceInvitations").doc(token));
}

export function maxPersistedIssuesPerScan(): number {
  return Math.max(1, MAX_PERSISTED_ISSUES_PER_SCAN);
}
