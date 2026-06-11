export const metadata = {
  title: "Accessibility Methodology — AccessOps AI",
  description: "How maitrico AccessOps AI performs automated accessibility checks.",
};

const EFFECTIVE = "2026-06-05";

export default function AccessibilityMethodologyPage() {
  return (
    <>
      <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
        Effective {EFFECTIVE}
      </p>
      <h1>Accessibility Methodology</h1>
      <p>
        maitrico AccessOps AI helps teams identify and manage accessibility
        issues on websites they are authorized to test. The Service combines
        automated checks, page metadata, optional visual evidence, and
        human-review prompts to support remediation planning.
      </p>

      <h2>Automated checks</h2>
      <p>
        Scans use automated accessibility rules, including axe-core where
        browser execution is available, plus maitrico static heuristics for
        common page structure, form-label, image-text, link-text, heading, and
        landmark issues. Findings are normalized, grouped by likely root cause,
        and scored for prioritization.
      </p>

      <h2>Browser and static fallback</h2>
      <p>
        When browser execution or screenshot capture is unavailable, the system
        records fallback metadata and completes a static HTML scan where
        possible. Static fallback results have lower confidence than rendered
        browser results because some style, contrast, and interaction states may
        not be observable.
      </p>

      <h2>Human review</h2>
      <p>
        Automated tools cannot detect every accessibility barrier. Manual
        review should include keyboard-only navigation, screen-reader checks,
        responsive and zoom testing, form error handling, focus visibility, and
        user-flow review for important pages.
      </p>

      <h2>Outputs</h2>
      <p>
        Dashboard scores, issue lists, reports, and remediation tasks are
        operational aids. They are not audit opinions, legal advice,
        certifications, or guarantees that a website satisfies any law,
        regulation, procurement rule, or accessibility standard.
      </p>
    </>
  );
}
