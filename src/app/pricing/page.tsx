import Link from "next/link";
import { Check, ArrowLeft, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/brand/Logo";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { cn } from "@/lib/utils";
import { PricingCta } from "./pricing-cta";

export const metadata = { title: "Pricing — maitrico AccessOps AI" };

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "€0",
    cadence: "forever",
    description: "Try a single site. See whether AccessOps AI fits your workflow.",
    cta: "Start free",
    features: [
      "1 website",
      "3 scans per month",
      "Single-page scan only",
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
      "Multi-page crawl up to 50 pages",
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
      "Up to 200 pages per scan",
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
      "Up to 500 pages per scan",
      "SLA support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "",
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

const FAQ = [
  {
    q: "Does AccessOps AI make my site WCAG compliant?",
    a: "No. AccessOps AI helps identify and manage accessibility issues. Automated tools cannot detect every issue, and we do not guarantee compliance with WCAG, ADA, EAA, Section 508, or EN 301 549. Always involve qualified accessibility specialists for formal compliance.",
  },
  {
    q: "Are AI suggestions safe to apply directly?",
    a: "AI suggestions are starting points. They must be reviewed by a developer or specialist before applying, especially for keyboard handling, focus management, and ARIA patterns.",
  },
  {
    q: "Where is scan data stored?",
    a: "EU (Frankfurt) by default. US and UK regions are available on Team and Enterprise plans.",
  },
  {
    q: "Is this an accessibility overlay?",
    a: "No. We do not offer or recommend accessibility overlays. AccessOps AI is for genuine remediation operations.",
  },
];

export default function PricingPage() {
  return (
    <div className="bg-canvas-2 min-h-screen pb-20">
      <header className="bg-paper border-b border-line">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="wordmark" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-700 hover:text-ink-900">
              <ArrowLeft className="size-4" aria-hidden /> Back home
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
            >
              Start free scan
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16 text-center">
        <Badge tone="ai" className="mb-4 inline-flex">
          <Sparkles className="size-3" aria-hidden /> Privacy-first · No overlay
        </Badge>
        <h1 className="text-3xl lg:text-5xl font-semibold tracking-tight text-ink-900">
          Pricing that scales with your team
        </h1>
        <p className="text-base text-ink-600 mt-3 max-w-2xl mx-auto">
          Honest tiers. No hidden &quot;compliance&quot; upsells. AccessOps AI is positioned against
          one-click compliance — every plan reflects that.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={cn(
                "rounded-lg p-5 ring-1 bg-paper flex flex-col",
                p.highlighted
                  ? "ring-2 ring-navy-900 shadow-[var(--shadow-card)] lg:-translate-y-2"
                  : "ring-line"
              )}
            >
              {p.highlighted && (
                <Badge tone="navy" className="self-start mb-3" size="sm">
                  Most popular
                </Badge>
              )}
              <h2 className="text-base font-semibold text-ink-900">{p.name}</h2>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-ink-900 tracking-tight">{p.price}</span>
                {p.cadence && <span className="text-xs text-ink-500">{p.cadence}</span>}
              </p>
              <p className="text-xs text-ink-600 mt-2 leading-relaxed min-h-[48px]">{p.description}</p>
              <ul className="space-y-2 mt-4 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ink-700 leading-snug">
                    <Check className="size-3.5 text-green-700 shrink-0 mt-0.5" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              <PricingCta
                planId={p.id}
                label={p.cta}
                highlighted={p.highlighted}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 lg:px-8 mt-16">
        <NoGuaranteeBanner />
      </section>

      <section className="max-w-3xl mx-auto px-4 lg:px-8 mt-16">
        <h2 className="text-xl font-semibold text-ink-900 tracking-tight mb-6">FAQ</h2>
        <ul className="space-y-4">
          {FAQ.map((f) => (
            <li key={f.q} className="rounded-md bg-paper ring-1 ring-line p-5">
              <h3 className="text-sm font-semibold text-ink-900">{f.q}</h3>
              <p className="text-sm text-ink-700 mt-2 leading-relaxed">{f.a}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-line mt-16 pt-8 pb-2">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-700">Home</Link>
          <Link href="/legal/terms" className="hover:text-ink-700">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-ink-700">Privacy</Link>
          <Link href="/legal/dpa" className="hover:text-ink-700">DPA</Link>
          <Link href="/legal/subprocessors" className="hover:text-ink-700">Subprocessors</Link>
          <Link href="/legal/contact" className="hover:text-ink-700">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
