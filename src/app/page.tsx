import Link from "next/link";
import type { CSSProperties } from "react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SectionTag, Aside } from "@/components/marketing/SectionTag";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { PLANS, planFeatures } from "@/lib/marketing/plans";
import { verifySessionCookie } from "@/lib/auth/session";

export const metadata = {
  title: "maitrico Percevia AI — Accessibility operations, not one-click compliance",
};
export const dynamic = "force-dynamic";

/* Shared scales. The display sizes are the system, not decoration. */
const H2 =
  "font-extrabold leading-[0.98] tracking-[-0.04em] text-[clamp(2.1rem,4.2vw,3.6rem)]";
const HEAD_PAD = "px-6 sm:px-10 pt-12 pb-9";
/** Cell grids draw their own hairlines: 1px of rule showing through the gap. */
const GRID = "grid gap-px bg-rule";

const TRUST = [
  "WCAG-oriented checks",
  "AI remediation guidance",
  "Privacy-first scanning",
  "Human review friendly",
  "No overlay required",
];

const PROBLEMS = [
  {
    title: "Overlays make legal promises they can’t keep",
    body: "Widgets that promise ‘one-click compliance’ haven’t reduced lawsuits. They’ve created new ones.",
  },
  {
    title: "Raw scanner output is unreadable",
    body: "Long lists of axe violations with no context, no fix, no owner. Reports go nowhere.",
  },
  {
    title: "Manual audits are slow and expensive",
    body: "Necessary, but they can’t happen every sprint. Teams need something in-between.",
  },
];

const METHOD = [
  { title: "Scan", body: "Crawl single pages, multi-page templates, or sitemaps. Screenshots opt-in." },
  { title: "Understand", body: "AI explains each issue in plain language and shows who it affects." },
  { title: "Remediate", body: "Code-aware suggestions, manual review checklist, assigned tasks on a board." },
  { title: "Report", body: "Audit-ready PDF, HTML, and CSV exports with WCAG mapping. No legal promises." },
];

const TARGET_USERS = [
  { title: "Agencies", body: "Run audits across client sites, share branded reports, manage remediation in one place." },
  { title: "Freelancers", body: "Offer a professional accessibility service without building one from scratch." },
  { title: "E-commerce owners", body: "Catch issues before they cost you customers — or compliance complaints." },
  { title: "Product teams", body: "Bake accessibility into the release cycle. Track regressions over time." },
  { title: "Startup founders", body: "Ship with a credible accessibility posture from day one." },
];

const DEV_STACKS = ["React", "Next.js", "HTML / CSS", "Shopify", "WordPress", "Webflow", "Framer"];

const REPORT_SECTIONS = [
  "Executive summary",
  "Top risks",
  "Findings detail",
  "Remediation roadmap",
  "Reviewer checklist",
];

const PRIVACY_POINTS = [
  "Screenshots are off by default. You opt in per scan.",
  "EU-hosted by default. US and UK regions on higher plans.",
  "AI suggestions are reviewable; nothing is auto-applied.",
  "We do not sell scan data and do not train models on customer code.",
  "Workspace data is exportable and deletable on demand.",
  "Subprocessor list available in the Compliance Center.",
];

const COMPLIANCE_CARDS = [
  {
    title: "No compliance guarantee",
    body: "Findings and reports are assessment output, never certification under any law or standard.",
  },
  {
    title: "Human review required",
    body: "Automated checks catch roughly 30–50% of issues. Keyboard, screen reader and zoom passes stay manual.",
  },
  {
    title: "AI use disclosure",
    body: "AI is optional, off by default, and every output carries a review notice before implementation.",
  },
  {
    title: "Overlay stance",
    body: "We do not ship an overlay and never recommend one as a substitute for real fixes.",
  },
];

const RETENTION = [
  { label: "Scan findings", value: "365 days (default)" },
  { label: "Visual evidence", value: "30 days" },
  { label: "Audit logs", value: "at least 12 months" },
];

const SUBPROCESSORS = [
  { name: "Vercel", body: "Application hosting and API — US / global edge" },
  { name: "Firebase", body: "Authentication and Firestore workspace storage — configured project region" },
  { name: "Google Cloud Run", body: "Browser scan worker (Playwright + axe-core), content transient — EU (europe-west1)" },
  { name: "OpenAI API", body: "Explanations and remediation when enabled — US" },
];

