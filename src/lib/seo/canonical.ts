import type { Metadata } from "next";

/**
 * Canonical URLs for public pages.
 *
 * Without a canonical link every alias a page is reachable under — the
 * deployment domain, a preview domain, a trailing slash, a tracking query —
 * competes with the real URL. `metadataBase` in the root layout resolves these
 * relative paths to the configured origin, so one env var moves the whole site.
 *
 * Deliberately no `alternates.languages` / hreflang: this site serves both
 * English and Turkish from the SAME URL, chosen by a cookie. hreflang requires
 * a distinct URL per language, so annotating it here would be a false signal.
 * If language ever moves into the path, add languages alongside canonical.
 */
export function canonical(path: string): Metadata {
  return { alternates: { canonical: path } };
}

/**
 * Pages that must never be indexed: invitations, auth handoffs, and workspace
 * setup all carry tokens or user-specific state, and a search result pointing
 * at one is at best useless and at worst a leak.
 */
export const NOINDEX: Metadata = {
  robots: { index: false, follow: false },
};
