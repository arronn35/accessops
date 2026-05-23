/**
 * Lightweight observability shim — Sentry + PostHog.
 *
 * Deliberately does NOT pull in @sentry/nextjs or posthog-js. Those
 * SDKs are heavy and the brief asks for *placeholders* that never
 * block production when unconfigured.
 *
 * Behaviour:
 *   - Structured JSON logging ALWAYS happens (works with Vercel /
 *     Railway log drains out of the box).
 *   - If SENTRY_DSN is set, errors are also POSTed to Sentry's
 *     envelope ingest endpoint via fetch — no SDK, ~1 request.
 *   - If POSTHOG_KEY is set, events are POSTed to PostHog's capture
 *     endpoint.
 *   - Missing config = silent no-op beyond the console log.
 *
 * Both web (Next.js) and worker import this module.
 */

interface ErrorContext {
  scope?: string;
  workspaceId?: string;
  userId?: string;
  [key: string]: unknown;
}

function nowIso() {
  return new Date().toISOString();
}

/** Parse a Sentry DSN into the bits the envelope endpoint needs. */
function parseDsn(dsn: string): { url: string; publicKey: string } | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    if (!projectId || !u.username) return null;
    return {
      url: `${u.protocol}//${u.host}/api/${projectId}/envelope/`,
      publicKey: u.username,
    };
  } catch {
    return null;
  }
}

async function sendToSentry(err: Error, context: ErrorContext): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    environment: process.env.NODE_ENV ?? "development",
    server_name: context.scope ?? "accessops",
    exception: {
      values: [
        {
          type: err.name,
          value: err.message,
          stacktrace: { frames: [] },
        },
      ],
    },
    extra: context,
  };

  // Sentry envelope format: header line, item header line, item payload.
  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: nowIso() }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(event);

  try {
    await fetch(parsed.url, {
      method: "POST",
      headers: {
        "content-type": "application/x-sentry-envelope",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=accessops/1.0`,
      },
      body: envelope,
      // Don't let a slow Sentry hold up the request path.
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // Observability must never throw into the caller.
  }
}

/**
 * Report an error. Always logs; also ships to Sentry when configured.
 */
export async function captureException(
  err: unknown,
  context: ErrorContext = {}
): Promise<void> {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error(
    JSON.stringify({
      level: "error",
      ts: nowIso(),
      scope: context.scope ?? "app",
      message: error.message,
      name: error.name,
      stack: error.stack?.split("\n").slice(0, 8).join(" | "),
      ...context,
    })
  );
  await sendToSentry(error, context);
}

/**
 * Track a product event. No-op unless POSTHOG_KEY is set.
 */
export async function trackEvent(
  event: string,
  properties: Record<string, unknown> = {},
  distinctId = "server"
): Promise<void> {
  const key = process.env.POSTHOG_KEY;
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $lib: "accessops-server" },
        timestamp: nowIso(),
      }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // analytics is best-effort
  }
}
