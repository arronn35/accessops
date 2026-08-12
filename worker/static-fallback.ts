import type {
  NormalizedPage,
  ScanOutcome,
  ScannerErrorCode,
} from "@/lib/scanner/types";

export interface StaticFallbackReason {
  code: ScannerErrorCode;
  message: string;
}

const URL_VALIDATION_CODES = new Set([
  "invalid_url",
  "scheme_blocked",
  "host_required",
  "host_too_long",
  "url_too_long",
  "private_ip",
  "loopback",
  "link_local",
  "metadata_address",
  "reserved_tld",
  "dns_failed",
]);

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err || "scan_failed");
}

/**
 * Only operational browser/analysis failures may degrade to static HTML.
 * URL validation and SSRF rejections must always remain hard failures.
 */
export function staticFallbackReason(
  err: unknown
): StaticFallbackReason | null {
  const rawCode = (err as { code?: unknown } | null)?.code;
  const code = typeof rawCode === "string" ? rawCode : "";
  const message = errorMessage(err);

  if (
    URL_VALIDATION_CODES.has(code) ||
    /^URL validation failed:/i.test(message) ||
    /redirect rejected by SSRF guard/i.test(message) ||
    /redirected to a blocked address/i.test(message)
  ) {
    return null;
  }

  if (code === "browser_launch_failed" || /browser launch failed/i.test(message)) {
    return { code: "browser_launch_failed", message };
  }
  if (code === "axe_failed" || /\baxe(?:-core)?\b/i.test(message)) {
    return { code: "axe_failed", message };
  }
  if (code === "page_deadline_exceeded") {
    return { code: "page_deadline_exceeded", message };
  }
  if (code === "scan_timeout" || message === "scan_timeout") {
    return { code: "scan_timeout", message };
  }
  if (
    code === "deadline_exceeded" ||
    /\bdeadline\b|\btimeout\b|timed out/i.test(message)
  ) {
    return { code: "deadline_exceeded", message };
  }
  if (
    code === "navigation_failed" ||
    /\bnavigation\b|\bpage\.goto\b|\bnet::|connection refused|connection reset|name not resolved/i.test(
      message
    )
  ) {
    return { code: "navigation_failed", message };
  }

  return null;
}

export function annotateStaticFallbackPage(
  page: NormalizedPage,
  reason: StaticFallbackReason
): NormalizedPage {
  return {
    ...page,
    rawMetadata: {
      ...(page.rawMetadata ?? {}),
      fallbackMode: true,
      resultConfidence: "low",
      code: reason.code,
      message: reason.message,
    },
  };
}

export function staticFallbackReasonFromPage(
  page: NormalizedPage
): StaticFallbackReason | null {
  const metadata = page.rawMetadata;
  if (!metadata || typeof metadata !== "object") return null;
  const code =
    typeof metadata.code === "string" ? metadata.code : undefined;
  const message =
    typeof metadata.message === "string"
      ? metadata.message
      : code ?? "scan_failed";
  return code ? staticFallbackReason({ code, message }) : null;
}

/**
 * Legacy crawls record individual page failures instead of throwing. Degrade
 * the whole legacy run only when every returned page failed for a fallback-
 * eligible reason; mixed successful/failed crawls keep their browser results.
 */
export function staticFallbackReasonFromOutcome(
  outcome: ScanOutcome
): StaticFallbackReason | null {
  if (outcome.pages.length === 0) return null;
  const reasons = outcome.pages.map(staticFallbackReasonFromPage);
  return reasons.every((reason) => reason !== null) ? reasons[0] : null;
}

export function annotateStaticFallbackOutcome(
  outcome: ScanOutcome,
  reason: StaticFallbackReason
): ScanOutcome {
  return {
    ...outcome,
    pages: outcome.pages.map((page) =>
      annotateStaticFallbackPage(page, reason)
    ),
  };
}
