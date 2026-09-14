import { describe, it, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { AUTH_ENV_KEYS, validateAuthenticatedE2E, assertAuthenticatedEvidence } from "./authenticated-e2e";
const key = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const env = { E2E_FIREBASE_PROJECT_ID: "test-staging", E2E_EXPECTED_FIREBASE_PROJECT_ID: "test-staging", E2E_FIREBASE_CLIENT_EMAIL: "test@test-staging.iam.gserviceaccount.com", E2E_FIREBASE_PRIVATE_KEY: key, NEXT_PUBLIC_FIREBASE_API_KEY: "key", E2E_REQUIRE_AUTH: "true", E2E_FIXTURE_URL: "https://fixture.example.com" };
const proof = { projectId: "test-staging", fixtureInitialized: true, cleanupCompleted: true };
const test = (projectName: string, status = "expected") => ({ projectName, status, results: [{ status: status === "expected" ? "passed" : "skipped" }] });
describe("authenticated release gate (B02)", () => {
  it.each(AUTH_ENV_KEYS)("rejects missing %s", (key) => expect(() => validateAuthenticatedE2E({ ...env, [key]: "" })).toThrow("missing"));
  it("accepts PEM and escaped newlines without logging them", () => expect(validateAuthenticatedE2E({ ...env, E2E_FIREBASE_PRIVATE_KEY: key.replaceAll("\n", "\\n") })).toEqual({ projectId: "test-staging" }));
  it("rejects a wrong project or malformed key", () => {
    expect(() => validateAuthenticatedE2E({ ...env, E2E_EXPECTED_FIREBASE_PROJECT_ID: "other" })).toThrow("allowlist");
    expect(() => validateAuthenticatedE2E({ ...env, E2E_FIREBASE_PRIVATE_KEY: "secret-invalid" })).toThrow("parseable");
  });
  it("requires the worker journey fixture", () => expect(() => validateAuthenticatedE2E({ ...env, E2E_FIXTURE_URL: "" })).toThrow("E2E_FIXTURE_URL"));
  it("cannot claim success from a public-only or skipped report", () => {
    expect(() => assertAuthenticatedEvidence({ suites: [] }, proof, proof.projectId)).toThrow();
    expect(() => assertAuthenticatedEvidence({ suites: [{ specs: [{ tests: [test("auth-setup"), ...Array.from({ length: 5 }, () => test("authenticated", "skipped"))] }] }] }, proof, proof.projectId)).toThrow();
  });
  it("accepts only passed tests plus verified auth evidence", () => {
    const report = { suites: [{ specs: [{ tests: [test("auth-setup"), ...Array.from({ length: 5 }, () => test("authenticated"))] }] }] };
    expect(assertAuthenticatedEvidence(report, proof, proof.projectId).testsPassed).toBe(5);
    expect(() => assertAuthenticatedEvidence(report, {}, proof.projectId)).toThrow("fixture");
  });
});

it("CI wires authenticated credentials and verifies actual evidence", async () => {
  const { readFile } = await import("node:fs/promises");
  const workflow = await readFile(".github/workflows/ci.yml", "utf8");
  expect(workflow).toContain("E2E_REQUIRE_AUTH: \"true\"");
  expect(workflow).toContain("scripts/check-authenticated-e2e.ts --verify-report");
  for (const key of AUTH_ENV_KEYS) expect(workflow).toContain(`${key}:`);
  expect(workflow).toContain("release-gate:");
});
