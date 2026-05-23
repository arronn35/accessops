"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanLine,
  KanbanSquare,
  Sparkles,
  FileBarChart2,
  Users,
  ShieldCheck,
  Settings,
  CircleHelp,
  Plus,
  CreditCard,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/scans/new", label: "Scans", icon: ScanLine, match: "/app/scans" },
  { href: "/app/remediation", label: "Remediation", icon: KanbanSquare },
  { href: "/app/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/app/reports/builder", label: "Reports", icon: FileBarChart2, match: "/app/reports" },
];

const secondary = [
  { href: "/app/team", label: "Team & Roles", icon: Users },
  { href: "/app/compliance", label: "Privacy & Compliance", icon: ShieldCheck },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard, match: "/app/settings/billing" },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();

  const isActive = (item: { href: string; match?: string }) => {
    if (item.match) return pathname?.startsWith(item.match);
    return pathname === item.href;
  };

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-paper border-r border-line"
    >
      <div className="p-5 border-b border-line">
        <Link href="/app" aria-label="maitrico AccessOps AI home">
          <Logo variant="wordmark" />
        </Link>
        <p className="text-[11px] text-ink-500 font-medium uppercase tracking-wider mt-2 ml-9">
          AccessOps AI
        </p>
      </div>

      <div className="p-3">
        <Link
          href="/app/scans/new"
          className="flex items-center justify-center gap-2 w-full h-11 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800 transition-colors"
        >
          <Plus className="size-4" aria-hidden />
          New scan
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium min-h-[40px] transition-colors",
                active
                  ? "bg-navy-900 text-paper"
                  : "text-ink-700 hover:bg-canvas-2"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-line space-y-1">
          {secondary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium min-h-[40px] transition-colors",
                  active
                    ? "bg-navy-900 text-paper"
                    : "text-ink-700 hover:bg-canvas-2"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-line">
        <Link
          href="/pricing"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-ink-600 hover:bg-canvas-2"
        >
          <CircleHelp className="size-3.5" aria-hidden />
          Plans & pricing
        </Link>
      </div>
    </aside>
  );
}
