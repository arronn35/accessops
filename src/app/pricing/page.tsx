import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SectionTag, Aside } from "@/components/marketing/SectionTag";
import { PLANS, planFeatures } from "@/lib/marketing/plans";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { verifySessionCookie } from "@/lib/auth/session";
import { PricingCta } from "./pricing-cta";

export const metadata = { title: "Pricing — maitrico Percevia AI" };
export const dynamic = "force-dynamic";

const H2 =
  "font-extrabold leading-[0.98] tracking-[-0.04em] text-[clamp(2.1rem,4.2vw,3.6rem)]";

const FAQ = [
  {
    q: "Does Percevia AI make my site WCAG compliant?",
    a: "No. Percevia AI helps identify and manage accessibility issues. Automated tools cannot detect every issue, and we do not guarantee compliance with WCAG, ADA, EAA, Section 508, or EN 301 549. Always involve qualified accessibility specialists for formal compliance.",
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
    a: "No. We do not offer or recommend accessibility overlays. Percevia AI is for genuine remediation operations.",
  },
];

export default async function PricingPage() {
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));

  return (
    <MarketingShell signedIn={signedIn}>
      <main id="main">
        <section className="border-b border-rule">
          <div className="flex flex-wrap items-end justify-between gap-6 px-6 sm:px-10 pt-14 pb-10">
            <div>
              <SectionTag index="01" label="Pricing" />
              <h1 className={`mt-7 max-w-[16ch] ${H2}`}>
                Pricing that scales with your team
              </h1>
              <Aside className="mt-5">no hidden compliance upsells</Aside>
            </div>
            <p className="max-w-[46ch] text-[15px] leading-relaxed text-ink-600">
              Honest tiers. Percevia AI is positioned against one-click compliance —
              every plan reflects that. Limits below are the same numbers the API
              enforces.
            </p>
          </div>
        </section>

        <section className="grid gap-px border-b border-rule bg-rule sm:grid-cols-2 lg:grid-cols-5">
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
                  <h2
                    className={`eyebrow ${
                      dark ? "text-paper/70" : quiet ? "text-purple-700" : "text-ink-600"
                    }`}
                  >
                    {p.name}
                  </h2>
                  {dark && (
                    <span className="eyebrow bg-paper px-2 py-1 text-[10px] text-navy-900">
                      Most popular
                    </span>
                  )}
                </div>

                <div className="mt-3.5 text-[44px] font-extrabold leading-none tracking-[-0.045em]">
                  {p.price}
                </div>
                <div
                  className={`mt-1.5 font-mono text-xs ${dark ? "text-paper/70" : "text-ink-600"}`}
                >
                  {p.cadence}
                </div>

                <p
                  className={`mt-5 min-h-[60px] text-[13px] leading-relaxed ${
                    dark ? "text-paper/75" : "text-ink-600"
                  }`}
                >
                  {p.description}
                </p>

                <ul
                  className={`mt-5 grid flex-1 gap-2.5 border-t pt-5 text-sm leading-snug ${
                    dark ? "border-paper/25 text-paper/85" : "border-line-soft text-ink-700"
                  }`}
                >
                  {planFeatures(p).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>

                <PricingCta planId={p.id} label={p.cta} highlighted={dark} />
              </article>
            );
          })}
        </section>

        <section className="border-b border-rule border-l-[10px] border-l-rose-600 px-7 py-6">
          <div className="eyebrow text-rose-600">No compliance guarantee</div>
          <p className="mt-3 max-w-[100ch] text-sm leading-relaxed text-ink-700">
            {COMPLIANCE_COPY.NO_GUARANTEE_FULL} No plan includes or implies
            certification under ADA, EAA, WCAG, Section 508 or EN 301 549.
          </p>
        </section>

        <section>
          <div className="px-6 sm:px-10 pt-12 pb-9">
            <SectionTag index="02" label="Questions" />
            <h2 className={`mt-7 max-w-[20ch] ${H2}`}>Before you pick a plan</h2>
          </div>
          <div className="grid gap-px border-t border-rule bg-rule lg:grid-cols-2">
            {FAQ.map((f) => (
              <article key={f.q} className="bg-canvas px-7 py-8">
                <h3 className="text-xl font-bold tracking-[-0.02em]">{f.q}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{f.a}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
