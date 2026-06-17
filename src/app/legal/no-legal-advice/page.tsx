export const metadata = {
  title: "No Legal Advice Disclaimer — Percevia AI",
  description: "maitrico Percevia AI is not a law firm and does not provide legal advice.",
};

const EFFECTIVE = "2026-06-05";

export default function NoLegalAdvicePage() {
  return (
    <>
      <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
        Effective {EFFECTIVE}
      </p>
      <h1>No Legal Advice Disclaimer</h1>
      <p>
        maitrico is not a law firm. Percevia AI is a software tool for
        accessibility operations, issue tracking, AI-assisted drafting, and
        remediation workflow support. Nothing in the Service is legal advice.
      </p>

      <h2>No attorney-client relationship</h2>
      <p>
        Using the Service, reading reports, receiving AI-generated summaries, or
        contacting maitrico support does not create an attorney-client
        relationship. Communications with maitrico are not privileged legal
        communications.
      </p>

      <h2>No compliance guarantee</h2>
      <p>
        The Service does not determine whether you comply with the ADA, Section
        508, WCAG, state accessibility laws, contract obligations, procurement
        requirements, or any other legal or technical standard. Reports and
        scores identify automated findings and suggested next steps only.
      </p>

      <h2>Use qualified advisors</h2>
      <p>
        You should consult qualified legal counsel for legal obligations and
        qualified accessibility professionals for manual testing, user-flow
        review, assistive technology testing, and remediation validation.
      </p>

      <h2>Your responsibility</h2>
      <p>
        You are responsible for deciding which websites to scan, confirming
        authorization to scan them, reviewing all findings, implementing fixes,
        and validating outcomes before relying on any result.
      </p>
    </>
  );
}
