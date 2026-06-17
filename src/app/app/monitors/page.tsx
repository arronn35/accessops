import Link from "next/link";
import { Activity, Sparkles } from "lucide-react";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { listMonitors } from "@/lib/data/firestore";
import { monitorCapsForPlan, normalizePlan } from "@/lib/entitlements";
import { MonitorsManager, type MonitorRow } from "./monitors-manager";

export const metadata = { title: "Monitors — Percevia AI" };
export const dynamic = "force-dynamic";

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default async function MonitorsPage() {
  const ctx = await getCurrentWorkspaceOrRedirect();
  const plan = normalizePlan(ctx.workspace.plan);
  const caps = monitorCapsForPlan(plan);
  const monitors = await listMonitors(ctx.workspace.id);

  const rows: MonitorRow[] = monitors.map((m) => ({
    id: m.id,
    name: m.name,
    targetUrl: m.targetUrl,
    frequency: m.frequency,
    status: m.status,
    nextRunAt: toIso(m.nextRunAt),
    lastRunAt: toIso(m.lastRunAt),
    lastScanId: m.lastScanId,
  }));

  return (
    <div className="px-4 lg:px-8 py-8 max-w-4xl">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1 flex items-center gap-1.5">
          <Activity className="size-3.5" aria-hidden /> Continuous monitoring
        </p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Monitors
        </h1>
        <p className="text-sm text-ink-600 mt-1 max-w-xl">
          Keep an eye on a site over time. Percevia re-scans on a schedule and
          flags new critical issues or score drops, so a regression never ships
          unnoticed.
        </p>
      </header>

      {caps.maxMonitors <= 0 ? (
        <div className="rounded-lg ring-1 ring-line bg-canvas-2 p-8 text-center">
          <Sparkles className="size-6 text-blue-500 mx-auto mb-2" aria-hidden />
          <p className="text-base font-semibold text-ink-900">
            Continuous monitoring is a paid feature
          </p>
          <p className="text-sm text-ink-600 mt-1 max-w-md mx-auto">
            Upgrade to schedule automatic re-scans and get alerted to
            accessibility regressions before your users hit them.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 h-10 px-4 mt-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
          >
            View plans
          </Link>
        </div>
      ) : (
        <MonitorsManager
          monitors={rows}
          maxMonitors={caps.maxMonitors}
          allowedFrequencies={caps.allowedFrequencies}
        />
      )}
    </div>
  );
}
