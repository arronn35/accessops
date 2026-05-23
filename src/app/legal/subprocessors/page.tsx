export const metadata = {
  title: "Subprocessors — AccessOps AI",
  description: "Current list of subprocessors used by maitrico AccessOps AI.",
};

const EFFECTIVE = "2026-05-23";

interface Row {
  vendor: string;
  purpose: string;
  data: string;
  region: string;
}

const ROWS: Row[] = [
  {
    vendor: "Vercel Inc. (US)",
    purpose: "Web app hosting and edge",
    data: "Request logs; no scan content persisted",
    region: "Global edge, EU/US compute",
  },
  {
    vendor: "Railway Corp. (US)",
    purpose: "Scan worker hosting (Playwright + axe-core)",
    data: "Transient HTML for the duration of a scan; not persisted unless screenshots are enabled",
    region: "EU/US",
  },
  {
    vendor: "Neon (US)",
    purpose: "Postgres database",
    data: "All workspace data (accounts, scans, issues, tasks, reports, privacy settings, audit logs, billing linkage)",
    region: "EU (Frankfurt) by default",
  },
  {
    vendor: "Upstash Inc. (US)",
    purpose: "Redis (BullMQ queue + rate limiter)",
    data: "Job IDs and rate-limit keys; no scan content",
    region: "EU/US",
  },
  {
    vendor: "Resend Inc. (US)",
    purpose: "Transactional email (magic-link auth, invitations)",
    data: "Recipient email and message body",
    region: "EU/US",
  },
  {
    vendor: "Anthropic, PBC (US)",
    purpose: "AI explanations (only when enabled per workspace)",
    data: "Issue context (description, snippet, selectors). No account email or screenshots.",
    region: "US",
  },
  {
    vendor: "Stripe, Inc. (US/IE)",
    purpose: "Payments, subscription billing, customer portal",
    data: "Email, billing address, tax ID, card token (handled by Stripe)",
    region: "EU/US",
  },
  {
    vendor: "Cloudflare R2 (US)",
    purpose: "Object storage (optional — only when PDF/screenshot storage is enabled)",
    data: "Rendered PDF reports, optional screenshots",
    region: "Configurable",
  },
  {
    vendor: "Sentry (US)",
    purpose: "Optional error monitoring",
    data: "Stack traces, request metadata; no page HTML",
    region: "EU/US",
  },
  {
    vendor: "PostHog (US)",
    purpose: "Optional product analytics",
    data: "Anonymous event data; off by default per workspace",
    region: "EU/US",
  },
];

export default function SubprocessorsPage() {
  return (
    <>
      <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
        Effective {EFFECTIVE}
      </p>
      <h1>Subprocessors</h1>
      <p>
        We work with a small set of vendors to operate the Service. The table
        below describes each subprocessor, what they process, and where. We
        notify workspace owners by email at least 14 days before adding or
        replacing any subprocessor (see the{" "}
        <a href="/legal/dpa">Data Processing Addendum</a>).
      </p>

      <div className="not-prose mt-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500 border-b border-line">
              <th className="py-2 pr-3 font-semibold">Vendor</th>
              <th className="py-2 pr-3 font-semibold">Purpose</th>
              <th className="py-2 pr-3 font-semibold">Data</th>
              <th className="py-2 pr-3 font-semibold">Region</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.vendor} className="border-b border-line align-top">
                <td className="py-3 pr-3 font-medium text-ink-900">{r.vendor}</td>
                <td className="py-3 pr-3 text-ink-700">{r.purpose}</td>
                <td className="py-3 pr-3 text-ink-700">{r.data}</td>
                <td className="py-3 pr-3 text-ink-700">{r.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Sub-processor changes</h2>
      <p>
        We email workspace owners at least 14 days before any addition or
        replacement. To object, reply to that email or contact{" "}
        <a href="mailto:privacy@maitrico.com">privacy@maitrico.com</a>.
      </p>
    </>
  );
}
