import { purgeExpiredScanData } from "@/lib/data/deletion";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";
import { captureException } from "@/lib/observability";

export const dynamic = "force-dynamic";
// Retention sweeps walk every workspace; give the function room to finish.
export const maxDuration = 300;

/**
 * Daily retention sweep (vercel.json cron, 03:17 UTC). Applies each
 * workspace's `scanDataRetentionDays` to old scans and purges visual
 * evidence past its `expiresAt`.
 *
 * When CRON_SECRET is set, Vercel sends it as a bearer token; reject
 * everything else so the sweep cannot be triggered publicly.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!firebaseAdminConfigured()) {
    return Response.json(
      { ok: false, error: "firebase_admin_not_configured" },
      { status: 503 }
    );
  }
  try {
    const result = await purgeExpiredScanData();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    void captureException(err, { scope: "cron.data-retention" });
    return Response.json({ ok: false, error: "retention_sweep_failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
