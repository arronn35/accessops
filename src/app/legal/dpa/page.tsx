export const metadata = {
  title: "Data Processing Addendum — AccessOps AI",
  description:
    "Default Data Processing Addendum for maitrico AccessOps AI customers.",
};

const EFFECTIVE = "2026-05-23";

export default function DpaPage() {
  return (
    <>
      <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
        Effective {EFFECTIVE}
      </p>
      <h1>Data Processing Addendum</h1>
      <p>
        This Data Processing Addendum (&ldquo;DPA&rdquo;) supplements the
        <a href="/legal/terms"> Terms of Service</a> between you
        (&ldquo;Customer&rdquo;) and maitrico (&ldquo;Processor&rdquo;). It applies
        whenever Processor processes personal data on Customer&apos;s behalf in
        connection with the AccessOps AI Service.
      </p>
      <p>
        By using a paid plan that involves the processing of personal data, you
        accept this DPA. Enterprise customers may sign a counter-signed copy by
        emailing <a href="mailto:legal@maitrico.com">legal@maitrico.com</a>.
      </p>

      <h2>1. Definitions</h2>
      <p>
        &ldquo;Personal Data&rdquo;, &ldquo;Controller&rdquo;,
        &ldquo;Processor&rdquo;, &ldquo;Sub-processor&rdquo;,
        &ldquo;Processing&rdquo;, and &ldquo;Data Subject&rdquo; have the
        meanings given in the EU General Data Protection Regulation
        (Regulation 2016/679, &ldquo;GDPR&rdquo;) and the UK GDPR where
        applicable.
      </p>

      <h2>2. Roles</h2>
      <p>
        Customer is the Controller of personal data submitted via the Service
        (including scan URLs and any incidental personal data exposed by the
        scanned pages). Processor processes that personal data only on
        Customer&apos;s documented instructions, which include using the
        Service&apos;s features as configured by Customer.
      </p>

      <h2>3. Subject matter and duration</h2>
      <p>
        Processing lasts for the term of Customer&apos;s subscription plus the
        retention window configured by Customer (default 365 days). On
        termination, Processor permanently deletes personal data after the
        retention window expires, with backup deletion following the database
        provider&apos;s rolling policy.
      </p>

      <h2>4. Nature, purpose, and categories</h2>
      <ul>
        <li>
          <strong>Nature and purpose:</strong> running accessibility scans,
          storing findings, generating AI explanations (only when Customer has
          enabled them), producing reports, and operating the Service.
        </li>
        <li>
          <strong>Categories of data subjects:</strong> Customer&apos;s
          authorised users, end users incidentally captured in HTML or
          screenshots of pages Customer chose to scan.
        </li>
        <li>
          <strong>Categories of data:</strong> account email, name, workspace
          metadata, URLs, page titles, HTML snippets, accessibility findings,
          AI outputs, audit log entries, billing metadata (no payment card
          numbers).
        </li>
      </ul>

      <h2>5. Customer obligations</h2>
      <p>
        Customer warrants that it has a lawful basis under applicable data
        protection law to submit each URL for scanning and that it has provided
        any notices required by that law to its end users.
      </p>

      <h2>6. Sub-processors</h2>
      <p>
        Customer authorises the sub-processors listed at{" "}
        <a href="/legal/subprocessors">/legal/subprocessors</a>. Processor will
        give at least 14 days&apos; notice (via email to workspace owners)
        before adding or replacing a sub-processor. Customer may object on
        reasonable grounds; if the objection cannot be resolved, Customer may
        terminate the affected portion of the subscription.
      </p>

      <h2>7. Security</h2>
      <p>Processor maintains technical and organisational measures including:</p>
      <ul>
        <li>Encryption in transit (TLS) and at rest for the production database.</li>
        <li>
          Workspace-scoped access control. Every privileged API call
          re-validates the caller&apos;s workspace membership.
        </li>
        <li>
          SSRF protection on every scan, applied before DNS resolution and
          re-applied after each HTTP redirect.
        </li>
        <li>
          Rate limits on the three high-cost surfaces (scan creation, AI
          explanation, report export).
        </li>
        <li>
          Audit logging of every privileged action (scan creation/completion,
          issue updates, task changes, AI calls, report exports, privacy
          toggles, subscription changes).
        </li>
        <li>Least-privilege secrets, rotated on incident.</li>
      </ul>

      <h2>8. International transfers</h2>
      <p>
        EU/UK personal data is hosted in the EU by default. Where processing
        involves transfer to a non-adequate country (for example, an AI
        provider in the United States), Processor relies on the European
        Commission&apos;s Standard Contractual Clauses and the UK
        International Data Transfer Addendum, supplemented by encryption and
        access controls.
      </p>

      <h2>9. Data subject requests</h2>
      <p>
        Processor will assist Customer in responding to data subject requests
        by providing the tools available in the Privacy &amp; Compliance Center
        (export, deletion, AI toggle) and by responding to escalations sent to{" "}
        <a href="mailto:privacy@maitrico.com">privacy@maitrico.com</a> within a
        reasonable time, generally five (5) business days.
      </p>

      <h2>10. Personal data breaches</h2>
      <p>
        Processor will notify Customer without undue delay (and where feasible
        within 72 hours) after becoming aware of a personal data breach
        affecting Customer&apos;s personal data, with the information available
        at that time.
      </p>

      <h2>11. Audits</h2>
      <p>
        On reasonable written notice and no more than once per twelve (12)
        months, Customer may request a copy of the latest third-party security
        assessment and SOC-style summary covering the sub-processors.
        Enterprise customers may negotiate on-site audit rights.
      </p>

      <h2>12. Return or deletion</h2>
      <p>
        On termination of the subscription, Customer may export the workspace
        from the Privacy &amp; Compliance Center. After the configured
        retention window, Processor deletes the personal data. Backup
        expiration follows the underlying database provider&apos;s policy.
      </p>

      <h2>13. Liability</h2>
      <p>
        Liability under this DPA is subject to the limitations in the Terms of
        Service.
      </p>

      <h2>14. Order of precedence</h2>
      <p>
        If there is a conflict between this DPA and the Terms of Service, this
        DPA controls with respect to the processing of personal data.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:privacy@maitrico.com">privacy@maitrico.com</a> for data
        protection,{" "}
        <a href="mailto:security@maitrico.com">security@maitrico.com</a> for
        security incidents,{" "}
        <a href="mailto:legal@maitrico.com">legal@maitrico.com</a> for contract
        questions.
      </p>
    </>
  );
}
