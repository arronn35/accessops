"use client";

import type { ClientAnalyticsEvent } from "@/lib/analytics/events";

const SESSION_KEY = "percevia_analytics_session";

function anonymousId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

export function trackClientEvent(event: ClientAnalyticsEvent): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ ...event, anonymousId: anonymousId() });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}
