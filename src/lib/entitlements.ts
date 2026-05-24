export type PlanTier = "free" | "starter" | "agency" | "team" | "enterprise";
export type WorkspaceRole =
  | "owner"
  | "admin"
  | "developer"
  | "auditor"
  | "client_viewer"
  | "report_viewer";

export const TESTER_ADMIN_PLAN: PlanTier = "enterprise";
export const TESTER_ADMIN_ROLE: WorkspaceRole = "owner";

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

export function scanCapsForPlan(plan: PlanTier): {
  dailyScanCap: number;
  maxPagesCap: number;
  visualEvidenceMaxPerScan: number;
} {
  switch (plan) {
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
