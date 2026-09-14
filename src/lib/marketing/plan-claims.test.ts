/**
 * F12: every pricing claim maps to something real, or is recorded as a gap.
 *
 * The finding was that limit lines are derived from the entitlement source
 * (good) while the hand-written feature lines are not checked against anything
 * (not good). These tests close that: a feature line with no registry entry
 * fails, an "enforced" claim whose entitlement stopped differing fails, and the
 * set of unbacked claims cannot grow without someone editing the expected list.
 */
import { describe, expect, it } from "vitest";
import { PLANS, planFeatures, limitFeatures } from "./plans";
import { PLAN_CLAIMS, KNOWN_UNENFORCED_CLAIMS, claimKey } from "./plan-claims";
import {
  memberLimitForPlan,
  monitorCapsForPlan,
  scanCapsForPlan,
  type PlanTier,
} from "@/lib/entitlements";

const PAID_TIERS: PlanTier[] = ["starter", "agency", "team", "enterprise"];

describe("pricing claims are accounted for", () => {
  it("classifies every feature line on every plan", () => {
    const unclassified: string[] = [];
    for (const plan of PLANS) {
      for (const feature of plan.features) {
        if (!PLAN_CLAIMS[claimKey(plan.id, feature)]) {
          unclassified.push(claimKey(plan.id, feature));
        }
      }
    }

    expect(
      unclassified,
      "Every pricing claim needs an entry in PLAN_CLAIMS saying what makes it " +
        `true, or recording that nothing does:\n  ${unclassified.join("\n  ")}`
    ).toEqual([]);
  });

  it("has no registry entries for claims the pricing page no longer makes", () => {
    const live = new Set(
      PLANS.flatMap((plan) => plan.features.map((f) => claimKey(plan.id, f)))
    );
    const stale = Object.keys(PLAN_CLAIMS).filter((key) => !live.has(key));

    expect(stale, `Stale claim entries:\n  ${stale.join("\n  ")}`).toEqual([]);
  });

  it("every claim marked enforced is still actually enforced", () => {
    const broken: string[] = [];
    for (const [key, enforcement] of Object.entries(PLAN_CLAIMS)) {
      if (enforcement.kind !== "enforced") continue;
      if (!enforcement.verify()) broken.push(`${key} (${enforcement.mechanism})`);
    }

    expect(
      broken,
      "These claims are advertised as plan differences but the entitlements " +
        `behind them no longer differ:\n  ${broken.join("\n  ")}`
    ).toEqual([]);
  });

  it("the set of unbacked claims is exactly what we have signed off", () => {
    // Growing this list is a decision, not an accident. Shrinking it means a
    // gap was closed and the expected list should be trimmed in the same change.
    expect(KNOWN_UNENFORCED_CLAIMS).toEqual([
      "agency:Multiple client workspaces",
      "agency:Remediation board",
      "free:1 website",
      "free:AI explanations (limited)",
      "free:Basic findings report (web)",
      "starter:3 websites",
      "starter:AI explanations & remediation",
      "starter:PDF export",
      "team:Advanced export (CSV / API)",
      "team:Shared remediation backlog",
    ]);
  });

  it("names a concrete gap for every unenforced claim", () => {
    for (const [key, enforcement] of Object.entries(PLAN_CLAIMS)) {
      if (enforcement.kind !== "unenforced") continue;
      expect(enforcement.gap.length, key).toBeGreaterThan(30);
    }
  });
});

describe("quota claims come from the enforced source", () => {
  it("derives the limit lines from scanCapsForPlan, so they cannot drift", () => {
    for (const tier of ["free", "starter", "agency", "team"] as PlanTier[]) {
      const caps = scanCapsForPlan(tier);
      const lines = limitFeatures(tier);
      expect(lines.join(" ")).toContain(String(caps.dailyScanCap));
      expect(lines.join(" ")).toContain(String(caps.maxPagesCap));
    }
  });

  it("does not advertise numeric limits for the bespoke tier", () => {
    expect(limitFeatures("enterprise")).toEqual([]);
  });

  it("gives every paid tier strictly more scanning room than free", () => {
    const free = scanCapsForPlan("free");
    for (const tier of PAID_TIERS) {
      const caps = scanCapsForPlan(tier);
      expect(caps.dailyScanCap, tier).toBeGreaterThan(free.dailyScanCap);
      expect(caps.maxPagesCap, tier).toBeGreaterThan(free.maxPagesCap);
    }
  });

  it("never decreases an entitlement as the price goes up", () => {
    const order: PlanTier[] = ["free", "starter", "agency", "team", "enterprise"];
    for (let i = 1; i < order.length; i++) {
      const lower = order[i - 1];
      const higher = order[i];
      expect(
        scanCapsForPlan(higher).dailyScanCap,
        `${higher} vs ${lower}`
      ).toBeGreaterThanOrEqual(scanCapsForPlan(lower).dailyScanCap);
      expect(memberLimitForPlan(higher)).toBeGreaterThanOrEqual(
        memberLimitForPlan(lower)
      );
      expect(monitorCapsForPlan(higher).maxMonitors).toBeGreaterThanOrEqual(
        monitorCapsForPlan(lower).maxMonitors
      );
    }
  });

  it("shows the derived limits ahead of the hand-written claims", () => {
    const starter = PLANS.find((p) => p.id === "starter")!;
    const features = planFeatures(starter);
    expect(features[0]).toContain("scans per day");
  });
});
