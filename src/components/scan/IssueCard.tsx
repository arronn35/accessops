import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import { WcagBadge } from "./WcagBadge";
import { CATEGORY_META, type Issue } from "@/lib/mock/issues";
import { cn } from "@/lib/utils";

export function IssueCard({
  issue,
  scanId,
  className,
}: {
  issue: Issue;
  scanId: string;
  className?: string;
}) {
  return (
    <Link
      href={`/app/scans/${scanId}/issues/${issue.id}`}
      className={cn(
        "block rounded-lg bg-paper ring-1 ring-line p-4 hover:ring-line-strong hover:shadow-[var(--shadow-soft)] transition-shadow",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={issue.severity} size="sm" />
            <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">
              {CATEGORY_META[issue.category].label}
            </span>
            {issue.humanReviewRequired && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                · Needs human review
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-ink-900 mt-2 leading-snug">
            {issue.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <WcagBadge criterion={issue.wcag.criterion} level={issue.wcag.level} version={issue.wcag.version} />
            <span className="text-xs text-ink-500 font-mono truncate max-w-[260px]">{issue.page}</span>
          </div>
        </div>
        <ChevronRight className="size-4 text-ink-400 shrink-0 mt-1" aria-hidden />
      </div>
    </Link>
  );
}
