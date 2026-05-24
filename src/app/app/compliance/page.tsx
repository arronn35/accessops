import Link from "next/link";
import {
  ShieldCheck, UserCog, Server, ScrollText, BookOpen, FileWarning, Sparkles, Database, Users,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { PrivacyToggle } from "./privacy-toggle";
import { DeleteAllScansButton, ExportWorkspaceButton } from "./delete-actions";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatRelative } from "@/lib/utils";

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "scan.created": "Started a scan",
  "scan.completed": "Completed a scan",
  "issue.updated": "Updated an issue",
  "task.created": "Created a remediation task",
  "task.updated": "Updated a remediation task",
  "task.deleted": "Deleted a remediation task",
  "ai.explain": "Generated an AI explanation",
  "report.created": "Created a report",
  "report.exported": "Exported a report",
  "privacy.updated": "Changed privacy settings",
  "privacy.scan_deleted": "Deleted scan data",
  "privacy.all_scans_deleted": "Deleted all scan data",
  "privacy.workspace_exported": "Exported workspace data",
  "privacy.visual_evidence_deleted": "Deleted visual evidence",
};

function humanizeAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export const metadata = { title: "Privacy & Compliance Center — AccessOps AI" };
export const dynamic = "force-dynamic";

const LEGAL_PAGES = [
  { label: "Privacy Policy", href: "#privacy" },
  { label: "Terms of Service", href: "#terms" },
  { label: "AI Use Disclosure", href: "#ai-use" },
  { label: "Accessibility Methodology", href: "#methodology" },
  { label: "No Legal Advice Disclaimer", href: "#no-legal" },
  { label: "Data Processing Addendum", href: "#dpa" },
];

const SUBPROCESSORS = [
  { name: "AWS (eu-central-1)", purpose: "Application hosting & scan execution", region: "EU" },
  { name: "Cloudflare", purpose: "Edge caching & DDoS protection", region: "Global" },
  { name: "Anthropic API", purpose: "AI explanations & remediation suggestions", region: "US" },
  { name: "Postmark", purpose: "Transactional email", region: "US" },
];

