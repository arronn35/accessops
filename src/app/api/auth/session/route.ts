import { z } from "zod";
import { sanitizeCallback } from "@/lib/auth/callback-url";
import {
  clearSessionCookie,
  createFirebaseSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session";
import { firebaseAdminAuth } from "@/lib/firebase/admin";
import { ensureUserAndWorkspace } from "@/lib/data/firestore";
import { recordAnalyticsEvent } from "@/lib/analytics/firestore";
import { afterResponse } from "@/lib/server/after-response";

const SessionSchema = z.object({
  idToken: z.string().min(20),
  callbackUrl: z.string().default("/app"),
});

export async function POST(req: Request) {
  try {
    const parsed = SessionSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ error: "invalid_input" }, { status: 400 });
    }
    const decoded = await firebaseAdminAuth().verifyIdToken(parsed.data.idToken);
    const ctx = await ensureUserAndWorkspace(decoded);
    const sessionCookie = await createFirebaseSessionCookie(parsed.data.idToken);
    await setSessionCookie(sessionCookie);
    afterResponse(() => recordAnalyticsEvent(
      {
        event: ctx.isNewUser ? "signup_completed" : "login_completed",
        properties: { provider: "firebase" },
      },
      { source: "server", userId: decoded.uid, workspaceId: ctx.workspace.id }
    ));
    return Response.json({ ok: true, redirectTo: sanitizeCallback(parsed.data.callbackUrl) });
  } catch (err) {
    return Response.json(
      { error: "session_create_failed", message: (err as Error).message },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}

