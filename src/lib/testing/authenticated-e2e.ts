import { createPrivateKey } from "node:crypto";
export const AUTH_ENV_KEYS = ["E2E_FIREBASE_PROJECT_ID", "E2E_FIREBASE_CLIENT_EMAIL", "E2E_FIREBASE_PRIVATE_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY"] as const;
export function authLaneConfigured(env: Record<string, string | undefined> = process.env) { return AUTH_ENV_KEYS.every((key) => Boolean(env[key]?.trim())); }
export function validateAuthenticatedE2E(env: Record<string, string | undefined> = process.env) {
  const missing = AUTH_ENV_KEYS.filter((key) => !env[key]?.trim());
  if (missing.length) throw new Error(`Authenticated E2E missing: ${missing.join(", ")}`);
  const projectId = env.E2E_FIREBASE_PROJECT_ID!;
  if (!env.E2E_EXPECTED_FIREBASE_PROJECT_ID || projectId !== env.E2E_EXPECTED_FIREBASE_PROJECT_ID) throw new Error("Staging Firebase project does not match the explicit allowlist");
  if (env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== projectId) throw new Error("Public Firebase project mismatch");
  if (!env.E2E_FIREBASE_CLIENT_EMAIL!.endsWith(`@${projectId}.iam.gserviceaccount.com`)) throw new Error("Service account project mismatch");
  try {
    const key = createPrivateKey(env.E2E_FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"));
    if (key.asymmetricKeyType !== "rsa") throw new Error();
  } catch { throw new Error("Firebase private key is not a parseable RSA private key"); }
  if (env.E2E_REQUIRE_AUTH === "true") {
    try { if (!['http:', 'https:'].includes(new URL(env.E2E_FIXTURE_URL!).protocol)) throw new Error(); }
    catch { throw new Error("Required authenticated E2E needs an authorized E2E_FIXTURE_URL"); }
  }
  return { projectId };
}

interface ReportSuite { specs?: { tests: { projectName: string; status: string; results: { status: string }[] }[] }[]; suites?: ReportSuite[] }
export function assertAuthenticatedEvidence(report: { suites: ReportSuite[]; errors?: unknown[] }, proof: { projectId?: string; fixtureInitialized?: boolean; cleanupCompleted?: boolean }, projectId: string) {
  const tests: NonNullable<ReportSuite["specs"]>[number]["tests"] = [];
  function walk(s: ReportSuite) { for (const spec of s.specs ?? []) tests.push(...spec.tests); for (const child of s.suites ?? []) walk(child); }
  report.suites.forEach(walk);
  const auth = tests.filter((t) => t.projectName === "authenticated");
  const setup = tests.filter((t) => t.projectName === "auth-setup");
  if (report.errors?.length || auth.length < 5 || setup.length < 1 || [...auth, ...setup].some((t) => t.status !== "expected" || t.results.at(-1)?.status !== "passed")) throw new Error("Authenticated E2E was skipped, failed, flaky or incomplete");
  if (proof.projectId !== projectId || !proof.fixtureInitialized || !proof.cleanupCompleted) throw new Error("Missing verified Firebase auth fixture evidence");
  return { projectId, testsPassed: auth.length, setupPassed: setup.length };
}
