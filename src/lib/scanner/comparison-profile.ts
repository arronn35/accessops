import { createHash } from "node:crypto";
import type { NormalizedPage } from "./types";
import { FINGERPRINT_VERSION } from "./grouping";
import { SCORING_VERSION } from "./scoring";

/** Bump whenever scan execution semantics change, independently of app releases. */
export const SCANNER_VERSION = "percevia-engine-v1";
export interface ComparisonProfile {
  version: 1;
  engineVersions: string[];
  viewportProfile: string[];
  settings: string[];
  fingerprintVersion: number;
  scoringVersion: string;
  urls: string[];
  scopeHash: string;
  failedUrls: string[];
  skippedUrls: string[];
  completeMetadata: boolean;
}
export function canonicalComparisonUrl(value: string): string {
  try { const url = new URL(value); url.hash = ""; return url.href; }
  catch { return value; }
}
const unique = (values: string[]) => [...new Set(values)].sort();

/** Use actual persisted page metadata, never today's defaults for old scans. */
export function buildComparisonProfile(pages: NormalizedPage[], failedUrls: string[] = []): ComparisonProfile {
  const engines: string[] = [], viewports: string[] = [], settings: string[] = [];
  let completeMetadata = pages.length > 0;
  const skippedUrls: string[] = [];
  for (const page of pages) {
    const m = page.rawMetadata ?? {};
    if (!m.engine || !m.scannerVersion || !m.axeVersion || !m.playwrightVersion || !Array.isArray(m.viewports) || !m.renderProfile || !m.userAgent || !m.locale) completeMetadata = false;
    engines.push(JSON.stringify([m.engine ?? null, m.scannerVersion ?? null, m.axeVersion ?? null, m.playwrightVersion ?? null]));
    viewports.push(JSON.stringify(m.viewports ?? null));
    settings.push(JSON.stringify([m.renderProfile ?? null, m.locale ?? null, m.userAgent ?? null, m.states ?? null, m.resourcePolicy ?? null]));
    if (m.truncatedByDeadline || m.degraded || Number(m.viewportsFailed ?? 0) > 0) skippedUrls.push(page.url);
  }
  if (unique(engines).length !== 1 || unique(viewports).length !== 1 || unique(settings).length !== 1) completeMetadata = false;
  const urls = unique(pages.map((p) => canonicalComparisonUrl(p.url)));
  return {
    version: 1, engineVersions: unique(engines), viewportProfile: unique(viewports), settings: unique(settings),
    fingerprintVersion: FINGERPRINT_VERSION, scoringVersion: SCORING_VERSION,
    urls, scopeHash: createHash("sha256").update(JSON.stringify(urls)).digest("hex"),
    failedUrls: unique([...failedUrls, ...pages.filter((p) => p.scanFailed).map((p) => p.url)].map(canonicalComparisonUrl)),
    skippedUrls: unique(skippedUrls.map(canonicalComparisonUrl)), completeMetadata,
  };
}

export type ComparisonReason = "NEW_SCAN_INCOMPLETE" | "OLD_SCAN_INCOMPLETE" | "VIEWPORT_MISMATCH" | "ENGINE_VERSION_MISMATCH" | "SCORE_VERSION_MISMATCH" | "FINGERPRINT_VERSION_MISMATCH" | "SCOPE_MISMATCH" | "SETTINGS_MISMATCH" | "FAILED_PAGES" | "SKIPPED_PAGES" | "PROFILE_MISSING" | "INSUFFICIENT_HISTORY";
export function profileMismatchReasons(before?: ComparisonProfile | null, after?: ComparisonProfile | null): ComparisonReason[] {
  if (!before || !after || !before.completeMetadata || !after.completeMetadata) return ["PROFILE_MISSING"];
  const reasons: ComparisonReason[] = [];
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!equal(before.engineVersions, after.engineVersions)) reasons.push("ENGINE_VERSION_MISMATCH");
  if (!equal(before.viewportProfile, after.viewportProfile)) reasons.push("VIEWPORT_MISMATCH");
  if (!equal(before.settings, after.settings)) reasons.push("SETTINGS_MISMATCH");
  if (before.scoringVersion !== after.scoringVersion) reasons.push("SCORE_VERSION_MISMATCH");
  if (before.fingerprintVersion !== after.fingerprintVersion) reasons.push("FINGERPRINT_VERSION_MISMATCH");
  if (before.scopeHash !== after.scopeHash || !equal(before.urls, after.urls) || !before.urls.length || !after.urls.length) reasons.push("SCOPE_MISMATCH");
  if (before.failedUrls.length || after.failedUrls.length) reasons.push("FAILED_PAGES");
  if (before.skippedUrls.length || after.skippedUrls.length) reasons.push("SKIPPED_PAGES");
  return reasons;
}