const LEGAL_DOCS = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/ai-use", label: "AI Use Disclosure" },
  { href: "/legal/accessibility-methodology", label: "Accessibility Methodology" },
  { href: "/legal/no-legal-advice", label: "No Legal Advice Disclaimer" },
  { href: "/legal/dpa", label: "Data Processing Addendum" },
];

const FAQ = [
  {
    q: "Does this make my site WCAG compliant?",
    a: "No. Percevia AI helps identify and manage accessibility issues. We do not guarantee compliance with WCAG, ADA, EAA, Section 508, or EN 301 549. Automated tools cannot detect every issue — qualified human review is part of any real compliance effort.",
  },
  {
    q: "Is this an accessibility overlay?",
    a: "No. We do not offer or recommend overlays as a substitute for genuine remediation. Percevia AI is operations tooling for real fixes.",
  },
  {
    q: "What happens to my scan data?",
    a: "Scan data stays in your workspace and is retained for 12 months by default. Screenshots are opt-in and off by default. Hosted in the EU by default; US and other regions available on higher plans.",
  },
  {
    q: "Will AI fix issues automatically?",
    a: "No. AI generates suggestions you can review, refine, and apply manually. Every AI suggestion in Percevia AI ships with a 'Review before implementation' notice.",
  },
];

export default async function LandingPage() {
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));

  return (
    <MarketingShell signedIn={signedIn}>
      <main id="main">
        {/* ---------- 01 Hero ---------- */}
        <section className="grid border-b border-rule lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
          <div className="border-rule px-6 sm:px-10 py-14 lg:border-r">
            <div className="flex flex-wrap items-center gap-3">
              <SectionTag index="01" label="Position" />
              <span className="eyebrow text-ink-600">Accessibility operations</span>
            </div>

            <h1 className="mt-8 max-w-[16ch] font-extrabold leading-[0.92] tracking-[-0.045em] text-[clamp(2.9rem,7.4vw,6.75rem)]">
              Find accessibility issues before they become{" "}
              <span className="text-blue-600">user</span> and{" "}
              <span className="text-purple-600">compliance</span> problems.
            </h1>

            <div className="mt-8 flex max-w-[60ch] items-stretch gap-3.5">
              <span aria-hidden className="w-[3px] shrink-0 bg-navy-900" />
              <p className="text-lg leading-relaxed text-ink-700">
                AI-assisted accessibility scanning, remediation guidance, and
                audit-ready reporting for websites, agencies, and product teams.
              </p>
            </div>

            <Aside className="mt-5 text-[27px]">
              not one-click compliance — actual, shippable fixes
            </Aside>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="bg-navy-900 px-7 py-4 text-sm font-bold text-paper shadow-[var(--shadow-pop)] hover:bg-navy-800"
              >
                Start free scan
              </Link>
              <Link
                href="#how"
                className="border border-rule bg-canvas px-7 py-4 text-sm font-bold text-navy-900 hover:bg-canvas-2"
              >
                See how it works
              </Link>
            </div>
          </div>

          {/* The product's own output, used as the hero image. */}
          <div className="flex flex-col items-center justify-center bg-canvas-2 px-8 py-14">
            <div aria-hidden className="relative size-[230px] max-w-full">
              <span className="absolute inset-[34px_0_0_34px] bg-purple-600" />
              <span className="absolute inset-[17px] bg-blue-600" />
              <span className="absolute inset-[0_34px_34px_0] flex items-center justify-center bg-navy-900 text-[76px] font-extrabold tracking-[-0.05em] text-paper">
                78
              </span>
            </div>

            <div className="mt-8 w-full max-w-[290px] border border-rule bg-canvas">
              <div className="border-b border-rule px-3.5 py-3 font-mono text-xs">
                northwind-shop.example
              </div>
              <div className="grid grid-cols-3">
                <MiniStat label="Pages" value="47" />
                <MiniStat label="Findings" value="23" />
                <MiniStat label="Critical" value="5" tone="critical" last />
              </div>
              <p className="border-t border-rule px-3.5 py-3 text-xs leading-relaxed text-ink-600">
                {COMPLIANCE_COPY.AI_REVIEW_REQUIRED}
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Claims strip ---------- */}
        <ul className="flex flex-wrap border-b border-rule bg-navy-900">
          {TRUST.map((t, i) => (
            <li
              key={t}
              className={`eyebrow flex-1 basis-[200px] px-5 py-4 tracking-[0.12em] text-paper ${
                i < TRUST.length - 1 ? "border-r border-paper/20" : ""
              }`}
            >
              {t}
            </li>
          ))}
        </ul>

        {/* ---------- 02 Problem ---------- */}
        <section id="problem" className="border-b border-rule">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="border-rule px-6 sm:px-10 py-12 lg:border-r">
              <SectionTag index="02" label="Problem" />
              <h2 className={`mt-7 max-w-[14ch] ${H2}`}>
                Today’s tooling picks the wrong side of a tradeoff.
              </h2>
              <Aside className="mt-5 text-ink-600">
                promises, noise, or a bill you can only pay once a year
              </Aside>
            </div>
            <div className="border-t border-rule lg:border-t-0">
              {PROBLEMS.map((p, i) => (
                <article
                  key={p.title}
                  className={`grid grid-cols-[64px_1fr] sm:grid-cols-[88px_1fr] ${
                    i < PROBLEMS.length - 1 ? "border-b border-rule" : ""
                  }`}
                >
                  <div
                    aria-hidden
                    className="flex justify-center border-r border-rule bg-canvas-2 py-8 font-mono text-[15px] font-semibold"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="px-6 py-8 sm:pr-10">
                    <h3 className="text-[23px] font-bold tracking-[-0.02em]">{p.title}</h3>
                    <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-ink-600">
                      {p.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 03 Method ---------- */}
        <section id="how" className="border-b border-rule">
          <div className={HEAD_PAD}>
            <SectionTag index="03" label="Method" />
            <h2 className={`mt-7 max-w-[20ch] ${H2}`}>
              Scan, understand, remediate, report — in that order.
            </h2>
          </div>
          <div className={`${GRID} border-t border-rule sm:grid-cols-2 lg:grid-cols-4`}>
            {METHOD.map((s, i) => (
              <article key={s.title} className="bg-canvas px-7 pt-9 pb-10">
                <div
                  aria-hidden
                  className="numeral text-[64px] font-extrabold leading-[0.8] tracking-[-0.06em]"
                  style={
                    {
                      "--marker":
                        i % 2 === 0 ? "var(--color-accent)" : "var(--color-purple-600)",
                    } as CSSProperties
                  }
                >
                  {i + 1}
                </div>
                <h3 className="mt-9 text-[22px] font-bold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink-600">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- 04 Audience ---------- */}
        <section id="who" className="border-b border-rule">
          <div className="flex flex-wrap items-end justify-between gap-5 px-6 sm:px-10 pt-12 pb-9">
            <div>
              <SectionTag index="04" label="Audience" />
              <h2 className={`mt-7 max-w-[18ch] ${H2}`}>
                Built for the people who actually have to fix things.
              </h2>
            </div>
            <Aside>six roles, one backlog</Aside>
          </div>
          <div className={`${GRID} border-t border-rule sm:grid-cols-2 lg:grid-cols-3`}>
            {TARGET_USERS.map((u) => (
              <article key={u.title} className="bg-canvas px-7 py-8">
                <h3 className="text-2xl font-extrabold tracking-[-0.03em]">{u.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{u.body}</p>
              </article>
            ))}
            <article className="bg-navy-900 px-7 py-8 text-paper">
              <h3 className="text-2xl font-extrabold tracking-[-0.03em]">Developers</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-paper/75">
                Code-aware fix suggestions for the stack you already ship on.
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {DEV_STACKS.map((s) => (
                  <li key={s} className="border border-paper/40 px-2.5 py-1 font-mono text-[11px]">
                    {s}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {/* ---------- 05 Output ---------- */}
        <section id="report" className="border-b border-rule bg-navy-900 text-paper">
          <div className="grid lg:grid-cols-2">
            <div className="px-6 sm:px-10 py-14 lg:border-r lg:border-paper/20">
              <SectionTag index="05" label="Output" tone="light" />
              <h2 className={`mt-7 max-w-[16ch] ${H2}`}>
                A client-ready PDF, not a wall of red flags.
              </h2>
              <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-paper/75">
                Executive summary, WCAG mapping, and a phased remediation roadmap — with
                an explicit scope notice stating what automated testing does and does not
                cover.
              </p>
              <Aside className="mt-5 text-[26px] text-blue-200">
                the part your client actually reads
              </Aside>
              <Link
                href="/onboarding"
                className="mt-8 inline-block bg-paper px-7 py-4 text-sm font-bold text-navy-900 shadow-[7px_7px_0_var(--color-purple-600)]"
              >
                Run your first scan
              </Link>
            </div>

            <div className="px-6 sm:px-10 py-14">
              <div className="border border-paper/35">
                <div className="border-b border-paper/35 px-5 py-5">
                  <div className="eyebrow tracking-[0.14em] text-paper/60">
                    Accessibility assessment
                  </div>
                  <div className="mt-2 text-xl font-bold tracking-[-0.02em]">
                    Northwind Shop — May 2026 scan
                  </div>
                </div>
                <ol className="list-none">
                  {REPORT_SECTIONS.map((s, i) => (
                    <li
                      key={s}
                      className="flex gap-3.5 border-b border-paper/20 px-5 py-3.5 text-[15px] text-paper/85"
                    >
                      <span className="font-mono text-paper/50">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
                <p className="px-5 py-4 text-xs leading-relaxed text-paper/60">
                  {COMPLIANCE_COPY.REPORT_NOT_LEGAL}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 06 Stance ---------- */}
        <section id="privacy" className="border-b border-rule">
          <div className="grid lg:grid-cols-2">
            <div className="border-rule px-6 sm:px-10 py-12 lg:border-r">
              <SectionTag index="06" label="Stance" />
              <h2 className={`mt-7 max-w-[14ch] ${H2}`}>
                We’d rather be useful than make legal promises.
              </h2>
              <div className="mt-8 border border-rule border-l-[10px] border-l-rose-600 bg-canvas-2 px-6 py-6">
                <div className="eyebrow text-rose-600">No compliance guarantee</div>
                <p className="mt-3.5 text-[15px] leading-relaxed text-ink-700">
                  Automated scanning detects roughly 30–50% of accessibility issues.{" "}
                  {COMPLIANCE_COPY.NO_GUARANTEE_FULL}
                </p>
              </div>
            </div>
            <ul className="border-t border-rule lg:border-t-0">
              {PRIVACY_POINTS.map((p, i) => (
                <li
                  key={p}
                  className={`flex gap-4 px-6 sm:px-10 py-6 text-[15px] leading-relaxed text-ink-700 ${
                    i < PRIVACY_POINTS.length - 1 ? "border-b border-rule" : ""
                  }`}
                >
                  <span aria-hidden className="font-mono font-semibold text-blue-600">
                    →
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- 07 Pricing ---------- */}
        <section id="pricing" className="border-b border-rule">
          <div className="flex flex-wrap items-end justify-between gap-5 px-6 sm:px-10 pt-12 pb-9">
            <div>
              <SectionTag index="07" label="Pricing" />
              <h2 className={`mt-7 max-w-[16ch] ${H2}`}>Pricing that scales with your team</h2>
            </div>
            <p className="max-w-[46ch] text-[15px] leading-relaxed text-ink-600">
              Honest tiers. No hidden ‘compliance’ upsells. Percevia AI is positioned
              against one-click compliance — every plan reflects that.
            </p>
          </div>

          <div className={`${GRID} border-t border-rule sm:grid-cols-2 lg:grid-cols-5`}>
            {PLANS.map((p) => {
              const dark = Boolean(p.highlighted);
              const quiet = p.id === "enterprise";
              return (
                <article
                  key={p.id}
                  className={`flex flex-col px-6 py-8 sm:last:col-span-2 lg:last:col-span-1 ${
                    dark ? "bg-navy-900 text-paper" : quiet ? "bg-canvas-2" : "bg-canvas"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <span
                      className={`eyebrow ${
                        dark ? "text-paper/70" : quiet ? "text-purple-700" : "text-ink-600"
                      }`}
                    >
                      {p.name}
                    </span>
                    {dark && (
                      <span className="eyebrow bg-paper px-2 py-1 text-[10px] text-navy-900">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mt-3.5 text-[44px] font-extrabold leading-none tracking-[-0.045em]">
                    {p.price}
                  </div>
                  <div className={`mt-1.5 font-mono text-xs ${dark ? "text-paper/70" : "text-ink-600"}`}>
                    {p.cadence}
                  </div>
                  <ul
                    className={`mt-6 grid flex-1 gap-2.5 text-sm leading-snug ${
                      dark ? "text-paper/85" : "text-ink-700"
                    }`}
                  >
                    {planFeatures(p).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <Link
                    href={p.id === "free" ? "/onboarding" : "/pricing"}
                    className={`mt-6 px-4 py-3.5 text-center text-[13px] font-bold ${
                      dark
                        ? "bg-paper text-navy-900"
                        : quiet
                        ? "bg-purple-700 text-paper"
                        : "border border-rule text-navy-900 hover:bg-canvas-2"
                    }`}
                  >
                    {p.cta}
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="border-t border-rule border-l-[10px] border-l-rose-600 px-7 py-6">
            <div className="eyebrow text-rose-600">No compliance guarantee</div>
            <p className="mt-3 max-w-[100ch] text-sm leading-relaxed text-ink-700">
              No plan includes or implies certification under ADA, EAA, WCAG, Section 508
              or EN 301 549. Percevia AI is an accessibility assessment aid. Formal
              compliance work requires a qualified accessibility professional and, where
              legal obligations are involved, legal counsel.
            </p>
          </div>
        </section>

        {/* ---------- 08 Compliance Center ---------- */}
        <section id="compliance" className="border-b border-rule">
          <div className={HEAD_PAD}>
            <SectionTag index="08" label="Compliance Center" />
            <h2 className={`mt-7 max-w-[20ch] ${H2}`}>
              Privacy, AI use, and the limits of automated scanning
            </h2>
            <p className="mt-6 max-w-[66ch] text-base leading-relaxed text-ink-600">
              Control how Percevia AI handles your scan data, who can access it, and what
              AI processing is permitted. Everything lives in one place.
            </p>
          </div>

          <div className={`${GRID} border-y border-rule sm:grid-cols-2 lg:grid-cols-4`}>
            {COMPLIANCE_CARDS.map((c) => (
              <article key={c.title} className="bg-canvas px-7 py-7">
                <h3 className="text-[17px] font-bold tracking-[-0.02em]">{c.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{c.body}</p>
              </article>
            ))}
          </div>

          <div className={`${GRID} border-b border-rule lg:grid-cols-2`}>
            <div className="bg-canvas px-7 py-8">
              <h3 className="text-[26px] font-extrabold tracking-[-0.03em]">
                What the AI receives
              </h3>
              <p className="mt-3.5 text-[15px] leading-relaxed text-ink-700">
                Rule ID, description, WCAG tags, selector and a truncated HTML snippet.
                Never passwords, cookies, payment data, form values, screenshots or
                unrelated records. Outputs are stored against the issue and pass a
                forbidden-claims filter.
              </p>
            </div>
            <div className="bg-canvas px-7 py-8">
              <h3 className="text-[26px] font-extrabold tracking-[-0.03em]">Visual evidence</h3>
              <p className="mt-3.5 text-[15px] leading-relaxed text-ink-700">
                {COMPLIANCE_COPY.VISUAL_EVIDENCE_WARNING} Screenshots stay off until a
                workspace admin turns them on, and they are opt-in per scan.
              </p>
            </div>
          </div>

          <div className="px-6 sm:px-10 pt-9 pb-3">
            <h3 className="text-[26px] font-extrabold tracking-[-0.03em]">
              Region &amp; data hosting
            </h3>
          </div>
          <div className="grid gap-3.5 px-6 sm:px-10 pb-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="border border-rule px-5 py-5 shadow-[6px_6px_0_var(--color-accent)]">
              <div className="flex items-center justify-between gap-2.5">
                <span className="text-base font-bold">EU (Frankfurt)</span>
                <span className="eyebrow bg-blue-700 px-2 py-1 text-[10px] text-paper">
                  Current
                </span>
              </div>
              <p className="mt-2.5 text-[13px] text-ink-600">GDPR-friendly default</p>
            </div>
            <div className="border border-rule px-5 py-5">
              <span className="text-base font-bold">US (Virginia)</span>
              <p className="mt-2.5 text-[13px] text-ink-600">Required for some clients</p>
            </div>
            <div className="border border-rule px-5 py-5">
              <span className="text-base font-bold">Other (on-request)</span>
              <p className="mt-2.5 text-[13px] text-ink-600">Enterprise plan: AU, UK, CA</p>
            </div>
          </div>
          <p className="max-w-[110ch] px-6 sm:px-10 pb-9 text-[13px] leading-relaxed text-ink-600">
            The selector stores a residency preference. Actual location depends on the
            Firebase project region and worker deployment; changing provider or region is
            an infrastructure change handled with support.
          </p>

          <div className={`${GRID} border-t border-rule lg:grid-cols-2`}>
            <div className="bg-canvas">
              <h3 className="border-b border-rule px-7 py-7 text-[26px] font-extrabold tracking-[-0.03em]">
                Retention
              </h3>
              {RETENTION.map((r) => (
                <div
                  key={r.label}
                  className="flex justify-between gap-4 border-b border-line-soft px-7 py-4 text-sm"
                >
                  <span className="text-ink-700">{r.label}</span>
                  <span className="font-mono">{r.value}</span>
                </div>
              ))}
              <p className="px-7 pt-4 pb-7 text-[13px] leading-relaxed text-ink-600">
                A daily purge job enforces the workspace retention setting. Workspace data
                is exportable as a JSON archive and deletable on demand.
              </p>
            </div>
            <div className="bg-canvas">
              <h3 className="border-b border-rule px-7 py-7 text-[26px] font-extrabold tracking-[-0.03em]">
                Subprocessors
              </h3>
              {SUBPROCESSORS.map((s) => (
                <div key={s.name} className="border-b border-line-soft px-7 py-4">
                  <div className="text-[15px] font-bold">{s.name}</div>
                  <div className="mt-1 text-[13px] text-ink-600">{s.body}</div>
                </div>
              ))}
              <p className="px-7 pt-4 pb-7 text-[13px] leading-relaxed text-ink-600">
                Additions or replacements are announced by email 14 days in advance.
              </p>
            </div>
          </div>

          <div className="border-t border-rule px-6 sm:px-10 py-8">
            <h3 className="mb-5 text-[26px] font-extrabold tracking-[-0.03em]">
              Legal documents
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LEGAL_DOCS.map((d) => (
                <Link
                  key={d.href}
                  href={d.href}
                  className="border border-rule px-5 py-4 text-sm font-semibold text-navy-900 hover:bg-canvas-2"
                >
                  {d.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 09 Questions ---------- */}
        <section id="faq" className="border-b border-rule">
          <div className={HEAD_PAD}>
            <SectionTag index="09" label="Questions" />
            <h2 className={`mt-7 max-w-[20ch] ${H2}`}>
              Direct answers to the questions every buyer asks.
            </h2>
          </div>
          <div className={`${GRID} border-t border-rule lg:grid-cols-2`}>
            {FAQ.map((f) => (
              <article key={f.q} className="bg-canvas px-7 py-8">
                <h3 className="text-xl font-bold tracking-[-0.02em]">{f.q}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{f.a}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section id="cta" className="bg-navy-900 text-paper">
          <div className="grid items-center lg:grid-cols-2">
            <div className="px-6 sm:px-10 py-16 lg:border-r lg:border-paper/20">
              <h2 className="max-w-[14ch] font-extrabold leading-[0.94] tracking-[-0.045em] text-[clamp(2.4rem,5vw,4.5rem)]">
                Run your first scan in under a minute.
              </h2>
              <p className="mt-6 text-[17px] leading-relaxed text-paper/75">
                No credit card. No overlay. No legal promises we can’t keep.
              </p>
            </div>
            <div className="px-6 sm:px-10 pb-16 lg:py-16">
              <Link
                href={signedIn ? "/app" : "/onboarding"}
                className="inline-block bg-paper px-8 py-4 text-[15px] font-bold text-navy-900 shadow-[8px_8px_0_var(--color-accent)]"
              >
                {signedIn ? "Open dashboard" : "Start free scan"}
              </Link>
              <Aside className="mt-6 text-[27px] text-blue-200">
                three scans a day, free, forever
              </Aside>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}

function MiniStat({
  label,
  value,
  tone,
  last,
}: {
  label: string;
  value: string;
  tone?: "critical";
  last?: boolean;
}) {
  return (
    <div className={`px-2.5 py-3 ${last ? "" : "border-r border-rule"}`}>
      <div className="eyebrow text-[10px] tracking-[0.1em] text-ink-600">{label}</div>
      <div
        className={`text-2xl font-extrabold tracking-[-0.03em] ${
          tone === "critical" ? "text-rose-600" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
