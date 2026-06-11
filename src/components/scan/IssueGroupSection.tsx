"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import { cn } from "@/lib/utils";

export interface IssueGroupHeader {
  id: string;
  title: string;
  ruleId: string;
  severity: "critical" | "moderate" | "minor" | "passed" | "review";
  affectedCount: number;
  primaryWcagTag: string | null;
  recommendedFix: string | null;
}

/**
 * One root-cause group: a single actionable header with an affected-instance
 * count, and a collapsible list of the underlying findings (passed as
 * server-rendered children so we don't ship issue data twice).
 */
export function IssueGroupSection({
  group,
  defaultOpen = false,
  children,
}: {
  group: IssueGroupHeader;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const multiple = group.affectedCount > 1;

  return (
    <div className="rounded-lg ring-1 ring-line bg-paper overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-canvas-2 transition-colors"
      >
        <span className="mt-0.5 text-ink-500" aria-hidden>
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={group.severity} size="sm" />
            <span className="font-medium text-ink-900 text-sm">{group.title}</span>
            <span
              className={cn(
                "text-[11px] tabular-nums px-2 py-0.5 rounded-full ring-1",
                multiple
                  ? "bg-amber-50 text-amber-800 ring-amber-100"
                  : "bg-canvas-2 text-ink-600 ring-line"
              )}
            >
              {group.affectedCount} {multiple ? "instances" : "instance"}
            </span>
          </span>
          <span className="mt-1 flex items-center gap-2 text-[11px] text-ink-500 flex-wrap">
            <code className="font-mono">{group.ruleId}</code>
            {group.primaryWcagTag && (
              <>
                <span aria-hidden>·</span>
                <span className="uppercase">{group.primaryWcagTag}</span>
              </>
            )}
          </span>
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-line/60 pt-3">{children}</div>
      )}
    </div>
  );
}
