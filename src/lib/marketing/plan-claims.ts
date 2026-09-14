/**
 * What keeps each pricing claim true.
 *
 * Pricing copy is a promise to someone who is paying. This registry names, for
 * every feature line on every plan card, the mechanism that makes it real --
 * and where there is no mechanism, says so out loud.
 *
 * The contract test refuses to let a feature line exist without an entry, and
 * refuses to let the set of unenforced claims grow silently. Adding a paid
 * promise therefore forces a choice: implement it, or record it here as a
 * known gap. It cannot simply appear on the pricing page.
 *
 * `verify` is deliberately a predicate over the entitlement functions rather
 * than a description, so a claim stops being "enforced" the moment the
 * entitlement behind it stops differing between plans.
 */
import {
  agencyBrandingEnabled,
  allowedRolesForPlan,
  memberLimitForPlan,
  monitorCapsForPlan,
  scanCapsForPlan,
} from "@/lib/entitlements";

export type ClaimEnforcement =
  | {
      kind: "enforced";
      /** Where the difference actually lives. */
      mechanism: string;
      /** True while the entitlement really does differ as advertised. */
      verify: () => boolean;
    }
  | {
      /** A human commitment (support, SLA, onboarding). Not code. */
      kind: "advisory";
      note: string;
    }
  | {
      /** The product does not implement this. The claim is currently unbacked. */
      kind: "unenforced";
      gap: string;
    };

/** Keyed by `${planId}:${feature}` exactly as the feature appears in PLANS. */
export const PLAN_CLAIMS: Record<string, ClaimEnforcement> = {
  // --- Free ---
  "free:1 website": {
    kind: "unenforced",
    gap: "No website/site count limit exists anywhere. Scans are capped per day and per page, never by distinct site.",
  },
  "free:Basic findings report (web)": {
    kind: "unenforced",
    gap: "Report format is not plan-gated; a free workspace can export PDF and CSV like any other.",
  },
  "free:AI explanations (limited)": {
    kind: "unenforced",
    gap: "AI usage is rate-limited per workspace, identically for every plan. There is no plan-level AI allowance.",
  },

  // --- Starter ---
  "starter:3 websites": {
    kind: "unenforced",
    gap: "Same missing website limit as the free tier.",
  },
  "starter:AI explanations & remediation": {
    kind: "unenforced",
    gap: "Neither AI explanations nor remediation tasks are plan-gated; both are role-gated only.",
  },
  "starter:PDF export": {
    kind: "unenforced",
    gap: "Export format is gated by the export_reports permission, not by plan.",
  },
  "starter:Email support": {
    kind: "advisory",
    note: "Support commitment, delivered by people rather than by the product.",
  },

  // --- Agency ---
  "agency:Multiple client workspaces": {
    kind: "unenforced",
    gap: "There is no way to create or switch workspaces. setCurrentWorkspace exists but no route or UI calls it, so a user has exactly one workspace.",
  },
  "agency:Branded client reports": {
    kind: "enforced",
    mechanism: "agencyBrandingEnabled(plan) drives the report footer attribution.",
    verify: () => !agencyBrandingEnabled("starter") && agencyBrandingEnabled("agency"),
  },
  "agency:Remediation board": {
    kind: "unenforced",
    gap: "Remediation tasks are gated by the manage_remediation permission, which every plan's owner holds.",
  },
  "agency:Priority support": {
    kind: "advisory",
    note: "Support commitment, delivered by people rather than by the product.",
  },

  // --- Team ---
  "team:Roles & permissions": {
    kind: "enforced",
    mechanism: "allowedRolesForPlan(plan) limits which roles can be invited.",
    verify: () =>
      allowedRolesForPlan("team").length > allowedRolesForPlan("starter").length &&
      allowedRolesForPlan("free").length === 1,
  },
  "team:Advanced export (CSV / API)": {
    kind: "unenforced",
    gap: "CSV export checks the export_reports permission only. A starter owner can already export CSV.",
  },
  "team:Shared remediation backlog": {
    kind: "unenforced",
    gap: "The remediation backlog is workspace-scoped for every plan; nothing about it is team-only.",
  },
  "team:SLA support": {
    kind: "advisory",
    note: "Support commitment, delivered by people rather than by the product.",
  },

  // --- Enterprise ---
  "enterprise:Everything in Team": {
    kind: "enforced",
    mechanism: "Enterprise caps are at least as high as team's on every axis.",
    verify: () => {
      const team = scanCapsForPlan("team");
      const ent = scanCapsForPlan("enterprise");
      return (
        ent.dailyScanCap >= team.dailyScanCap &&
        ent.maxPagesCap >= team.maxPagesCap &&
        memberLimitForPlan("enterprise") >= memberLimitForPlan("team") &&
        monitorCapsForPlan("enterprise").maxMonitors >=
          monitorCapsForPlan("team").maxMonitors
      );
    },
  },
  "enterprise:All current Percevia AI features": {
    kind: "advisory",
    note: "Scope statement rather than a specific entitlement.",
  },
  "enterprise:Custom usage limits and workspace structure": {
    kind: "advisory",
    note: "Negotiated per contract; caps are environment-configurable.",
  },
  "enterprise:Custom DPA": {
    kind: "advisory",
    note: "Legal agreement, not a product entitlement.",
  },
  "enterprise:Coordinated region and residency options": {
    kind: "advisory",
    note: "Deployment arrangement agreed per contract.",
  },
  "enterprise:Priority onboarding and support": {
    kind: "advisory",
    note: "Support commitment, delivered by people rather than by the product.",
  },
};

export function claimKey(planId: string, feature: string): string {
  return `${planId}:${feature}`;
}

/**
 * Claims currently shipped with nothing behind them.
 *
 * This list is asserted exactly by the contract test. Shrinking it means a gap
 * was closed; growing it is a deliberate, reviewed decision, not an accident.
 */
export const KNOWN_UNENFORCED_CLAIMS: string[] = Object.entries(PLAN_CLAIMS)
  .filter(([, enforcement]) => enforcement.kind === "unenforced")
  .map(([key]) => key)
  .sort();
