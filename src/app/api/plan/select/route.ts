import { z } from "zod";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, getWorkspace, updateWorkspace } from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";
import { polarConfigured } from "@/lib/billing/polar";

const Body = z.object({ plan: z.enum(["free", "starter", "agency", "team", "enterprise"]) });

/**
 * Set the workspace plan directly.
 *
 * Once Polar billing is configured this is NOT a payment path: paid tiers must
 * go through Polar checkout, and the verified webhook is the only writer of a
 * paid plan. Active Polar subscriptions must be changed/canceled in the Polar
 * customer portal; the webhook is what eventually writes the paid/free state.
 * When Polar is unconfigured (local dev / demo) we keep the old behavior so
 * the app is usable without a billing backend.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    if (!roleHasPermission(ctx.role, "manage_billing")) throw new ApiError(403, "forbidden");

    if (polarConfigured() && parsed.data.plan !== "free") {
      throw new ApiError(
        409,
        "use_checkout",
        "Paid plans are purchased through checkout, not selected directly."
      );
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
