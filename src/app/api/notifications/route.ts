import { apiError, requireSession } from "@/lib/api/context";
import {
  getNotificationsSeenAt,
  listNotifications,
  markNotificationsSeen,
} from "@/lib/data/firestore";
import { countUnread, toUiNotification } from "@/lib/notifications";

export async function GET() {
  try {
    const ctx = await requireSession();
    const [logs, lastSeenAt] = await Promise.all([
      listNotifications(ctx.workspaceId, 20),
      getNotificationsSeenAt(ctx.workspaceId, ctx.userId),
    ]);
    return Response.json({
      notifications: logs.map(toUiNotification),
      unreadCount: countUnread(logs, lastSeenAt),
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
    });
  } catch (err) {
    return apiError(err);
  }
}

/** Mark all notifications as read for the current member. */
export async function POST() {
  try {
    const ctx = await requireSession();
    await markNotificationsSeen(ctx.workspaceId, ctx.userId);
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
