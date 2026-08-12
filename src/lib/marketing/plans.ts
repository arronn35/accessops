import { scanCapsForPlan, type PlanTier } from "@/lib/entitlements";

export interface MarketingPlan {
  id: string;
  name: string;
  price: string;
  cadence: string;
  description: string;
  cta: string;
  highlighted?: boolean;
  features: string[];
}

/**
 * Shared between the landing page's pricing band and /pricing so the two
 * can never drift apart.
 */
export const PLANS: MarketingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "€0",
    cadence: "forever",
    description: "Try a single site. See whether Percevia AI fits your workflow.",
    cta: "Start free",
    features: [
      "1 website",
      "Basic findings report (web)",
      "AI explanations (limited)",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "€39",
    cadence: "/ month",
    description: "Solo founders and freelancers managing a few sites.",
    cta: "Get started",
    features: [
      "3 websites",
      "AI explanations & remediation",
      "PDF export",
      "Email support",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    price: "€129",
    cadence: "/ month",
    description: "Agencies running audits across client sites.",
    cta: "Get started",
    highlighted: true,
    features: [
      "Multiple client workspaces",
      "Branded client reports",
      "Remediation board",
      "Priority support",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "€249",
    cadence: "/ month",
    description: "Product teams collaborating on internal apps.",
    cta: "Get started",
    features: [
      "Roles & permissions",
      "Advanced export (CSV / API)",
      "Shared remediation backlog",
      "SLA support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "talk to us",
    description: "Regulated industries, large estates, and bespoke hosting.",
    cta: "Contact sales",
    features: [
      "Private / on-prem scanning (roadmap)",
      "SSO (SAML / OIDC) — roadmap",
      "Custom DPA",
      "Dedicated region & residency",
      "Local scanner roadmap",
    ],
  },
];

/**
 * Limit lines come from the same source the API enforces
 * (scanCapsForPlan), so pricing copy cannot drift from real behavior.
 */
export function limitFeatures(planId: string): string[] {
  if (planId === "enterprise") return [];
  const caps = scanCapsForPlan(planId as PlanTier);
  return [
    `${caps.dailyScanCap} scan${caps.dailyScanCap === 1 ? "" : "s"} per day`,
    `Up to ${caps.maxPagesCap} page${caps.maxPagesCap === 1 ? "" : "s"} per scan`,
  ];
}

export function planFeatures(plan: MarketingPlan): string[] {
  return [...limitFeatures(plan.id), ...plan.features];
}
