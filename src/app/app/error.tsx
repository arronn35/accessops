"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { Logo } from "@/components/brand/Logo";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <Logo variant="wordmark" />
        </div>
        <AlertCallout
          tone="warning"
          icon={AlertTriangle}
          title="Workspace could not load"
        >
          Percevia could not load workspace data right now. If Firestore quota is
          exhausted, your scans and reports are still safe and the workspace will
          become available again when capacity resets or is increased.
        </AlertCallout>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
        >
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </button>
      </div>
    </main>
  );
}
