/**
 * GET /api/healthz       — liveness probe (cheap, no I/O)
 * GET /api/healthz?deep=1 — readiness probe: also pings Postgres + Redis
 *
 * Liveness is what Vercel / a basic uptime monitor should poll — it
 * just confirms the function executes. The deep variant is for
 * post-deploy smoke checks: a 503 means the app booted but a
 * dependency is unreachable (bad DATABASE_URL, Upstash down, etc.).
 *
 * Deep checks are bounded by a 3s timeout each so a hung dependency
 * can't make the probe itself hang.
 */
import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inlineScanFallbackEnabled } from "@/lib/scanner/inline-runner";

export const dynamic = "force-dynamic";

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timeout`)), ms)
    ),
  ]);
}

async function checkDb(): Promise<{ ok: boolean; detail?: string }> {
  try {
    await withTimeout(db.execute(sql`select 1`), 3000, "db");
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

async function checkRedis(): Promise<{ ok: boolean; detail?: string; mode?: string }> {
  if (!process.env.REDIS_URL) {
    if (inlineScanFallbackEnabled()) {
      return {
        ok: true,
        mode: "inline-fallback",
        detail: "REDIS_URL not set; inline scanner fallback is active",
      };
    }
    return { ok: false, detail: "REDIS_URL not set" };
  }
  // Import ioredis lazily — keeps the liveness path free of a Redis
  // connection attempt.
  try {
    const { default: IORedis } = await import("ioredis");
    const client = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
    });
    try {
      await withTimeout(client.connect(), 3000, "redis-connect");
      const pong = await withTimeout(client.ping(), 3000, "redis-ping");
      return { ok: pong === "PONG" };
    } finally {
      client.disconnect();
    }
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

export async function GET(req: NextRequest) {
  const deep = req.nextUrl.searchParams.get("deep") === "1";

  if (!deep) {
    return Response.json({
      ok: true,
      service: "accessops-web",
      mode: "liveness",
      ts: new Date().toISOString(),
    });
  }

  const [database, redis] = await Promise.all([checkDb(), checkRedis()]);
  const ok = database.ok && redis.ok;

  return Response.json(
    {
      ok,
      service: "accessops-web",
      mode: "readiness",
      checks: { database, redis },
      ts: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
