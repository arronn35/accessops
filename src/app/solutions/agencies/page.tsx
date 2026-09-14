import { SolutionPage } from "@/components/marketing/SolutionPage";
import { canonical } from "@/lib/seo/canonical";
import { verifySessionCookie } from "@/lib/auth/session";

export const metadata = {
  ...canonical("/solutions/agencies"),
  title: "Accessibility operations for agencies — Percevia AI",
  description: "Turn repeated accessibility findings across client sites into branded, owned remediation work.",
};
export const dynamic = "force-dynamic";

export default async function AgenciesSolutionPage() {
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));

  return (
    <SolutionPage
      signedIn={signedIn}
      eyebrow="For agencies"
      title="Ship useful accessibility audits, not raw scanner dumps"
      description="Percevia AI helps web and product agencies scan client journeys, group repeated issues, assign remediation work, and export stakeholder-ready reports without claiming one-click compliance."
      aside="one workflow across many client sites"
      problems={[
        { title: "Reusable triage", body: "Collapse repeated page-level violations into root-cause tasks that can be fixed once in a shared component or template." },
        { title: "Client-ready output", body: "Use branded reports, WCAG mapping, evidence, and plain-language guidance to explain what was tested and what still needs human review." },
        { title: "Clear responsibility", body: "Move findings into an owner-and-status workflow so accessibility work survives handoff, launch, and retainer cycles." },
      ]}
      outcomes={[
        "Scan a representative client scope before quoting remediation work.",
        "Keep automated findings separate from manual-review requirements.",
        "Export PDF, HTML, and CSV output with mandatory limitations language.",
        "Give each client or internal team a repeatable remediation backlog.",
      ]}
      pilotTitle="Run a seven-day agency workflow with one representative client site"
    />
  );
}
