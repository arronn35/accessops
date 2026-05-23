/**
 * Per-action rate limiting via @upstash/ratelimit.
 *
 * Falls back to a no-op limiter when neither UPSTASH_REDIS_REST_URL+TOKEN
 * nor REDIS_URL are configured, so local dev still works without Redis.
 *
 * Used for both abuse prevention (POST /api/scans) and AI cost guards
 * (POST /api/issues/:id/ai-explanation).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const restUrl = process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let _client: Redis | null = null;
function client(): Redis | null {
  if (_client) return _client;
  if (restUrl && restToken) {
    _client = new Redis({ url: restUrl, token: restToken });
    return _client;
  }
  return null;
}

interface NoopLimiter {
  limit: (key: string) => Promise<{ success: true; remaining: number; reset: number }>;
}

const noopLimiter: NoopLimiter = {
  async limit() {
    return { success: true, remaining: Number.MAX_SAFE_INTEGER, reset: 0 };
  },
};

function makeLimiter(prefix: string, max: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  const c = client();
  if (!c) return noopLimiter;
  return new Ratelimit({
    redis: c,
    limiter: Ratelimit.slidingWindow(max, window),
    prefix,
    analytics: false,
  });
}

export const limiters = {
  // 5 scan creations per minute per user (anti-abuse).
  scanCreate: makeLimiter("rl:scan_create", 5, "1 m"),
  // 60 AI explanation requests per hour per workspace (cost guard).
  aiExplain: makeLimiter("rl:ai_explain", 60, "1 h"),
  // 30 report exports per hour.
  reportExport: makeLimiter("rl:report_export", 30, "1 h"),
};

export type LimiterName = keyof typeof limiters;

export async function checkRateLimit(
  name: LimiterName,
  key: string
): Promise<{ ok: boolean; remaining: number; reset: number }> {
  const r = await limiters[name].limit(key);
  return { ok: r.success, remaining: r.remaining, reset: r.reset };
}
