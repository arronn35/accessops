"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const CORE_APP_ROUTES = [
  "/app",
  "/app/scans/new",
  "/app/remediation",
  "/app/ai-assistant",
  "/app/reports/builder",
  "/app/team",
  "/app/compliance",
  "/app/settings",
  "/app/settings/profile",
  "/app/settings/billing",
  "/app/states",
];

const RELATED_ROUTES: Array<{ match: string; routes: string[] }> = [
  { match: "/app/scans", routes: ["/app", "/app/scans/new", "/app/reports/builder", "/app/remediation"] },
  { match: "/app/reports", routes: ["/app/reports/builder", "/app", "/app/scans/new"] },
  { match: "/app/settings", routes: ["/app/settings", "/app/settings/profile", "/app/settings/billing", "/app/compliance"] },
  { match: "/app/compliance", routes: ["/app/compliance", "/app/settings", "/app/team"] },
];

export function AppRoutePrefetcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const warm = () => {
      if (cancelled) return;
      const related = RELATED_ROUTES.find((item) => pathname?.startsWith(item.match))?.routes ?? [];
      const routes = Array.from(new Set([...related, ...CORE_APP_ROUTES]));
      for (const route of routes) {
        if (route !== pathname) router.prefetch(route);
      }
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(warm, { timeout: 1_500 });
    } else {
      timeoutId = setTimeout(warm, 250);
    }

    return () => {
      cancelled = true;
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [pathname, router]);

  return null;
}
