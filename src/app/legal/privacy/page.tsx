export const metadata = {
  title: "Privacy Policy — AccessOps AI",
  description: "How maitrico AccessOps AI processes your data.",
};

const EFFECTIVE = "2026-05-23";

export default function PrivacyPolicyPage() {
  return (
    <>
      <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
        Effective {EFFECTIVE}
      </p>
      <h1>Privacy Policy</h1>
      <p>
        This Privacy Policy explains what data maitrico AccessOps AI collects,
        how we use it, and the choices you have. It applies to the website at
        accessops.maitrico.com (and any deployment that serves the same app)
        and the underlying scan worker.
      </p>

      <h2>Data we collect</h2>
      <h3>Account data</h3>
      <ul>
        <li>Email address (required for magic-link sign-in).</li>
        <li>
          Display name and avatar (optional; only if you sign in via a provider
          that supplies them, e.g. GitHub).
        </li>
        <li>
          Workspace metadata you provide (name, company, region preference,
          target standard, framework).
        </li>
      </ul>

      <h3>Scan data</h3>
      <ul>
        <li>
          The URLs you scan, the discovered same-origin pages, the HTML
          snippets and selectors associated with accessibility findings, and
          metadata such as status code and scan duration.
        </li>
        <li>
          Screenshots <strong>only</strong> if you have explicitly enabled
          screenshot storage at both the workspace level and for the
          individual scan. Default: off.
        </li>
      </ul>

      <h3>AI inputs and outputs</h3>
      <ul>
        <li>
          When AI processing is enabled by a workspace owner/admin, the issue
          context (description, snippet, selectors) is sent to our AI provider
          (Anthropic) to generate an explanation. We do not send your account
          email, screenshots, or unrelated workspace data with these requests.
        </li>
        <li>
          AI outputs are stored in the <code>ai_explanations</code> table,
          attached to the originating issue, and post-processed against a
          forbidden-claims list before being shown.
        </li>
      </ul>

      <h3>Operational data</h3>
      <ul>
        <li>
          Audit log entries for every privileged action (scan creation, issue
          updates, report exports, privacy toggles, subscription changes).
        </li>
        <li>
          Diagnostic logs and rate-limit counters. Logs do not contain page
          HTML; they contain action names, identifiers, and timestamps.
        </li>
        <li>
          Billing data managed by Stripe (we store the Stripe customer ID,
          subscription ID, and current period end — not card numbers).
        </li>
      </ul>

      <h2>Where data is stored</h2>
      <p>
        Workspace data is stored in Neon Postgres in the EU region by default.
        Higher tiers can opt in to US or UK regions. The scan worker runs on
        Railway and processes pages in memory; raw HTML is not persisted unless
        you turn on screenshot storage (and even then, only the resulting image
        is kept). Stripe processes payments in their own infrastructure under
        their privacy policy.
      </p>

      <h2>How we use data</h2>
      <ul>
        <li>To operate the Service — run scans, render reports, send auth emails.</li>
        <li>To enforce safety controls — SSRF defense, rate limits, plan caps.</li>
        <li>
          To communicate transactional messages (sign-in links, billing
          receipts). We do not send marketing emails without your opt-in.
        </li>
        <li>To improve and secure the Service — diagnostics, incident response.</li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell your data.</li>
        <li>We do not train AI models on customer content.</li>
        <li>We do not run advertising trackers or session-replay tooling.</li>
        <li>
          We do not allow third parties to use scan content for analytics or
          enrichment.
        </li>
      </ul>

      <h2>Subprocessors</h2>
      <p>
        The Service relies on a short list of subprocessors (Neon, Upstash,
        Vercel, Railway, Resend, Anthropic, Stripe, Sentry, PostHog).
        See <a href="/legal/subprocessors">/legal/subprocessors</a> for the
        current list and what each one processes.
      </p>

      <h2>Retention</h2>
      <p>
        Scan data is retained per the <code>scanDataRetentionDays</code>
        setting on your workspace (default 365 days). A daily job purges
        records that have aged out and writes an audit entry. Audit logs
        themselves are retained for at least 12 months. Backups follow our
        database provider&apos;s policy and are encrypted at rest.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your location, you have rights to access, correct, port,
        and delete your personal data, and to object to or restrict processing.
        Workspace owners can:
      </p>
      <ul>
        <li>
          <strong>Export</strong> the full workspace dataset from the Privacy
          &amp; Compliance Center (returns JSON of users, scans, issues, tasks,
          reports, privacy settings, audit logs).
        </li>
        <li>
          <strong>Delete</strong> individual scans or the whole workspace from
          the same surface. Deletions are permanent.
        </li>
        <li>
          <strong>Turn AI off</strong> at any time. Pre-existing AI outputs
          remain attached to their issues unless you delete the underlying
          scan.
        </li>
      </ul>
      <p>
        For other requests, email{" "}
        <a href="mailto:privacy@maitrico.com">privacy@maitrico.com</a>. EU/EEA
        and UK residents may also lodge a complaint with their local data
        protection authority.
      </p>

      <h2>Cookies</h2>
      <p>
        We use a single first-party session cookie issued by Auth.js (database
        session strategy). No advertising cookies, no third-party tracking
        cookies. Optional analytics (PostHog) is off by default and enabled
        only at the workspace owner&apos;s discretion.
      </p>

      <h2>Changes</h2>
      <p>
        Material changes to this Policy will be announced by email to workspace
        owners at least 30 days before they take effect.
      </p>

      <h2>Contact</h2>
      <p>
        Data protection inquiries:{" "}
        <a href="mailto:privacy@maitrico.com">privacy@maitrico.com</a>. Security
        issues: <a href="mailto:security@maitrico.com">security@maitrico.com</a>.
      </p>
    </>
  );
}
