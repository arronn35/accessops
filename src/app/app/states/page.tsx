import Link from "next/link";
import { ScanLine, CheckCircle2, Users, FileBarChart2, Sparkles, Camera, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty/EmptyState";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";

export const metadata = { title: "States gallery — AccessOps AI" };

export default function StatesGalleryPage() {
  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1200px] space-y-12">
      <header>
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">
          Internal · design QA
        </p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Empty &amp; error states gallery
        </h1>
        <p className="text-sm text-ink-600 mt-2 max-w-2xl">
          Canonical empty and warning states used across AccessOps AI. Reused via{" "}
          <code className="text-xs px-1.5 py-0.5 rounded bg-canvas-2 font-mono">EmptyState</code>{" "}
          and{" "}
          <code className="text-xs px-1.5 py-0.5 rounded bg-canvas-2 font-mono">AlertCallout</code>.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink-900">Empty states</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            icon={ScanLine}
            title="No scans yet"
            description="Run your first scan to see findings, AI explanations, and a remediation plan."
            action={
              <Link
                href="/app/scans/new"
                className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
              >
                <Plus className="size-4" aria-hidden /> New scan
              </Link>
            }
          />
          <EmptyState
            icon={CheckCircle2}
            tone="success"
            title="No issues found"
            description="Automated checks didn't surface findings on this page. Human review may still uncover issues — see the verification checklist."
          />
          <EmptyState
            icon={Users}
            title="No workspace members"
            description="Invite teammates to collaborate on scans, reports, and remediation."
            action={
              <button className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md ring-1 ring-line bg-paper text-sm font-medium hover:bg-canvas-2">
                <Plus className="size-4" aria-hidden /> Invite member
              </button>
            }
          />
          <EmptyState
            icon={FileBarChart2}
            title="No reports generated"
            description="Build a report from any completed scan. Reports include WCAG mapping and a non-legal disclaimer."
          />
          <EmptyState
            icon={Sparkles}
            tone="ai"
            title="AI processing disabled"
            description="Enable AI in the Privacy & Compliance Center to get plain-language explanations and remediation drafts."
            action={
              <Link
                href="/app/compliance"
                className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-purple-500 text-paper text-sm font-medium hover:bg-purple-600"
              >
                Manage AI consent
              </Link>
            }
          />
          <EmptyState
            icon={Camera}
            title="Screenshots disabled"
            description={COMPLIANCE_COPY.SCREENSHOT_NOTICE}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink-900">Warning &amp; error states</h2>
        <div className="grid gap-3">
          <AlertCallout tone="warning" title="Invalid URL">
            We couldn&apos;t parse that URL. Make sure it includes the scheme (https://) and is
            publicly reachable.
          </AlertCallout>
          <AlertCallout tone="warning" title="Scan blocked by robots.txt">
            The target site disallows automated crawling. Add an exception for AccessOps AI&apos;s
            crawler or use a manual URL list instead.
          </AlertCallout>
          <AlertCallout tone="warning" title="Scan timed out">
            We waited 10 minutes and the scan didn&apos;t complete. Try reducing the page count or
            scanning fewer templates at a time.
          </AlertCallout>
          <AlertCallout tone="warning" title="Private page warning">
            This URL appears to require authentication or contains user dashboards. We don&apos;t
            recommend scanning private pages in the MVP.
          </AlertCallout>
          <AlertCallout tone="info" title="AI consent required">
            Enable AI processing in the Privacy &amp; Compliance Center to use this feature.
          </AlertCallout>
          <AlertCallout tone="warning" title="Screenshot storage warning">
            {COMPLIANCE_COPY.SCREENSHOT_NOTICE}
          </AlertCallout>
          <AlertCallout tone="warning" title="Human review required">
            {COMPLIANCE_COPY.HUMAN_REVIEW}
          </AlertCallout>
          <AlertCallout tone="info" title="No compliance guarantee">
            {COMPLIANCE_COPY.NO_GUARANTEE_FULL}
          </AlertCallout>
          <AlertCallout tone="danger" title="Confirm deletion">
            {COMPLIANCE_COPY.DELETE_SCAN_WARNING}
          </AlertCallout>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink-900">Delete confirmation</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Modal example (rendered inline for QA)</CardTitle>
          </CardHeader>
          <CardContent>
            <DialogPreview />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DialogPreview() {
  return (
    <div className="rounded-md bg-canvas-2 p-6 flex items-center justify-center">
      <div className="bg-paper rounded-lg shadow-[var(--shadow-pop)] w-full max-w-md">
        <header className="p-5 border-b border-line">
          <h2 className="text-base font-semibold text-ink-900">Delete all scan data?</h2>
          <p className="text-sm text-ink-600 mt-1">{COMPLIANCE_COPY.DELETE_SCAN_WARNING}</p>
        </header>
        <div className="p-5 text-sm text-ink-700">
          Type <span className="font-mono font-semibold text-rose-700">delete</span> below to confirm.
          <input
            type="text"
            className="mt-3 w-full rounded-md ring-1 ring-line px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
            placeholder="delete"
          />
        </div>
        <footer className="flex justify-end gap-2 p-5 border-t border-line bg-canvas/50">
          <button className="h-10 px-3.5 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-700 hover:bg-canvas-2">
            Cancel
          </button>
          <button className="h-10 px-3.5 rounded-md bg-rose-500 text-paper text-sm font-medium hover:bg-rose-700">
            Delete permanently
          </button>
        </footer>
      </div>
    </div>
  );
}
