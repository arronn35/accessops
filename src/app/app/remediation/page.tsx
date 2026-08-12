import Link from "next/link";
import { ArrowUpRight, ChevronDown, Folder, KanbanSquare, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { EmptyState } from "@/components/empty/EmptyState";
import { SeverityBadge } from "@/components/scan/SeverityBadge";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { listRemediationTasks } from "@/lib/data/firestore";
import { fallbackProjectFolder } from "@/lib/remediation/project-folder";
import { formatRelative } from "@/lib/utils";
import type { IssueSeverity, RemediationTask } from "@/lib/data/types";

export const metadata = { title: "Remediation board — Percevia AI" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = {
  to_do: "neutral",
  planned: "info",
  in_progress: "warning",
  blocked: "danger",
  fixed: "success",
  accepted_risk: "warning",
};

export default async function RemediationPage() {
  const ctx = await getCurrentWorkspaceOrRedirect();
  const tasks = await listRemediationTasks(ctx.workspace.id, 100);
  const open = tasks.filter((t) => t.status !== "fixed" && t.status !== "accepted_risk");
  const folders = groupTasksByProject(tasks);

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">
          Remediation
        </p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Track every fix to done
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          {open.length} open task(s) in <strong>{ctx.workspace.name}</strong>. Completed scans
          create tasks here automatically.
        </p>
      </header>

      <NoGuaranteeBanner variant="compact" />

      {tasks.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No remediation tasks yet"
          description="Complete a scan to automatically create remediation tasks from grouped findings."
          action={
            <Link href="/app/scans/new" className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800">
              <Plus className="size-4" aria-hidden /> Start a scan
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {folders.map((folder) => (
            <details
              key={folder.key}
              open
              className="group rounded-md ring-1 ring-line bg-canvas-2"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 transition-colors hover:bg-canvas [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="inline-flex size-9 items-center justify-center rounded-md bg-paper ring-1 ring-line">
                    <Folder className="size-4 text-blue-600" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-ink-900 truncate">
                      {folder.label}
                    </h2>
                    <p className="text-xs text-ink-500">
                      {folder.openCount} open · {folder.doneCount} done · {folder.tasks.length} total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={folder.openCount > 0 ? "warning" : "success"} size="sm">
                    {folder.openCount > 0 ? "active" : "complete"}
                  </Badge>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-paper px-2.5 py-1 text-xs font-medium text-ink-600 ring-1 ring-line">
                    <ChevronDown
                      className="size-3.5 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                    <span className="group-open:hidden">Expand</span>
                    <span className="hidden group-open:inline">Collapse</span>
                  </span>
                </div>
              </summary>
              <div className="grid gap-3 p-3 xl:grid-cols-2">
                {folder.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: RemediationTask }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{task.title}</CardTitle>
            <CardDescription className="mt-1">
              {task.ruleId ?? "Manual task"} · updated {formatRelative(task.updatedAt)}
            </CardDescription>
          </div>
          <Badge tone={STATUS_TONE[task.status] ?? "neutral"} size="sm">
            {task.status.replaceAll("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {task.severity && (
            <SeverityBadge severity={task.severity as IssueSeverity} size="sm" />
          )}
          <Badge tone={priorityTone(task.priority)} size="sm">
            {task.priority}
          </Badge>
          {task.sourceUrl && (
            <span className="text-xs font-mono text-ink-500 truncate max-w-[280px]">
              {hostFromUrl(task.sourceUrl)}
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-ink-700 leading-relaxed line-clamp-3">
            {task.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {task.issueId && task.scanJobId && (
            <Link
              href={`/app/scans/${task.scanJobId}/issues/${task.issueId}`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md ring-1 ring-line bg-paper text-xs font-medium text-ink-700 hover:bg-canvas-2"
            >
              Open issue <ArrowUpRight className="size-3" aria-hidden />
            </Link>
          )}
          {task.scanJobId && (
            <>
              <Link
                href={`/app/scans/${task.scanJobId}`}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md ring-1 ring-line bg-paper text-xs font-medium text-ink-700 hover:bg-canvas-2"
              >
                Scan results
              </Link>
              <Link
                href={`/app/reports/builder?scanId=${task.scanJobId}`}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-navy-900 text-paper text-xs font-medium hover:bg-navy-800"
              >
                Report output
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function groupTasksByProject(tasks: RemediationTask[]) {
  const byKey = new Map<
    string,
    { key: string; label: string; tasks: RemediationTask[]; openCount: number; doneCount: number }
  >();
  for (const task of tasks) {
    const folder = fallbackProjectFolder(task);
    const existing =
      byKey.get(folder.projectKey) ??
      {
        key: folder.projectKey,
        label: folder.projectLabel,
        tasks: [],
        openCount: 0,
        doneCount: 0,
      };
    existing.tasks.push(task);
    if (task.status === "fixed" || task.status === "accepted_risk") existing.doneCount++;
    else existing.openCount++;
    byKey.set(folder.projectKey, existing);
  }
  return Array.from(byKey.values()).sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    return a.label.localeCompare(b.label);
  });
}

function priorityTone(priority: string): "danger" | "warning" | "info" | "neutral" {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  if (priority === "medium") return "info";
  return "neutral";
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
