import { AlertTriangle } from "lucide-react";
import type { PageJob } from "@/lib/data/types";

export function FailedPagesNotice({
  jobs,
  pagesScanned,
}: {
  jobs: PageJob[];
  pagesScanned: number;
}) {
  if (jobs.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <div className="flex gap-2">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium">
            {jobs.length} page{jobs.length === 1 ? "" : "s"} could not be scanned
          </p>
          <p className="mt-1 text-amber-900">
            The score and findings below use the {pagesScanned} page
            {pagesScanned === 1 ? "" : "s"} that completed successfully.
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {jobs.map((job) => (
              <li key={job.id} className="break-all">
                {job.url} - {job.error ?? job.errorCode ?? "Page scan failed"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
