/**
 * Authentication for internal / scheduled endpoints.
 *
 * These routes are not user-facing: they are invoked by Cloud Scheduler,
 * Vercel Cron, and Cloud Tasks. Before this module each route re-implemented
 * its own check, and all of them compared the credential with `===`, which is
 * not constant-time.
 *
 * Two credentials are accepted, in this order:
 *
 *   1. **Google OIDC** (preferred). Cloud Scheduler/Tasks can attach an ID
 *      token signed by Google for a specific service account and audience.
 *      Tokens are short-lived (~1h) and scoped, so a leaked request log does
 *      not hand an attacker a permanent key. Enabled by setting
 *      `INTERNAL_OIDC_AUDIENCE` and `INTERNAL_OIDC_SERVICE_ACCOUNTS`.
 *   2. **Shared secret** (legacy, still required for Vercel Cron, which only
 *      knows how to send `Authorization: Bearer $CRON_SECRET`).
 *
 * Both stay enabled at once so the Scheduler jobs can be migrated to OIDC one
 * at a time; remove the secret from the env once every caller sends a token.
 *
 * Fail-closed: in production a route with no configured credential rejects
 * everything. Outside production an unconfigured route stays open so local
 * development and tests can call it.
 */
import { timingSafeEqual } from "node:crypto";

export type InternalAuthVia = "oidc" | "shared_secret" | "unauthenticated_dev";

export type InternalAuthResult =
  | { ok: true; via: InternalAuthVia; subject?: string }
  | { ok: false; reason: "missing_credential" | "bad_credential" | "not_configured" };

export type InternalAuthOptions = {
  /** Env var holding the shared secret. Defaults to `CRON_SECRET`. */
  secretEnv?: string;
  /**
   * Header carrying the shared secret. `authorization` expects a
   * `Bearer <secret>` value; any other header is compared verbatim.
   */
  secretHeader?: string;
};

/** Compare two secrets without leaking their content through timing. */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  // Length is not secret enough to be worth padding for; timingSafeEqual
  // throws on a length mismatch, so short-circuit first.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/** A JWT has three base64url segments; a shared secret almost never does. */
function looksLikeJwt(value: string): boolean {
  return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(value);
}

function allowedServiceAccounts(): string[] {
  return (process.env.INTERNAL_OIDC_SERVICE_ACCOUNTS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function oidcConfigured(): boolean {
  return Boolean(process.env.INTERNAL_OIDC_AUDIENCE) && allowedServiceAccounts().length > 0;
}

/**
 * Verify a Google-signed ID token. Imported lazily so routes that only use the
 * shared secret never pull the auth library into their bundle.
 */
async function verifyGoogleIdToken(token: string): Promise<string | null> {
  const audience = process.env.INTERNAL_OIDC_AUDIENCE;
  if (!audience) return null;
  try {
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified === false) return null;
    const email = payload.email.toLowerCase();
    return allowedServiceAccounts().includes(email) ? email : null;
  } catch {
    return null;
  }
}

export async function authorizeInternalRequest(
  req: Request,
  options: InternalAuthOptions = {}
): Promise<InternalAuthResult> {
  const secretEnv = options.secretEnv ?? "CRON_SECRET";
  const secretHeader = (options.secretHeader ?? "authorization").toLowerCase();
  const secret = process.env[secretEnv];

  const authorization = req.headers.get("authorization");
  const token = bearerToken(authorization);

  // 1) OIDC, when both the caller sent a JWT and this deployment expects one.
  if (token && looksLikeJwt(token) && oidcConfigured()) {
    const subject = await verifyGoogleIdToken(token);
    if (subject) return { ok: true, via: "oidc", subject };
    return { ok: false, reason: "bad_credential" };
  }

  // 2) Shared secret.
  if (secret) {
    const provided =
      secretHeader === "authorization" ? token : req.headers.get(secretHeader);
    if (!provided) return { ok: false, reason: "missing_credential" };
    return secretsMatch(provided, secret)
      ? { ok: true, via: "shared_secret" }
      : { ok: false, reason: "bad_credential" };
  }

  // 3) Nothing configured.
  if (process.env.NODE_ENV === "production") {
    return { ok: false, reason: "not_configured" };
  }
  return { ok: true, via: "unauthenticated_dev" };
}

/** Convenience wrapper for routes that only need a boolean. */
export async function internalRequestAuthorized(
  req: Request,
  options: InternalAuthOptions = {}
): Promise<boolean> {
  return (await authorizeInternalRequest(req, options)).ok;
}
