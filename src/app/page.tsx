import Link from "next/link";
import {
  ArrowRight, ShieldCheck, Sparkles, Eye, ScanLine, Lock, UserCheck, FileBarChart2, Workflow, Code2,
  Globe, ChevronDown, CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";

export const metadata = {
  title: "maitrico AccessOps AI — Accessibility operations, not one-click compliance",
};

const TRUST = [
  { icon: ScanLine, label: "WCAG-oriented checks" },
  { icon: Sparkles, label: "AI remediation guidance" },
  { icon: Lock, label: "Privacy-first scanning" },
  { icon: UserCheck, label: "Human review friendly" },
  { icon: ShieldCheck, label: "No overlay required" },
];

const TARGET_USERS = [
  { title: "Agencies", body: "Run audits across client sites, share branded reports, manage remediation in one place." },
  { title: "Freelancers", body: "Offer a professional accessibility service without building one from scratch." },
  { title: "E-commerce owners", body: "Catch issues before they cost you customers — or compliance complaints." },
  { title: "Product teams", body: "Bake accessibility into the release cycle. Track regressions over time." },
  { title: "Startup founders", body: "Ship with a credible accessibility posture from day one." },
  { title: "Developers", body: "Code-aware fix suggestions for React, Next.js, HTML, Shopify, WordPress, Webflow, Framer." },
];

const FAQ = [
  {
    q: "Does this make my site WCAG compliant?",
    a: "No. AccessOps AI helps identify and manage accessibility issues. We do not guarantee compliance with WCAG, ADA, EAA, Section 508, or EN 301 549. Automated tools cannot detect every issue — qualified human review is part of any real compliance effort.",
  },
  {
    q: "Is this an accessibility overlay?",
    a: "No. We do not offer or recommend overlays as a substitute for genuine remediation. AccessOps AI is operations tooling for real fixes.",
  },
  {
    q: "What happens to my scan data?",
    a: "Scan data stays in your workspace and is retained for 12 months by default. Screenshots are opt-in and off by default. Hosted in the EU by default; US and other regions available on higher plans.",
  },
  {
    q: "Will AI fix issues automatically?",
    a: "No. AI generates suggestions you can review, refine, and apply manually. Every AI suggestion in AccessOps AI ships with a 'Review before implementation' notice.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-paper text-ink-900">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-paper/85 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" aria-label="maitrico AccessOps AI home">
            <Logo variant="lockup" />
          </Link>
          <nav aria-label="Primary" className="hidden md:flex items-center gap-6 text-sm">
            <Link href="#how" className="text-ink-700 hover:text-ink-900">How it works</Link>
            <Link href="#audience" className="text-ink-700 hover:text-ink-900">Who it&apos;s for</Link>
            <Link href="#privacy" className="text-ink-700 hover:text-ink-900">Privacy stance</Link>
            <Link href="/pricing" className="text-ink-700 hover:text-ink-900">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/sign-in"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-900 h-10 px-3 rounded-md"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
            >
              Start free scan <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-aurora bg-grid" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 lg:px-8 pt-16 lg:pt-24 pb-12 lg:pb-20">
          <Badge tone="ai" className="inline-flex">
            <Sparkles className="size-3" aria-hidden /> Accessibility operations, not one-click compliance
          </Badge>
          <h1 className="mt-5 text-4xl lg:text-6xl font-semibold tracking-tight max-w-4xl leading-[1.05]">
            Find accessibility issues before they become user and compliance problems.
          </h1>
          <p className="mt-5 text-lg lg:text-xl text-ink-600 max-w-2xl leading-relaxed">
            AI-assisted accessibility scanning, remediation guidance, and audit-ready reporting for
            websites, agencies, and product teams.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-md bg-navy-900 text-paper text-base font-medium hover:bg-navy-800"
            >
              Start free scan <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-md ring-1 ring-line bg-paper text-base font-medium text-ink-900 hover:bg-canvas-2"
            >
              <FileBarChart2 className="size-4" aria-hidden /> See how it works
            </Link>
          </div>

          {/* Trust strip */}
          <ul className="mt-12 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {TRUST.map((t) => {
              const Icon = t.icon;
              return (
                <li
                  key={t.label}
                  className="flex items-center gap-2 rounded-md bg-paper/80 backdrop-blur ring-1 ring-line p-3 text-xs font-medium text-ink-700"
                >
                  <Icon className="size-4 text-navy-700 shrink-0" aria-hidden /> {t.label}
                </li>
              );
            })}
          </ul>

          {/* Hero preview */}
          <div className="mt-12 relative rounded-xl overflow-hidden ring-1 ring-line shadow-[var(--shadow-pop)] bg-paper">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-0 min-h-[280px]">
              <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-line">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="size-4 text-ink-500" aria-hidden />
                  <span className="font-mono text-sm text-ink-700">northwind-shop.example</span>
                  <Badge tone="success" size="sm" className="ml-2">Scan complete</Badge>
                </div>
                <div className="flex items-end gap-5">
                  <div className="size-24 rounded-full ring-[10px] ring-canvas-2 relative inline-flex items-center justify-center bg-paper">
                    <span className="text-3xl font-semibold tabular-nums">78</span>
                  </div>
                  <div className="text-xs space-y-1.5">
                    <p className="text-ink-500">47 pages · 23 findings</p>
                    <p className="text-rose-700 font-medium">5 critical</p>
                    <p className="text-amber-700">11 moderate</p>
                    <p className="text-blue-700">7 minor</p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {[
                    { sev: "critical", text: "“Add to cart” button has no accessible name" },
                    { sev: "critical", text: "Product price has 3.8:1 contrast" },
                    { sev: "moderate", text: "Headings skip h1 → h4 on home" },
                  ].map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs p-2 rounded ring-1 ring-line"
                    >
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{
                          background:
                            r.sev === "critical"
                              ? "var(--color-rose-500)"
                              : r.sev === "moderate"
                              ? "var(--color-amber-500)"
                              : "var(--color-blue-500)",
                        }}
                      />
                      <span className="text-ink-700 truncate">{r.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5 md:p-6 bg-canvas/50">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-purple-600 mb-2">
                  <Sparkles className="size-3.5" aria-hidden /> AI explanation
                </div>
                <p className="text-sm text-ink-700 leading-relaxed">
                  Three critical findings on the product detail and checkout templates explain most of
                  the score gap. Fixing the icon-button names and raising price-text contrast would
                  address the majority of blocking issues for screen reader and low-vision users.
                </p>
                <p className="text-[11px] text-purple-600 mt-3 font-medium">
                  {COMPLIANCE_COPY.AI_REVIEW_REQUIRED}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-3">
              The problem
            </p>
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight leading-tight">
              Accessibility tooling today picks the wrong side of a tradeoff.
            </h2>
          </div>
          <ul className="space-y-4 text-base text-ink-700">
            <ProblemItem
              title="Overlays make legal promises they can’t keep"
              body="Widgets that promise &lsquo;one-click compliance&rsquo; haven&apos;t reduced lawsuits. They&apos;ve created new ones."
            />
            <ProblemItem
              title="Raw scanner output is unreadable"
              body="Long lists of axe violations with no context, no fix, no owner. Reports go nowhere."
            />
            <ProblemItem
              title="Manual audits are slow and expensive"
              body="Necessary, but they can&apos;t happen every sprint. Teams need something in-between."
            />
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-canvas-2/60 border-y border-line py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-3">
            How it works
          </p>
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight leading-tight max-w-3xl">
            Scan, understand, remediate, report — in that order.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {[
              { icon: ScanLine, title: "1. Scan", body: "Crawl single pages, multi-page templates, or sitemaps. Screenshots opt-in." },
              { icon: Eye, title: "2. Understand", body: "AI explains each issue in plain language and shows who it affects." },
              { icon: Workflow, title: "3. Remediate", body: "Code-aware suggestions, manual review checklist, assigned tasks on a board." },
              { icon: FileBarChart2, title: "4. Report", body: "Audit-ready PDF, HTML, and CSV exports with WCAG mapping. No legal promises." },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="rounded-lg bg-paper ring-1 ring-line p-5">
                  <span className="size-9 rounded-md bg-navy-900 text-paper inline-flex items-center justify-center mb-3">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <h3 className="font-semibold text-ink-900">{s.title}</h3>
                  <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Target users */}
      <section id="audience" className="max-w-6xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-3">
          Who AccessOps AI is for
        </p>
        <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight leading-tight">
          Built for the people who actually have to fix things.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-10">
          {TARGET_USERS.map((u) => (
            <div key={u.title} className="rounded-lg ring-1 ring-line bg-paper p-5">
              <h3 className="font-semibold text-ink-900">{u.title}</h3>
              <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example report */}
      <section className="bg-navy-900 text-paper py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-paper/60 font-semibold mb-3">
                Example report
              </p>
              <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight leading-tight">
                A client-ready PDF, not a wall of red flags.
              </h2>
              <p className="text-paper/70 mt-4 leading-relaxed max-w-md">
                Executive summary in plain language. Findings mapped to WCAG criteria. A roadmap your
                client&apos;s engineering team can actually pick up. And a calm, accurate disclaimer
                about what automated scanning can and can&apos;t prove.
              </p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 mt-6 h-11 px-4 rounded-md bg-paper text-navy-900 text-sm font-medium hover:bg-canvas"
              >
                Run your first scan <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="rounded-lg overflow-hidden ring-1 ring-paper/10 bg-paper text-ink-900 p-6 shadow-[var(--shadow-pop)]">
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-ink-500">
                Accessibility assessment
              </p>
              <h3 className="text-lg font-semibold mt-1">Northwind Shop — May 2026 scan</h3>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <Stat label="Pages" value="47" />
                <Stat label="Findings" value="23" />
                <Stat label="Score" value="78" />
              </div>
              <ul className="mt-5 space-y-2 text-xs text-ink-700 border-t border-line pt-4">
                <li>1. Executive summary</li>
                <li>2. Top risks</li>
                <li>3. Findings detail</li>
                <li>4. Remediation roadmap</li>
                <li>5. Reviewer checklist</li>
              </ul>
              <p className="text-[10px] text-ink-500 mt-4 leading-relaxed border-t border-line pt-3">
                {COMPLIANCE_COPY.REPORT_NOT_LEGAL}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy stance */}
      <section id="privacy" className="max-w-6xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-3">
          Privacy &amp; compliance stance
        </p>
        <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight leading-tight max-w-3xl">
          We&apos;d rather be useful than make legal promises.
        </h2>
        <div className="mt-8">
          <NoGuaranteeBanner />
        </div>
        <ul className="grid sm:grid-cols-2 gap-4 mt-8 text-sm">
          {[
            "Screenshots are off by default. You opt in per scan.",
            "EU-hosted by default. US and UK regions on higher plans.",
            "AI suggestions are reviewable; nothing is auto-applied.",
            "We do not sell scan data and do not train models on customer code.",
            "Workspace data is exportable and deletable on demand.",
            "Subprocessor list available in the Compliance Center.",
          ].map((p, i) => (
            <li key={i} className="flex items-start gap-2.5 text-ink-700 leading-relaxed">
              <CheckCircle2 className="size-4 text-green-700 shrink-0 mt-0.5" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </section>

      {/* Pricing preview */}
      <section className="bg-canvas-2/60 border-y border-line py-16">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 text-center">
          <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-3">
            Pricing preview
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight">
            From free to enterprise — five tiers, honest scope.
          </h2>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 mt-5 h-11 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
          >
            Compare plans <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-3">
          FAQ
        </p>
        <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight mb-8">
          Direct answers to the questions every buyer asks.
        </h2>
        <ul className="space-y-3">
          {FAQ.map((f) => (
            <li key={f.q} className="rounded-md ring-1 ring-line bg-paper">
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-5 text-sm font-medium text-ink-900 min-h-[56px]">
                  <span>{f.q}</span>
                  <ChevronDown className="size-4 text-ink-500 group-open:rotate-180 transition-transform" aria-hidden />
                </summary>
                <p className="px-5 pb-5 text-sm text-ink-700 leading-relaxed">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 pb-20">
        <div className="rounded-xl bg-navy-900 text-paper p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-[var(--shadow-pop)]">
          <div>
            <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight">
              Run your first scan in under a minute.
            </h2>
            <p className="text-paper/70 mt-2 max-w-md">
              No credit card. No overlay. No legal promises we can&apos;t keep.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-paper text-navy-900 text-base font-medium hover:bg-canvas shrink-0"
          >
            Start free scan <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line py-10">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row sm:items-start justify-between gap-6 text-xs text-ink-500">
          <div className="flex items-center gap-3">
            <Logo variant="wordmark" />
            <span className="text-ink-300">·</span>
            <span>© 2026 maitrico</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <Link href="/pricing" className="hover:text-ink-700">Pricing</Link>
            <Link href="/legal/terms" className="hover:text-ink-700">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-ink-700">Privacy</Link>
            <Link href="/legal/dpa" className="hover:text-ink-700">DPA</Link>
            <Link href="/legal/subprocessors" className="hover:text-ink-700">Subprocessors</Link>
            <Link href="/legal/contact" className="hover:text-ink-700">Contact</Link>
            <Link href="/app/compliance" className="hover:text-ink-700">Compliance Center</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProblemItem({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="size-7 rounded-md bg-navy-900/10 text-navy-900 inline-flex items-center justify-center shrink-0 mt-0.5">
        <Code2 className="size-3.5" aria-hidden />
      </span>
      <div>
        <p className="font-semibold text-ink-900">{title}</p>
        <p className="text-ink-600 mt-1 text-base leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-canvas-2/60 ring-1 ring-line p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-ink-900 mt-0.5">{value}</p>
    </div>
  );
}
