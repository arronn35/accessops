export const metadata = {
  title: "AI Use Disclosure — AccessOps AI",
  description: "How maitrico AccessOps AI uses GPT to assist accessibility work.",
};

const EFFECTIVE = "2026-06-05";

export default function AiUseDisclosurePage() {
  return (
    <>
      <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
        Effective {EFFECTIVE}
      </p>
      <h1>AI Use Disclosure</h1>
      <p>
        maitrico AccessOps AI uses GPT-based analysis to help explain accessibility
        findings, draft remediation guidance, create React-oriented fix examples,
        and prepare client-friendly summaries. AI features are optional and are
        controlled by workspace owners or admins in the Privacy &amp; Compliance
        Center.
      </p>

      <h2>What may be sent to GPT</h2>
      <p>
        When AI processing is enabled and a user requests AI help, maitrico may
        send the rule ID, finding description, WCAG-oriented tags, selector
        context, and a truncated HTML snippet for the affected element. We do
        not intentionally send account passwords, cookies, payment data, form
        values, screenshots, or unrelated workspace records.
      </p>

      <h2>How output should be used</h2>
      <p>
        AI output is a drafting aid. It may be incomplete, inaccurate, or
        unsuitable for your codebase. You are responsible for reviewing,
        testing, and approving any AI-generated explanation, code example, or
        client-facing language before using it.
      </p>

      <h2>No compliance certification</h2>
      <p>
        AI output does not certify, guarantee, or establish compliance with the
        ADA, Section 508, WCAG, state accessibility laws, contract requirements,
        or any other legal or technical standard. Automated and AI-assisted
        review must be paired with qualified human review.
      </p>

      <h2>Provider</h2>
      <p>
        maitrico currently uses the OpenAI API for GPT analysis. The active
        model may be configured by deployment environment. See our{" "}
        <a href="/legal/subprocessors">Subprocessors</a> page for provider
        details.
      </p>
    </>
  );
}
