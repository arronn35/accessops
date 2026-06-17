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
 *   - Firestore errors: fail open (allow the request) and log, so a limiter
 *     outage cannot take down the API.
 */
import { Timestamp } from "firebase-admin/firestore";
import { firebaseAdminConfigured, firestore } from "@/lib/firebase/admin";

const buckets = new Map<string, { count: number; reset: number }>();

export const limiters = {
  scanCreate: { max: 10, windowMs: 60_000 },
  aiExplain: { max: 60, windowMs: 60 * 60_000 },
  reportExport: { max: 30, windowMs: 60 * 60_000 },
  visualEvidence: { max: 120, windowMs: 60 * 60_000 },
};

export type LimiterName = keyof typeof limiters;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  reset: number;
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
    };
  });
}

export async function checkRateLimit(
  name: LimiterName,
  key: string
): Promise<RateLimitResult> {
  if (!firebaseAdminConfigured()) {
    return checkInMemory(name, key);
  }
  try {
    return await checkInFirestore(name, key);
  } catch (err) {
    // Fail open: a limiter outage must not become an API outage.
    console.error("[rate-limit] firestore check failed; allowing request", {
      limiter: name,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: true,
      remaining: limiters[name].max,
      reset: Date.now() + limiters[name].windowMs,
    };
  }
}
