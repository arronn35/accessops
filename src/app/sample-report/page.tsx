import Link from "next/link";
import { canonical } from "@/lib/seo/canonical";
import { Download, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SectionTag, Aside } from "@/components/marketing/SectionTag";
import { verifySessionCookie } from "@/lib/auth/session";
import { NORTHWIND_SAMPLE_REPORT } from "@/lib/reports/sample-input";
import { renderHtml } from "@/lib/reports/render";

export const metadata = {
  ...canonical("/sample-report"),
  title: "Synthetic sample report — Percevia AI",
  description: "A clearly labeled fictional accessibility assessment report showing Percevia AI output.",
};
export const dynamic = "force-dynamic";

export default async function SampleReportPage() {
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));

  return (
    <MarketingShell signedIn={signedIn}>
      <main id="main">
        <section className="border-b border-rule px-6 py-12 sm:px-10">
          <SectionTag index="01" label="Sample report" />
          <div className="mt-7 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="max-w-[18ch] text-[clamp(2.2rem,5vw,4.4rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
                Northwind Commerce accessibility assessment
              </h1>
              <Aside className="mt-5">fictional data, real report structure</Aside>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/samples/percevia-synthetic-sample-report.pdf"
                download
                className="inline-flex min-h-11 items-center gap-2 bg-navy-900 px-5 text-sm font-bold text-paper hover:bg-navy-800"
              >
                Download PDF <Download className="size-4" aria-hidden />
              </a>
              <Link
                href="/onboarding"
                className="inline-flex min-h-11 items-center gap-2 border border-rule bg-paper px-5 text-sm font-bold text-navy-900 hover:bg-canvas-2"
              >
                Start free <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
          <p className="mt-7 max-w-[85ch] border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-950">
            <strong>Synthetic sample:</strong> Northwind Commerce is fictional. All URLs, findings,
            counts, priorities, and remediation notes are illustrative and are not customer results
            or a claim of conformance.
          </p>
        </section>

        <section className="bg-canvas-2 px-4 py-8 sm:px-8" aria-label="Report preview">
          <iframe
            title="Northwind Commerce synthetic accessibility report"
            srcDoc={renderHtml(NORTHWIND_SAMPLE_REPORT)}
            className="mx-auto block min-h-[1100px] w-full max-w-[900px] border border-rule bg-paper shadow-[8px_8px_0_var(--color-accent)]"
          />
        </section>
      </main>
    </MarketingShell>
  );
}
