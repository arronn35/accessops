import { apiError, requireSession } from "@/lib/api/context";
import { listNotifications } from "@/lib/data/firestore";

export async function GET() {
  try {
    const ctx = await requireSession();
    return Response.json({ notifications: await listNotifications(ctx.workspaceId, 20) });
  } catch (err) {
    return apiError(err);
  }
}
