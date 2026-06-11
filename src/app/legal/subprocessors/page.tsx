export const metadata = {
  title: "Subprocessors — AccessOps AI",
  description: "Current list of subprocessors used by maitrico AccessOps AI.",
};

const EFFECTIVE = "2026-06-01";

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
    vendor: "Google Firebase (US)",
    purpose: "Authentication and Firestore database",
    data: "Accounts, workspace data, scans, issues, reports, privacy settings, audit logs",
    region: "Configured Firebase project region",
  },
  {
    vendor: "Railway Corp. (US)",
    purpose: "Hosts the browser scan worker (Playwright + axe-core)",
    data: "Scanned page content processed transiently in memory; results written to Firestore. No page HTML retained on the worker.",
    region: "US",
  },
  {
    vendor: "OpenAI, L.L.C. (US)",
    purpose: "GPT explanations and remediation suggestions (only when enabled per workspace)",
    data: "Issue context (description, snippet, selectors). No account email or screenshots.",
    region: "US",
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
        <a href="mailto:maitritechco@gmail.com">maitritechco@gmail.com</a>.
      </p>
    </>
  );
}
