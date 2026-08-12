import { apiError, requireSession } from "@/lib/api/context";
import {
  listNotifications,
  getNotificationsSeenAt,
  markNotificationsSeen,
} from "@/lib/data/firestore";
import { toUiNotification, countUnread } from "@/lib/notifications";

export async function GET() {
  try {
    const ctx = await requireSession();
    const lastSeenAt = await getNotificationsSeenAt(ctx.workspaceId, ctx.userId);
    const logs = await listNotifications(ctx.workspaceId, 20);
    const notifications = logs.map(toUiNotification);
    const unreadCount = countUnread(logs, lastSeenAt);

    return Response.json({
      notifications,
      unreadCount,
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST() {
  try {
    const ctx = await requireSession();
    await markNotificationsSeen(ctx.workspaceId, ctx.userId);
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