export default async function CompliancePage() {
  const ctx = await getCurrentWorkspaceOrRedirect();
  const aiOn = !!ctx.privacy?.aiProcessingEnabled;
  const screenshotsOn = !!ctx.privacy?.screenshotStorageEnabled;
  const visualEvidenceOn = !!ctx.privacy?.visualEvidenceEnabled;

  // Audit events are only readable by owners/admins; for others we
  // show an empty list rather than leaking who-did-what.
  const canViewAudit = ctx.member.role === "owner" || ctx.member.role === "admin";
  const auditEvents = canViewAudit
    ? await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          createdAt: auditLogs.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(eq(auditLogs.workspaceId, ctx.workspace.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(10)
    : [];

  return (
    <div className="px-4 lg:px-8 py-8 space-y-8 max-w-[1100px]">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="size-4 text-navy-700" aria-hidden />
          <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">
            Privacy &amp; Compliance Center
          </p>
        </div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Privacy, AI use, and the limits of automated scanning
        </h1>
        <p className="text-sm text-ink-600 mt-2 max-w-2xl">
          Control how AccessOps AI handles your scan data, who can access it, and what AI processing
          is permitted. Everything lives in one place.
        </p>
      </header>

      <NoGuaranteeBanner />

      {/* Compliance posture */}
      <section>
        <SectionTitle icon={<FileWarning className="size-4 text-ink-700" aria-hidden />} title="Compliance posture" />
        <div className="grid gap-3 md:grid-cols-2">
          <PostureCard
            title="No compliance guarantee"
            body={COMPLIANCE_COPY.NO_GUARANTEE_FULL}
          />
          <PostureCard
            title="Human review required"
            body={COMPLIANCE_COPY.AUTOMATED_LIMITATIONS}
          />
          <PostureCard title="AI use disclosure" body={COMPLIANCE_COPY.AI_DISCLOSURE} />
          <PostureCard title="Overlay stance" body={COMPLIANCE_COPY.OVERLAY_STANCE} />
        </div>
      </section>

      {/* AI consent */}
      <section className="space-y-3">
        <SectionTitle icon={<Sparkles className="size-4 text-purple-600" aria-hidden />} title="AI processing consent" />
        <Card>
          <CardContent className="pt-5 space-y-5">
            <PrivacyToggle
              fieldKey="aiProcessingEnabled"
              initial={aiOn}
              label="Enable AI explanations and remediation suggestions"
              description="When on, AccessOps AI sends finding metadata (rule IDs, element selectors, truncated HTML snippets) to the configured AI provider. URLs and form values are never sent. AI output ships with a mandatory review-before-implementation notice."
            />
            <p className="text-xs text-ink-500 leading-relaxed">
              {COMPLIANCE_COPY.AI_DISCLOSURE}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Data retention */}
      <section className="space-y-3">
        <SectionTitle icon={<Database className="size-4 text-ink-700" aria-hidden />} title="Scan data &amp; storage" />
        <Card>
          <CardContent className="pt-5 space-y-5">
            <PrivacyToggle
              fieldKey="visualEvidenceEnabled"
              initial={visualEvidenceOn}
              label="Allow diagnostic visual evidence"
              description="Workspace admins must enable this before any scan can capture issue-level screenshots. Visual evidence is diagnostic only and may contain third-party copyrighted or personal data. Do not redistribute publicly."
            />
            <div className="border-t border-line pt-5">
              <PrivacyToggle
                fieldKey="screenshotStorageEnabled"
                initial={screenshotsOn}
                label="Store visual evidence screenshots"
                description={`${COMPLIANCE_COPY.SCREENSHOT_NOTICE} Default visual evidence retention is ${ctx.privacy?.visualEvidenceRetentionDays ?? 30} days.`}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-ink-900">Export workspace data</h3>
              <p className="text-xs text-ink-600 mt-1.5 leading-relaxed">
                Download all scans, issues, AI explanations, tasks, reports, and audit logs as a
                single JSON archive.
              </p>
              <div className="mt-4">
                <ExportWorkspaceButton />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-ink-900">Delete all scan data</h3>
              <p className="text-xs text-ink-600 mt-1.5 leading-relaxed">
                {COMPLIANCE_COPY.DELETE_SCAN_WARNING}
              </p>
              <div className="mt-4">
                <DeleteAllScansButton />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Region / hosting */}
      <section className="space-y-3">
        <SectionTitle icon={<Server className="size-4 text-ink-700" aria-hidden />} title="Region & data hosting" />
        <Card>
          <CardContent className="pt-5">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { id: "eu", label: "EU (Frankfurt)", current: true, description: "GDPR-friendly default." },
                { id: "us", label: "US (Virginia)", description: "Required for some clients." },
                { id: "other", label: "Other (on-request)", description: "Enterprise plan: AU, UK, CA." },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={!!r.current}
                  className={`text-left rounded-md p-4 ring-1 transition-colors min-h-[88px] ${
                    r.current
                      ? "ring-blue-500 bg-blue-50/50"
                      : "ring-line bg-paper hover:bg-canvas-2"
                  }`}
                >
                  <p className="text-sm font-semibold text-ink-900">{r.label}</p>
                  <p className="text-xs text-ink-600 mt-1 leading-relaxed">{r.description}</p>
                  {r.current && (
                    <p className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold mt-2">
                      Current
                    </p>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Team access */}
      <section className="space-y-3">
        <SectionTitle icon={<UserCog className="size-4 text-ink-700" aria-hidden />} title="Team access &amp; logs" />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent access events</CardTitle>
            <CardDescription>Last 10 sensitive actions in this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            {auditEvents.length === 0 ? (
              <p className="text-xs text-ink-600">
                No recorded actions yet. Sensitive actions — scans, exports, privacy changes,
                deletions — appear here as they happen.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {auditEvents.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 py-2 border-b border-line/60 last:border-0"
                  >
                    <span className="text-ink-700">
                      <strong className="font-semibold text-ink-900">
                        {e.userName ?? e.userEmail ?? "System"}
                      </strong>{" "}
                      · {humanizeAction(e.action)}
                      {e.resourceType && (
                        <span className="text-ink-500"> ({e.resourceType})</span>
                      )}
                    </span>
                    <span className="text-ink-500 shrink-0">{formatRelative(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/app/team"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline mt-3"
            >
              <Users className="size-3" aria-hidden /> Manage team &amp; roles
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Subprocessors */}
      <section className="space-y-3">
        <SectionTitle icon={<Server className="size-4 text-ink-700" aria-hidden />} title="Subprocessor list" />
        <Card>
          <CardContent className="pt-5">
            <ul className="space-y-2 text-sm">
              {SUBPROCESSORS.map((s) => (
                <li
                  key={s.name}
                  className="flex items-start justify-between gap-3 py-2 border-b border-line last:border-0"
                >
                  <div>
                    <p className="font-medium text-ink-900">{s.name}</p>
                    <p className="text-xs text-ink-600">{s.purpose}</p>
                  </div>
                  <span className="text-[11px] font-mono text-ink-500 shrink-0">{s.region}</span>
                </li>
              ))}
            </ul>
            <AlertCallout tone="neutral" className="mt-4">
              The full subprocessor registry is exported on request as part of the Data Processing
              Agreement.
            </AlertCallout>
          </CardContent>
        </Card>
      </section>

      {/* Legal docs */}
      <section className="space-y-3">
        <SectionTitle icon={<BookOpen className="size-4 text-ink-700" aria-hidden />} title="Legal documents" />
        <div className="grid sm:grid-cols-2 gap-3">
          {LEGAL_PAGES.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="flex items-center gap-3 rounded-md ring-1 ring-line bg-paper p-4 hover:bg-canvas-2"
            >
              <ScrollText className="size-4 text-ink-500" aria-hidden />
              <span className="text-sm font-medium text-ink-900">{l.label}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
    </div>
  );
}

function PostureCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        <p className="text-xs text-ink-700 mt-2 leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  );
}
