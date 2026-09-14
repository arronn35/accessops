import { purgeExpiredScanData } from "@/lib/data/deletion";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";
import { internalRequestAuthorized } from "@/lib/api/internal-auth";
import { captureException } from "@/lib/observability";

export const dynamic = "force-dynamic";
// Retention sweeps walk every workspace; give the function room to finish.
export const maxDuration = 300;

/**
 * Daily retention sweep (vercel.json cron, 03:17 UTC). Applies each
 * workspace's `scanDataRetentionDays` to old scans and purges visual
 * evidence past its `expiresAt`.
 *
 * Auth: see `@/lib/api/internal-auth`. Vercel Cron only sends the
 * CRON_SECRET bearer token; a Google OIDC token is accepted too when this
 * route is also driven by Cloud Scheduler.
 */
async function authorized(req: Request): Promise<boolean> {
  return internalRequestAuthorized(req);
}

export async function GET(req: Request) {
  if (!(await authorized(req))) {
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
    return Response.json({ ok: !result.failedScans, ...result }, { status: result.failedScans ? 500 : 200 });
  } catch (err) {
    void captureException(err, { scope: "cron.data-retention" });
    return Response.json({ ok: false, error: "retention_sweep_failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
