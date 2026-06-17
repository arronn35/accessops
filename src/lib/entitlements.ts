import type { MonitorFrequency } from "@/lib/data/types";

export type PlanTier = "free" | "starter" | "agency" | "team" | "enterprise";
export type WorkspaceRole =
  | "owner"
  | "admin"
  | "developer"
  | "auditor"
  | "client_viewer"
  | "report_viewer";

export type WorkspacePermission =
  | "create_scans"
  | "view_scans"
  | "view_ai"
  | "export_reports"
  | "manage_billing"
  | "manage_privacy"
  | "delete_scans"
  | "manage_team"
  | "manage_remediation"
  | "view_remediation";

export const TESTER_ADMIN_PLAN: PlanTier = "enterprise";
export const TESTER_ADMIN_ROLE: WorkspaceRole = "owner";

const PLAN_TIERS: readonly PlanTier[] = [
  "free",
  "starter",
  "agency",
  "team",
  "enterprise",
];

/**
 * Coerce an untrusted plan value into a known PlanTier.
 *
 * Workspace docs come from Firestore, which is not schema-validated, and some
 * predate the current tier names (Drizzle→Firestore migration). A `plan` that
 * is `null`, missing, or a legacy string used to fall through the exhaustive
 * `switch`es below and return `undefined`, which then crashed the caller —
 * e.g. `scanCapsForPlan(plan).maxPagesCap` threw and surfaced as a generic
 * "Couldn't start scan" 500. Unknown values fall back to "free", the safe floor.
 */
export function normalizePlan(plan: unknown): PlanTier {
  return typeof plan === "string" && (PLAN_TIERS as readonly string[]).includes(plan)
    ? (plan as PlanTier)
    : "free";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(normalizeEmail(email));
}

export function bootstrapEntitlementForEmail(email: string | null | undefined): {
  plan: PlanTier;
  role: WorkspaceRole;
} {
  if (isAdminEmail(email)) {
    return { plan: TESTER_ADMIN_PLAN, role: TESTER_ADMIN_ROLE };
  }
  return { plan: "free", role: "owner" };
}

/**
 * Continuous-monitoring entitlement per plan (Layer 2).
 *
 * Compute is the main monitoring risk, so frequency is gated by plan: cheaper
 * tiers get fewer monitors and slower cadences. Free gets none — monitoring is
 * a paid feature. `allowedFrequencies` is ordered fastest→slowest.
 */
export function monitorCapsForPlan(plan: PlanTier): {
  maxMonitors: number;
  allowedFrequencies: MonitorFrequency[];
} {
  switch (normalizePlan(plan)) {
    case "free":
      return { maxMonitors: 0, allowedFrequencies: [] };
    case "starter":
      return { maxMonitors: 3, allowedFrequencies: ["weekly"] };
    case "agency":
      return {
        maxMonitors: 25,
        allowedFrequencies: ["daily", "every_3_days", "weekly"],
      };
    case "team":
      return {
        maxMonitors: 100,
        allowedFrequencies: ["daily", "every_3_days", "weekly"],
      };
    case "enterprise":
      return {
        maxMonitors: 500,
        allowedFrequencies: ["daily", "every_3_days", "weekly"],
      };
  }
}

/**
 * Maximum team members (including the owner) allowed on each plan.
 * Enforced by the team invitation API and the team page UI.
 */
export function memberLimitForPlan(plan: PlanTier): number {
  switch (normalizePlan(plan)) {
    case "free":
      return 1;
    case "starter":
      return 3;
    case "agency":
      return 10;
    case "team":
      return 25;
    case "enterprise":
      return 200;
  }
}

/**
 * Which workspace roles a plan is allowed to grant to new members.
 * Lower tiers restrict the available role set.
 */
export function allowedRolesForPlan(plan: PlanTier): WorkspaceRole[] {
  switch (normalizePlan(plan)) {
    case "free":
      return ["owner"];
    case "starter":
      return ["owner", "admin", "developer"];
    case "agency":
      return ["owner", "admin", "developer", "auditor", "client_viewer", "report_viewer"];
    case "team":
    case "enterprise":
      return ["owner", "admin", "developer", "auditor", "client_viewer", "report_viewer"];
  }
}

