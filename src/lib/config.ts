/**
 * Central runtime configuration flags.
 *
 * These read environment variables that distinguish a production
 * deployment from a local/demo build. Keeping them in one place avoids
 * scattered `process.env` checks with inconsistent truthiness rules.
 *
 * `process.env.NEXT_PUBLIC_DEMO_MODE` is referenced literally so the
 * Next.js bundler can inline it into client bundles.
 */

export type RenderProfile = "real" | "minimal";

/** Prototype/demo build — surfaces mocked-data banners and demo links. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/** Allow mock AI explanations when no Anthropic key is configured. */
export function aiMockEnabled(): boolean {
  return process.env.AI_MOCK_ENABLED === "true";
}

/**
 * Scanner render profile.
 *   - "real":    load stylesheets, fonts, and images so axe-core sees
 *                the page the way a real user would.
 *   - "minimal": block styling/media resources (cheaper, less accurate).
 */
export function scanRenderProfile(): RenderProfile {
  return process.env.SCAN_RENDER_PROFILE === "minimal" ? "minimal" : "real";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
