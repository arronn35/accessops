import Link from "next/link";
import { eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { SeverityBadge } from "@/components/scan/SeverityBadge";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { EmptyState } from "@/components/empty/EmptyState";
import { KanbanSquare } from "lucide-react";
import { db } from "@/lib/db";
import {
  remediationTasks,
  accessibilityIssues,
  scanJobs,
} from "@/lib/db/schema";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { cn } from "@/lib/utils";

export const metadata = { title: "Remediation board — AccessOps AI" };
export const dynamic = "force-dynamic";

const COLUMNS = [
  { id: "to_review", label: "To Review", tone: "bg-canvas-2" },
  { id: "planned", label: "Planned", tone: "bg-blue-50" },
  { id: "in_progress", label: "In Progress", tone: "bg-amber-50" },
  { id: "needs_human_review", label: "Needs Human Review", tone: "bg-purple-50 ring-2 ring-purple-100" },
  { id: "fixed", label: "Fixed", tone: "bg-green-50" },
  { id: "accepted_risk", label: "Accepted Risk", tone: "bg-canvas" },
] as const;

export default async function RemediationPage() {
  const ctx = await getCurrentWorkspaceOrRedirect();

  const rows = await db
    .select({
      task: remediationTasks,
      issue: accessibilityIssues,
      scan: scanJobs,
    })
    .from(remediationTasks)
    .leftJoin(accessibilityIssues, eq(remediationTasks.issueId, accessibilityIssues.id))
    .leftJoin(scanJobs, eq(accessibilityIssues.scanJobId, scanJobs.id))
    .where(eq(remediationTasks.workspaceId, ctx.workspace.id));

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">
            Remediation
          </p>
          <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
            Track every fix to done
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            {rows.length} task(s) in <strong>{ctx.workspace.name}</strong>. Create tasks from any
            issue detail page.
          </p>
        </div>
      </header>

      <NoGuaranteeBanner variant="compact" />

      {rows.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No remediation tasks yet"
          description="Tasks are created from issue detail pages — click 'Create task' on any finding to start a board."
          action={
            <Link
              href="/app"
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
            >
              <Plus className="size-4" aria-hidden /> Open dashboard
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto -mx-4 lg:-mx-8 px-4 lg:px-8 pb-4">
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map((col) => {
              const items = rows.filter((r) => r.task.status === col.id);
              return (
                <section
                  key={col.id}
                  aria-labelledby={`col-${col.id}`}
                  className={cn("w-72 shrink-0 rounded-lg p-3", col.tone)}
                >
                  <header className="flex items-center justify-between mb-3 px-1">
                    <h2 id={`col-${col.id}`} className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                      {col.label}
                    </h2>
                    <span className="text-xs font-mono text-ink-500 tabular-nums">{items.length}</span>
                  </header>
                  <ul className="space-y-2.5">
                    {items.map(({ task, issue, scan }) => (
                      <li key={task.id}>
                        <Link
                          href={
                            issue && scan
                              ? `/app/scans/${scan.id}/issues/${issue.id}`
                              : "/app/remediation"
                          }
                          className="block rounded-md bg-paper ring-1 ring-line p-3 hover:shadow-[var(--shadow-soft)] transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            {issue ? (
                              <SeverityBadge severity={issue.severity as "critical" | "moderate" | "minor" | "review" | "passed"} size="sm" />
                            ) : (
                              <span className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                                Manual
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-ink-900 leading-snug">{task.title}</p>
                          {issue?.ruleId && (
                            <p className="text-[11px] text-ink-500 font-mono mt-1.5 truncate">
                              {issue.ruleId}
                            </p>
                          )}
                        </Link>
                      </li>
                    ))}
                    {items.length === 0 && (
                      <li className="text-xs text-ink-500 px-2 py-3 text-center">No items</li>
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-ink-500 leading-relaxed">
        Drag-and-drop is on the roadmap. For now, change a task&apos;s status by opening the issue
        and using the status selector.
      </p>
    </div>
  );
}
