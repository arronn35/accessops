import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import { getWorkspace } from "@/lib/data/firestore";
import { polarClient, polarConfigured } from "@/lib/billing/polar";

/**
 * Open the Polar customer portal so a workspace can manage or cancel its
 * subscription. We create a customer session by our workspace id
 * (externalCustomerId) and hand back the portal URL.
 */
export async function GET() {
  try {
    const ctx = await requirePermission("manage_billing");
    if (!polarConfigured()) {
      throw new ApiError(503, "billing_unavailable", "Billing is not configured.");
    }

    const workspace = await getWorkspace(ctx.workspaceId);
    if (!workspace) throw new ApiError(404, "workspace_not_found");
    if (!workspace.polarCustomerId) {
      // No Polar customer yet means this workspace has never checked out.
      throw new ApiError(409, "no_subscription", "No subscription to manage yet.");
    }

    const session = await polarClient().customerSessions.create({
      externalCustomerId: ctx.workspaceId,
    });

    return Response.json({ url: session.customerPortalUrl });
  } catch (err) {
    return apiError(err);
  }
}
