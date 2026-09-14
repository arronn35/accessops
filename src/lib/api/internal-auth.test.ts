import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeInternalRequest, secretsMatch } from "./internal-auth";

const ENV_KEYS = [
  "CRON_SECRET",
  "INTERNAL_WORKER_SECRET",
  "INTERNAL_OIDC_AUDIENCE",
  "INTERNAL_OIDC_SERVICE_ACCOUNTS",
] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  vi.unstubAllEnvs();
  vi.resetModules();
});

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/internal/scans/sweep", { headers });
}

describe("secretsMatch", () => {
  it("accepts identical secrets and rejects everything else", () => {
    expect(secretsMatch("s3cret", "s3cret")).toBe(true);
    expect(secretsMatch("s3cret", "s3crey")).toBe(false);
    // Different lengths must not throw the way timingSafeEqual does.
    expect(secretsMatch("short", "much-longer-secret")).toBe(false);
    expect(secretsMatch("", "")).toBe(true);
  });
});

describe("authorizeInternalRequest", () => {
  it("accepts the shared secret as a bearer token", async () => {
    process.env.CRON_SECRET = "s3cret";
    const result = await authorizeInternalRequest(request({ authorization: "Bearer s3cret" }));
    expect(result).toEqual({ ok: true, via: "shared_secret" });
  });

  it("rejects a wrong or missing bearer token", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect(await authorizeInternalRequest(request({ authorization: "Bearer nope" }))).toEqual({
      ok: false,
      reason: "bad_credential",
    });
    expect(await authorizeInternalRequest(request())).toEqual({
      ok: false,
      reason: "missing_credential",
    });
  });

  it("reads the secret from a custom header when asked", async () => {
    process.env.INTERNAL_WORKER_SECRET = "worker";
    const ok = await authorizeInternalRequest(request({ "x-internal-worker-secret": "worker" }), {
      secretEnv: "INTERNAL_WORKER_SECRET",
      secretHeader: "x-internal-worker-secret",
    });
    expect(ok).toEqual({ ok: true, via: "shared_secret" });

    const bad = await authorizeInternalRequest(request({ authorization: "Bearer worker" }), {
      secretEnv: "INTERNAL_WORKER_SECRET",
      secretHeader: "x-internal-worker-secret",
    });
    expect(bad.ok).toBe(false);
  });

  it("stays open outside production when nothing is configured", async () => {
    const result = await authorizeInternalRequest(request());
    expect(result).toEqual({ ok: true, via: "unauthenticated_dev" });
  });

  it("fails closed in production when nothing is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const result = await authorizeInternalRequest(request());
    expect(result).toEqual({ ok: false, reason: "not_configured" });
  });

  it("ignores a JWT-shaped bearer token when OIDC is not configured", async () => {
    process.env.CRON_SECRET = "s3cret";
    // Falls through to the shared-secret comparison, which this token fails.
    const result = await authorizeInternalRequest(
      request({ authorization: "Bearer aaa.bbb.ccc" })
    );
    expect(result).toEqual({ ok: false, reason: "bad_credential" });
  });

  it("accepts an OIDC token from an allowlisted service account", async () => {
    process.env.INTERNAL_OIDC_AUDIENCE = "https://percevia.example/api/internal/scans/sweep";
    process.env.INTERNAL_OIDC_SERVICE_ACCOUNTS = "scheduler@proj.iam.gserviceaccount.com";
    const verifyIdToken = vi.fn().mockResolvedValue({
      getPayload: () => ({
        email: "scheduler@proj.iam.gserviceaccount.com",
        email_verified: true,
      }),
    });
    vi.doMock("google-auth-library", () => ({
      OAuth2Client: class {
        verifyIdToken = verifyIdToken;
      },
    }));
    vi.resetModules();
    const { authorizeInternalRequest: authorize } = await import("./internal-auth");

    const result = await authorize(request({ authorization: "Bearer aaa.bbb.ccc" }));

    expect(result).toEqual({
      ok: true,
      via: "oidc",
      subject: "scheduler@proj.iam.gserviceaccount.com",
    });
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "aaa.bbb.ccc",
      audience: "https://percevia.example/api/internal/scans/sweep",
    });
  });

  it("rejects an OIDC token from an unlisted service account", async () => {
    process.env.INTERNAL_OIDC_AUDIENCE = "https://percevia.example/api/internal/scans/sweep";
    process.env.INTERNAL_OIDC_SERVICE_ACCOUNTS = "scheduler@proj.iam.gserviceaccount.com";
    vi.doMock("google-auth-library", () => ({
      OAuth2Client: class {
        verifyIdToken = vi.fn().mockResolvedValue({
          getPayload: () => ({ email: "attacker@evil.example", email_verified: true }),
        });
      },
    }));
    vi.resetModules();
    const { authorizeInternalRequest: authorize } = await import("./internal-auth");

    expect(await authorize(request({ authorization: "Bearer aaa.bbb.ccc" }))).toEqual({
      ok: false,
      reason: "bad_credential",
    });
  });

  it("rejects a token Google refuses to verify", async () => {
    process.env.INTERNAL_OIDC_AUDIENCE = "https://percevia.example/api/internal/scans/sweep";
    process.env.INTERNAL_OIDC_SERVICE_ACCOUNTS = "scheduler@proj.iam.gserviceaccount.com";
    vi.doMock("google-auth-library", () => ({
      OAuth2Client: class {
        verifyIdToken = vi.fn().mockRejectedValue(new Error("invalid signature"));
      },
    }));
    vi.resetModules();
    const { authorizeInternalRequest: authorize } = await import("./internal-auth");

    expect(await authorize(request({ authorization: "Bearer aaa.bbb.ccc" }))).toEqual({
      ok: false,
      reason: "bad_credential",
    });
  });
});
