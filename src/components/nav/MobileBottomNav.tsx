"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ScanLine, KanbanSquare, ShieldCheck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Home", icon: LayoutDashboard },
  { href: "/app/scans/sc_2025_05_12", label: "Scans", icon: ScanLine, match: "/app/scans" },
  { href: "/app/remediation", label: "Tasks", icon: KanbanSquare },
  { href: "/app/compliance", label: "Privacy", icon: ShieldCheck },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t border-line"
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match ? pathname?.startsWith(item.match) : pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 px-1 min-h-[56px] text-[11px] font-medium",
                  active ? "text-navy-900" : "text-ink-500"
                )}
              >
                <Icon className={cn("size-5", active && "text-navy-900")} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
