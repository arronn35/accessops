"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

/**
 * Plan limit lines ("3 scans per day") with locale-reactive counts.
 *
 * Caps arrive as props from a server component (which reads them from the
 * enforced entitlements source) so server and client can never disagree on
 * the numbers — the client only localizes the chrome around them via `t()`
 * with `{count}` interpolation. Each `<li>` carries `data-i18n-skip` so the
 * DOM-mutating observer leaves React-managed nodes alone (hydration #418).
 * Turkish drops the plural after numerals, so both EN variants map to one
 * TR sentence each.
 */
export function PlanLimitItems({
  daily,
  maxPages,
}: {
  daily: number;
  maxPages: number;
}) {
  const { t } = useLanguage();
  return (
    <>
      <li data-i18n-skip>
        {t(daily === 1 ? "{count} scan per day" : "{count} scans per day", {
          count: daily,
        })}
      </li>
      <li data-i18n-skip>
        {t(
          maxPages === 1 ? "Up to {count} page per scan" : "Up to {count} pages per scan",
          { count: maxPages }
        )}
      </li>
    </>
  );
}
