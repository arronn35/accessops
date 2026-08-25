/**
 * Playwright config for E2E.
 *
 * Project lanes:
 *   - "marketing"     → public RSC pages (landing, pricing, legal). No DB,
 *                       no auth, no mocking. Catches broken layouts, link
 *                       integrity, metadata, and the pricing CTA wiring
 *                       (the CTAs are client components and POST to /api/...
 *                       which we stub from the test).
 *   - "ui-mocks"      → public UI pages that exercise client-side flows by
 *                       intercepting API calls with page.route().
 *   - "authenticated" → golden-path coverage with a real Firebase session
 *                       against staging Firestore. Registered only when the
 *                       E2E_FIREBASE_* staging credentials are present (see
 *                       e2e/authenticated/fixtures.ts); the "auth-setup"
 *                       project signs in via an Admin custom token +
 *                       /api/auth/session — no public test-login endpoint.
 *
 * The webServer block builds and boots the production server (`next build`
 * + `next start`). Tests previously ran against `next dev`, but the Next
 * 16.2.6 dev server frequently serves pages whose client islands never
 * hydrate (no React fiber attaches, HMR websocket handshake fails), which
 * made every interactivity assertion fail while production behaved fine.
 * Production serving is deterministic and matches what users get.
 * Without staging credentials only public/route-mocked flows run; with
 * them the server gets real Firebase Admin env.
 */
import { defineConfig, devices, type Project } from "@playwright/test";
import { authLaneConfigured, STORAGE_STATE_PATH } from "./e2e/authenticated/fixtures";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const projects: Project[] = [
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
];

if (authLaneConfigured()) {
  projects.push(
    {
      name: "auth-setup",
      testMatch: /authenticated\/auth\.setup\.ts$/,
    },
    {
      name: "authenticated",
      testMatch: /authenticated\/.*\.spec\.ts$/,
      dependencies: ["auth-setup"],
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE_PATH },
    }
  );
}

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
  projects,
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      PUBLIC_CHECK_ENABLED: "true",
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
      // Staging Firebase Admin credentials for the authenticated lane;
      // empty in public-only runs, which keeps all integrations off.
      FIREBASE_PROJECT_ID: process.env.E2E_FIREBASE_PROJECT_ID ?? "",
      FIREBASE_CLIENT_EMAIL: process.env.E2E_FIREBASE_CLIENT_EMAIL ?? "",
      FIREBASE_PRIVATE_KEY: process.env.E2E_FIREBASE_PRIVATE_KEY ?? "",
    },
  },
});