export const ROLE_PERMISSIONS: Record<WorkspaceRole, Record<WorkspacePermission, boolean>> = {
  owner: {
    create_scans: true,
    view_scans: true,
    view_ai: true,
    export_reports: true,
    manage_billing: true,
    manage_privacy: true,
    delete_scans: true,
    manage_team: true,
    manage_remediation: true,
    view_remediation: true,
  },
  admin: {
    create_scans: true,
    view_scans: true,
    view_ai: true,
    export_reports: true,
    manage_billing: false,
    manage_privacy: true,
    delete_scans: true,
    manage_team: true,
    manage_remediation: true,
    view_remediation: true,
  },
  developer: {
    create_scans: true,
    view_scans: true,
    view_ai: true,
    export_reports: false,
    manage_billing: false,
    manage_privacy: false,
    delete_scans: false,
    manage_team: false,
    manage_remediation: true,
    view_remediation: true,
  },
  auditor: {
    create_scans: false,
    view_scans: true,
    view_ai: true,
    export_reports: true,
    manage_billing: false,
    manage_privacy: false,
    delete_scans: false,
    manage_team: false,
    manage_remediation: false,
    view_remediation: true,
  },
  client_viewer: {
    create_scans: false,
    view_scans: true,
    view_ai: false,
    export_reports: false,
    manage_billing: false,
    manage_privacy: false,
    delete_scans: false,
    manage_team: false,
    manage_remediation: false,
    view_remediation: true,
  },
  report_viewer: {
    create_scans: false,
    view_scans: false,
    view_ai: false,
    export_reports: false,
    manage_billing: false,
    manage_privacy: false,
    delete_scans: false,
    manage_team: false,
    manage_remediation: false,
    view_remediation: false,
  },
};

export function roleHasPermission(
  role: string | null | undefined,
  permission: WorkspacePermission
): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) return false;
  return ROLE_PERMISSIONS[role as WorkspaceRole][permission];
}

/**
 * Whether a plan may present reports under the workspace's own brand
 * (agency / white-label). Lower tiers always carry the Percevia AI
 * attribution. Used by report rendering and the public share view.
 */
export function agencyBrandingEnabled(plan: PlanTier): boolean {
  return plan === "agency" || plan === "team" || plan === "enterprise";
}

export function scanCapsForPlan(plan: PlanTier): {
  dailyScanCap: number;
  maxPagesCap: number;
  visualEvidenceMaxPerScan: number;
} {
  switch (normalizePlan(plan)) {
    case "free":
      return {
        dailyScanCap: Number(process.env.SCAN_DAILY_CAP_FREE ?? 3),
        maxPagesCap: Number(process.env.SCAN_MAX_PAGES_FREE ?? 3),
        visualEvidenceMaxPerScan: Number(process.env.VISUAL_EVIDENCE_MAX_PER_SCAN_FREE ?? 10),
      };
    case "starter":
      return {
        dailyScanCap: Number(process.env.SCAN_DAILY_CAP_STARTER ?? 50),
        maxPagesCap: Number(process.env.SCAN_MAX_PAGES_STARTER ?? 50),
        visualEvidenceMaxPerScan: Number(process.env.VISUAL_EVIDENCE_MAX_PER_SCAN ?? 50),
      };
    case "agency":
      return {
        dailyScanCap: Number(process.env.SCAN_DAILY_CAP_AGENCY ?? 200),
        maxPagesCap: Number(process.env.SCAN_MAX_PAGES_AGENCY ?? 200),
        visualEvidenceMaxPerScan: Number(process.env.VISUAL_EVIDENCE_MAX_PER_SCAN ?? 100),
      };
    case "team":
      return {
        dailyScanCap: Number(process.env.SCAN_DAILY_CAP_TEAM ?? 500),
        maxPagesCap: Number(process.env.SCAN_MAX_PAGES_TEAM ?? 500),
        visualEvidenceMaxPerScan: Number(process.env.VISUAL_EVIDENCE_MAX_PER_SCAN ?? 200),
      };
    case "enterprise":
      return {
        dailyScanCap: Number(process.env.SCAN_DAILY_CAP_ENTERPRISE ?? 1000),
        maxPagesCap: Number(process.env.SCAN_MAX_PAGES_ENTERPRISE ?? 1000),
        visualEvidenceMaxPerScan: Number(process.env.VISUAL_EVIDENCE_MAX_PER_SCAN ?? 500),
      };
  }
}
