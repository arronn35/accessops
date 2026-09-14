import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SectionTag, Aside } from "@/components/marketing/SectionTag";
import { SyntheticPilotSection } from "@/components/marketing/SyntheticPilotSection";

interface SolutionPageProps {
  signedIn: boolean;
  eyebrow: string;
  title: string;
  description: string;
  aside: string;
  problems: Array<{ title: string; body: string }>;
  outcomes: string[];
  pilotTitle: string;
  locale?: "en" | "tr";
}

export function SolutionPage({
  signedIn,
  eyebrow,
  title,
  description,
  aside,
  problems,
  outcomes,
  pilotTitle,
  locale = "en",
}: SolutionPageProps) {
  const fixedCopy = locale === "tr"
    ? {
        start: "Tek sayfayla başlayın",
        operating: "Çalışma modeli",
        ownedWork: "Bulguları sorumlusu belli iyileştirme işlerine dönüştürün",
        offer: "Pilot önerisi",
        pilotBody: "Kamuya açık tek bir sayfayla ücretsiz başlayın. İş akışı uygunsa aynı URL'yi kayıt sonrasında tam tarayıcı taramasına taşıyın. Demo takvimi gerekmez.",
        review: "Örnek çıktıyı inceleyin",
      }
    : {
        start: "Start with one page",
        operating: "Operating model",
        ownedWork: "Findings become owned remediation work",
        offer: "Pilot offer",
        pilotBody: "Start free with a public page. If the workflow fits, expand the same URL into a signed-in browser scan. No demo calendar is required.",
        review: "Review sample output",
      };
  return (
    <MarketingShell signedIn={signedIn}>
      <main id="main">
        <section className="border-b border-rule px-6 py-14 sm:px-10">
          <SectionTag index="01" label={eyebrow} />
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)] lg:items-end">
            <div>
              <h1 className="max-w-[18ch] text-[clamp(2.5rem,6vw,5.5rem)] font-extrabold leading-[0.92] tracking-[-0.05em]">
                {title}
              </h1>
              <Aside className="mt-6">{aside}</Aside>
            </div>
            <div>
              <p className="text-[17px] leading-relaxed text-ink-600">{description}</p>
              <Link
                href="/onboarding"
                className="mt-6 inline-flex min-h-12 items-center gap-2 bg-navy-900 px-6 text-sm font-bold text-paper hover:bg-navy-800"
              >
                {fixedCopy.start} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-rule">
          <div className="px-6 pb-8 pt-11 sm:px-10">
            <SectionTag index="02" label={fixedCopy.operating} />
            <h2 className="mt-6 max-w-[19ch] text-[clamp(2rem,4vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
              {fixedCopy.ownedWork}
            </h2>
          </div>
          <div className="grid gap-px border-t border-rule bg-rule lg:grid-cols-3">
            {problems.map((item) => (
              <article key={item.title} className="bg-canvas px-7 py-8">
                <h3 className="text-xl font-extrabold tracking-[-0.025em]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">{item.body}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-3 px-6 py-8 sm:grid-cols-2 sm:px-10">
            {outcomes.map((outcome) => (
              <div key={outcome} className="flex items-start gap-3 border border-rule bg-paper px-4 py-4 text-sm text-ink-700">
                <Check className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden />
                <span>{outcome}</span>
              </div>
            ))}
          </div>
        </section>

        <SyntheticPilotSection compact locale={locale} />

        <section className="border-b border-rule px-6 py-12 sm:px-10">
          <SectionTag index="04" label={fixedCopy.offer} />
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="max-w-[20ch] text-[clamp(2rem,4vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
                {pilotTitle}
              </h2>
              <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-ink-600">
                {fixedCopy.pilotBody}
              </p>
            </div>
            <Link
              href="/sample-report"
              className="inline-flex min-h-11 items-center gap-2 border border-rule bg-paper px-5 text-sm font-bold text-navy-900 hover:bg-canvas-2"
            >
              {fixedCopy.review} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
