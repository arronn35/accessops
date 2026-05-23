/**
 * Playwright config for E2E.
 *
 * Two project lanes:
 *   - "marketing" → public RSC pages (landing, pricing, legal). No DB,
 *                   no auth, no mocking. Catches broken layouts, link
 *                   integrity, metadata, and the pricing CTA wiring
 *                   (the CTAs are client components and POST to /api/...
 *                   which we stub from the test).
 *   - "ui-mocks"  → public UI pages that exercise client-side flows by
 *                   intercepting API calls with page.route(). Today this
 *                   covers the sign-in form and the pricing CTA;
 *                   dashboard pages stay in vitest unit tests + manual
 *                   smoke until we wire a test sign-in route.
 *
 * The webServer block boots `next dev` so CI doesn't need a separate
 * build step. DATABASE_URL is a placeholder — pages that touch DB will
 * 500, which is intentional: tests cover only routes that don't.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "marketing",
      testMatch: /marketing\/.*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "ui-mocks",
      testMatch: /ui-mocks\/.*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Keep all external integrations off in tests.
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://placeholder:placeholder@127.0.0.1:5432/placeholder",
    },
  },
});
