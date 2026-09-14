/**
 * Fixed-window rate limiting.
 *
 * Counters live in the `rateLimits` Firestore collection so every Vercel
 * instance (and the worker) shares the same budget — a process-local Map
 * resets per instance and per cold start, which effectively disables limits
 * under horizontal scaling.
 *
 * Each counter doc carries an `expireAt` timestamp; enable a Firestore TTL
 * policy on `rateLimits.expireAt` so stale windows are garbage-collected.
 * Correctness does not depend on TTL — expired windows are overwritten on
 * the next request — it only bounds storage.
 *
 * Failure modes:
 *   - Firebase Admin not configured (local dev, unit tests): fall back to
 *     the in-memory window.
 *   - Firestore errors fail open by default so an internal limiter outage
 *     cannot take down authenticated product APIs. Public, unauthenticated
 *     compute endpoints opt into fail-closed behavior to prevent abuse.
 */
import { Timestamp } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { firebaseAdminConfigured, firestore } from "@/lib/firebase/admin";

const buckets = new Map<string, { count: number; reset: number }>();

export const limiters = {
  publicCheck: { max: 5, windowMs: 60 * 60_000 },
  scanCreate: { max: 10, windowMs: 60_000 },
  aiExplain: { max: 60, windowMs: 60 * 60_000 },
  reportExport: { max: 30, windowMs: 60 * 60_000 },
  visualEvidence: { max: 120, windowMs: 60 * 60_000 },
  analyticsEvent: { max: 120, windowMs: 60_000 },
};

export type LimiterName = keyof typeof limiters;

/**
 * Server-derived anonymous identity for quota keys.
 *
 * Quota keys must never come from client-chosen values (request-body UUIDs,
 * User-Agent strings): the caller can mint unlimited fresh keys and walk
 * around the budget. This helper hashes only the network signal so rotating
 * a header or UUID cannot open a new budget.
 *
 * Trust note: x-forwarded-for / x-real-ip are only meaningful when the edge
 * proxy normalizes them (strips client-spoofed copies, selects the correct
 * hop). If the deployment serves traffic directly, the fallback bucket
 * ("address-unavailable") is shared by all such callers — safe, but coarse.
 * NAT sharing means one budget covers everyone behind the same egress IP;
 * thresholds are sized for that (generous per-IP budgets, fail-closed only
 * on public compute endpoints).
 */
export function anonymousNetworkKey(headers: Headers): string {
  const forwarded =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "address-unavailable";
  return createHash("sha256").update(`anon-v1\n${forwarded}`).digest("hex").slice(0, 32);
}export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  reset: number;
  reason?: "limit_exceeded" | "backend_unavailable";
}

export interface RateLimitOptions {
  failureMode?: "open" | "closed";
}

/** TTL slack so a doc outlives its window long enough to be read once more. */
const EXPIRE_SLACK_MS = 60_000;

function checkInMemory(name: LimiterName, key: string): RateLimitResult {
  const cfg = limiters[name];
  const id = `${name}:${key}`;
  const current = Date.now();
  const bucket = buckets.get(id);
  if (!bucket || current > bucket.reset) {
    buckets.set(id, { count: 1, reset: current + cfg.windowMs });
    return { ok: true, remaining: cfg.max - 1, reset: current + cfg.windowMs };
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= cfg.max,
    remaining: Math.max(0, cfg.max - bucket.count),
    reset: bucket.reset,
    ...(bucket.count > cfg.max ? { reason: "limit_exceeded" as const } : {}),
  };
}

async function checkInFirestore(
  name: LimiterName,
  key: string
): Promise<RateLimitResult> {
  const cfg = limiters[name];
  const ref = firestore()
    .collection("rateLimits")
    .doc(`${name}:${key}`.replace(/\//g, "_"));

  return firestore().runTransaction(async (tx) => {
    const current = Date.now();
    const snap = await tx.get(ref);
    const data = snap.data() as
      | { count?: number; resetAt?: Timestamp }
      | undefined;
    const resetAt = data?.resetAt?.toMillis() ?? 0;

    if (!snap.exists || current > resetAt) {
      const reset = current + cfg.windowMs;
      tx.set(ref, {
        count: 1,
        resetAt: Timestamp.fromMillis(reset),
        expireAt: Timestamp.fromMillis(reset + EXPIRE_SLACK_MS),
      });
      return { ok: true, remaining: cfg.max - 1, reset };
    }

    const count = (data?.count ?? 0) + 1;
    tx.update(ref, { count });
    return {
      ok: count <= cfg.max,
      remaining: Math.max(0, cfg.max - count),
      reset: resetAt,
      ...(count > cfg.max ? { reason: "limit_exceeded" as const } : {}),
    };
  });
}

export async function checkRateLimit(
  name: LimiterName,
  key: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  if (!firebaseAdminConfigured()) {
    return checkInMemory(name, key);
  }
  try {
    return await checkInFirestore(name, key);
  } catch (err) {
    const failureMode = options.failureMode ?? "open";
    console.error(`[rate-limit] firestore check failed; failing ${failureMode}`, {
      limiter: name,
      error: err instanceof Error ? err.message : String(err),
    });
    if (failureMode === "closed") {
      return {
        ok: false,
        remaining: 0,
        reset: Date.now() + limiters[name].windowMs,
        reason: "backend_unavailable",
      };
    }
    return {
      ok: true,
      remaining: limiters[name].max,
      reset: Date.now() + limiters[name].windowMs,
    };
  }
}
