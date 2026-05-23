export const metadata = {
  title: "Contact — AccessOps AI",
  description: "How to reach maitrico AccessOps AI for support, security, and sales.",
};

const CHANNELS = [
  {
    label: "Product support",
    email: "support@maitrico.com",
    body:
      "Stuck inside the app? Scan not finishing? Send a workspace ID and a brief description; we read every message.",
  },
  {
    label: "Sales & Enterprise",
    email: "sales@maitrico.com",
    body:
      "Volume scanning, custom DPA, on-prem worker, SSO/SAML, regional residency. Tell us about your estate and we'll come back with options.",
  },
  {
    label: "Privacy & data subject requests",
    email: "privacy@maitrico.com",
    body:
      "Access, correction, deletion, portability, objection. EU/EEA/UK rights apply where relevant.",
  },
  {
    label: "Security",
    email: "security@maitrico.com",
    body:
      "Vulnerability reports and suspected account compromise. We accept responsible-disclosure reports and will respond within 72 hours.",
  },
  {
    label: "Legal",
    email: "legal@maitrico.com",
    body:
      "Contract questions, DPA counter-signature requests, law-enforcement requests.",
  },
];

export default function ContactPage() {
  return (
    <>
      <h1>Contact</h1>
      <p>
        AccessOps AI is operated by maitrico. The fastest way to reach a human
        is email — we route everything from the addresses below.
      </p>

      <ul className="not-prose mt-6 space-y-3">
        {CHANNELS.map((c) => (
          <li
            key={c.email}
            className="rounded-md ring-1 ring-line bg-paper p-4"
          >
            <p className="text-sm font-semibold text-ink-900">{c.label}</p>
            <p className="text-sm">
              <a
                href={`mailto:${c.email}`}
                className="text-blue-600 hover:underline"
              >
                {c.email}
              </a>
            </p>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">{c.body}</p>
          </li>
        ))}
      </ul>

      <h2>Status &amp; incidents</h2>
      <p>
        Production health: <a href="/api/healthz?deep=1">/api/healthz?deep=1</a>{" "}
        returns JSON suitable for monitoring. We publish post-mortems for any
        incident that materially affects customers.
      </p>

      <h2>Responsible disclosure</h2>
      <p>
        Please report security vulnerabilities to{" "}
        <a href="mailto:security@maitrico.com">security@maitrico.com</a>{" "}
        before public disclosure. We do not pursue good-faith researchers who
        follow our reporting policy.
      </p>
    </>
  );
}
