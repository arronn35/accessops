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
  isScanWorkerHeartbeatStale,
  WORKER_STALE_RECLAIM_LIMIT,
  WORKER_STALE_RUNNING_MS,
} from "./scan-lifecycle";
import type {
  AccessibilityIssue,
  AuditLog,
  IssueGroup,
  PrivacySettings,
  RemediationTask,
  Report,
  ScanJob,
  ScanPage,
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

export async function countInflightScans(workspaceId: string): Promise<number> {
  const snap = await db()
    .collection("workspaces")
    .doc(workspaceId)
    .collection("scans")
    .where("status", "in", ["queued", "running"])
    .get();
  return snap.docs
    .map((d) => readDoc<ScanJob>(d.id, d.data()))
    .filter((job): job is ScanJob => {
      if (!job) return false;
      if (job.status === "queued") return true;
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
 * Cross-workspace poll for jobs the browser worker should pick up: anything
 * still `queued` (FIFO by creation), plus `running` jobs whose heartbeat has
 * gone stale so a restarted worker can reclaim them.
 *
 * Uses Firestore collection-group queries. The first run will throw a
 * FAILED_PRECONDITION error containing a console link to create the required
 * single-field collection-group indexes on `scans` (status, createdAt /
 * processorHeartbeatAt) — create them once, then polling works.
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

  if (out.length < limit) {
    const staleBefore = Timestamp.fromMillis(Date.now() - WORKER_STALE_RUNNING_MS);
    const stale = await db()
      .collectionGroup("scans")
      .where("status", "==", "running")
      .where("processorHeartbeatAt", "<", staleBefore)
      .orderBy("processorHeartbeatAt", "asc")
      .limit(limit - out.length)
      .get();
    stale.docs.forEach(add);
  }

  if (out.length < limit) {
    const running = await db()
      .collectionGroup("scans")
      .where("status", "==", "running")
      .limit(Math.max((limit - out.length) * 5, 25))
      .get();
    running.docs
      .filter((doc) => isScanWorkerHeartbeatStale(readDoc<ScanJob>(doc.id, doc.data())!))
      .forEach(add);
  }

  return out.slice(0, limit);
}

/**
 * Atomically claim a scan for processing. Succeeds only if the job is still
 * `queued`, or `running` with a stale heartbeat (orphaned). Returns the claimed
 * job (with status flipped to `running`) or null if another worker won the race
 * or the job is already terminal.
 */
export async function claimScanJob(
  workspaceId: string,
  scanId: string,
  workerId: string
): Promise<ScanJob | null> {
  const ref = scanRef(workspaceId, scanId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<ScanJob>(snap.id, snap.data());
    if (!job) return null;

    const heartbeatStale = isScanWorkerHeartbeatStale(job);
    const claimable =
      job.status === "queued" || (job.status === "running" && heartbeatStale);
    if (!claimable) return null;

    const startedAt = now();
    const staleReclaims = job.status === "running" ? job.queueAttempts ?? 0 : 0;
    if (job.status === "running" && staleReclaims >= WORKER_STALE_RECLAIM_LIMIT) {
      tx.set(
        ref,
        {
          status: "failed",
          progressStep: "failed",
          completedAt: startedAt,
          errorMessage: "worker_heartbeat_stale",
          processorError: "worker_heartbeat_stale",
          updatedAt: startedAt,
        },
        { merge: true }
      );
      return null;
    }

    tx.set(
      ref,
      stripUndefined({
        status: "running",
        progressStep: job.storeScreenshots ? "starting_browser" : "crawling",
        startedAt: job.startedAt ?? startedAt,
        processorStartedAt: startedAt,
        processorHeartbeatAt: startedAt,
        processorError: null,
        claimedBy: workerId,
        queueAttempts: job.status === "running" ? staleReclaims + 1 : job.queueAttempts ?? 0,
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
      queueAttempts: job.status === "running" ? staleReclaims + 1 : job.queueAttempts ?? 0,
    };
  });
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
  page: Omit<ScanPage, "id">
): Promise<ScanPage> {
  const pageId = id();
  const row = { id: pageId, ...page };
  await scanRef(workspaceId, scanId).collection("pages").doc(pageId).set(row);
  return row;
}

export async function writeIssue(
  workspaceId: string,
  scanId: string,
  issue: Omit<AccessibilityIssue, "id" | "createdAt" | "updatedAt">
): Promise<AccessibilityIssue> {
  const issueId = id();
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
