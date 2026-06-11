import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { AlertCallout } from "@/components/feedback/AlertCallout";

export function AppServiceUnavailable() {
  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <Logo variant="wordmark" />
        </div>
        <AlertCallout
          tone="warning"
          icon={AlertTriangle}
          title="Workspace is temporarily unavailable"
        >
          Firestore has returned a quota limit for this project, so AccessOps cannot
          load workspace data right now. Your scans and reports are not deleted; the
          workspace will become available again when the quota resets or capacity is
          increased.
        </AlertCallout>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-700 hover:bg-canvas-2"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
