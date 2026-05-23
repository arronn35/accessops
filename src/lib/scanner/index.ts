/**
 * Public API of the scanner package.
 * Web app imports types and URL validation; worker imports the runner.
 */
export {
  validateUrl,
  validateFinalUrl,
  resolveAndCheckHost,
  isBlockedIp,
  UrlValidationFailed,
} from "./url-validation";
export type { ValidatedUrl, UrlValidationError } from "./url-validation";

export {
  normalizeAxeResults,
  normalizeAxeViolation,
} from "./normalize";

export { analyzeHtml, runStaticScanJob } from "./static-runner";
export { inlineScanFallbackEnabled, processScanInline } from "./inline-runner";
export { resolveScanSourcePlan, canonicalizeUrl, sameOriginCanonicalUrl } from "./sources";

export type {
  ScanInput,
  ScanOutcome,
  NormalizedPage,
  NormalizedIssue,
  Severity,
  Impact,
  ProgressStep,
  ProgressUpdate,
  ProgressCallback,
} from "./types";

// Heavy imports — only loaded inside the worker. Re-exported but tree-shaken
// out of any client bundle because Next.js never includes worker entry points.
export { runScanJob, scanSinglePage, crawlSameDomain, launchBrowser } from "./playwright-runner";
