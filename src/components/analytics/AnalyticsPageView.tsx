"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackClientEvent } from "@/lib/analytics/client";

const PAGES = {
  "/": "landing",
  "/pricing": "pricing",
  "/onboarding": "onboarding",
  "/sample-report": "sample_report",
  "/solutions/agencies": "solution_agencies",
  "/solutions/turkiye": "solution_turkiye",
} as const;

export function AnalyticsPageView() {
  const pathname = usePathname();
  useEffect(() => {
    const page = PAGES[pathname as keyof typeof PAGES];
    if (page) trackClientEvent({ event: "page_viewed", properties: { page } });
  }, [pathname]);
  return null;
}
