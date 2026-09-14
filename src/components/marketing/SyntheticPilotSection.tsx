import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionTag, Aside } from "@/components/marketing/SectionTag";

const COPY = {
  en: {
    label: "Synthetic pilot",
    title: "See the workflow before you commit",
    aside: "illustrative example — not customer results",
    disclosureLabel: "Synthetic pilot disclosure:",
    disclosure: "Northwind Commerce is a fictional company. The scope, findings, and timeline below demonstrate the product workflow and must not be read as a testimonial, benchmark, or measured customer outcome.",
    report: "Open synthetic report",
    criteria: "Suggested pilot success criteria: scans finish reliably, repeated findings become actionable tasks, owners can verify fixes, and the final report is useful to a reviewer.",
    steps: [
      { label: "Day 1", title: "Baseline", body: "Scan 12 representative pages and map findings to the three most important user journeys." },
      { label: "Days 2–4", title: "Triage", body: "Group repeated findings into six root-cause tasks, then assign owners and review AI-assisted fix guidance." },
      { label: "Days 5–7", title: "Verify", body: "Re-scan changed pages, complete guided manual checks, and export an evidence-oriented report for stakeholders." },
    ],
  },
  tr: {
    label: "Sentetik pilot",
    title: "Karar vermeden önce iş akışını görün",
    aside: "temsili örnek — müşteri sonucu değildir",
    disclosureLabel: "Sentetik pilot açıklaması:",
    disclosure: "Northwind Commerce kurgusal bir şirkettir. Aşağıdaki kapsam, bulgular ve zaman çizelgesi ürün iş akışını göstermek için hazırlanmıştır; referans, kıyaslama veya ölçülmüş müşteri sonucu değildir.",
    report: "Sentetik raporu aç",
    criteria: "Önerilen pilot başarı ölçütleri: taramaların güvenilir biçimde tamamlanması, tekrarlanan bulguların uygulanabilir görevlere dönüşmesi, sorumluların düzeltmeleri doğrulayabilmesi ve nihai raporun inceleyen kişi için yararlı olması.",
    steps: [
      { label: "1. Gün", title: "Başlangıç ölçümü", body: "Temsilî 12 sayfayı tarayın ve bulguları en önemli üç kullanıcı yolculuğuyla eşleyin." },
      { label: "2–4. Gün", title: "Önceliklendirme", body: "Tekrarlanan bulguları altı kök neden görevinde gruplayın, sorumluları atayın ve AI destekli çözüm önerilerini inceleyin." },
      { label: "5–7. Gün", title: "Doğrulama", body: "Değişen sayfaları yeniden tarayın, kılavuzlu manuel kontrolleri tamamlayın ve paydaşlar için kanıt odaklı rapor üretin." },
    ],
  },
} as const;

export function SyntheticPilotSection({
  compact = false,
  locale = "en",
}: {
  compact?: boolean;
  locale?: keyof typeof COPY;
}) {
  const copy = COPY[locale];
  return (
    <section className="border-b border-rule bg-canvas-2" aria-labelledby="synthetic-pilot-title">
      <div className="px-6 py-10 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <SectionTag index={compact ? "03" : "07"} label={copy.label} />
            <h2
              id="synthetic-pilot-title"
              className="mt-6 max-w-[18ch] text-[clamp(2rem,4vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.04em]"
            >
              {copy.title}
            </h2>
          </div>
          <Aside className="mt-1">{copy.aside}</Aside>
        </div>

        <div className="mt-8 border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-950">
          <strong>{copy.disclosureLabel}</strong> {copy.disclosure}
        </div>

        <div className="mt-6 grid gap-px border border-rule bg-rule lg:grid-cols-3">
          {copy.steps.map((step) => (
            <article key={step.label} className="bg-canvas px-6 py-7">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                {step.label}
              </p>
              <h3 className="mt-3 text-xl font-extrabold tracking-[-0.025em]">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">{step.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link
            href="/sample-report"
            className="inline-flex min-h-11 items-center gap-2 bg-navy-900 px-5 text-sm font-bold text-paper hover:bg-navy-800"
          >
            {copy.report} <ArrowRight className="size-4" aria-hidden />
          </Link>
          <p className="max-w-[58ch] text-xs leading-relaxed text-ink-600">
            {copy.criteria}
          </p>
        </div>
      </div>
    </section>
  );
}
