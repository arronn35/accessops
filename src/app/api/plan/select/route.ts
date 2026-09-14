import { z } from "zod";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, getWorkspace, updateWorkspace } from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";
import { polarConfigured } from "@/lib/billing/polar";
import { directPlanSelectEnabled } from "@/lib/config";

const Body = z.object({ plan: z.enum(["free", "starter", "agency", "team", "enterprise"]) });

/**
 * Set the workspace plan directly.
 *
 * Once Polar billing is configured this is NOT a payment path: paid tiers must
 * go through Polar checkout, and the verified webhook is the only writer of a
 * paid plan. Active Polar subscriptions must be changed/canceled in the Polar
 * customer portal; the webhook is what eventually writes the paid/free state.
 * When Polar is unconfigured we only keep the direct-write behavior for
 * local/demo builds (see directPlanSelectEnabled). In production a missing
 * billing configuration blocks paid tiers instead of handing them out free.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    if (!roleHasPermission(ctx.role, "manage_billing")) throw new ApiError(403, "forbidden");

    if (parsed.data.plan !== "free") {
      if (polarConfigured()) {
        throw new ApiError(
          409,
          "use_checkout",
          "Paid plans are purchased through checkout, not selected directly."
        );
      }
      // No billing backend. Granting a paid tier here would be an unpaid
      // upgrade, so it is refused unless this is an explicitly enabled
      // local/demo build.
      if (!directPlanSelectEnabled()) {
        throw new ApiError(
          409,
          "billing_not_configured",
          "Paid plans are unavailable because billing is not configured."
        );
      }
    }
    if (polarConfigured() && parsed.data.plan === "free") {
      const workspace = await getWorkspace(ctx.workspaceId);
      if (workspace?.polarCustomerId || workspace?.polarSubscriptionId) {
        throw new ApiError(
          409,
          "use_customer_portal",
          "Cancel or change an active subscription in the billing portal."
        );
      }
    }

    await updateWorkspace(ctx.workspaceId, { plan: parsed.data.plan });
    await audit({ userId: ctx.userId, workspaceId: ctx.workspaceId, action: "plan.selected", resourceType: "workspace", resourceId: ctx.workspaceId, metadata: parsed.data });
    return Response.json({ ok: true, plan: parsed.data.plan });
  } catch (err) {
    return apiError(err);
  }
}
