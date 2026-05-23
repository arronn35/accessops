/**
 * Thin Resend helper for transactional emails the app sends outside the
 * Auth.js magic-link flow (which uses its own Resend provider).
 *
 * Re-uses the same RESEND_API_KEY + AUTH_EMAIL_FROM env vars to avoid a
 * second sender configuration. When `RESEND_API_KEY` is missing (local
 * dev, preview deploys), `sendTransactional()` is a no-op that logs the
 * payload so a developer can still see what would have been sent.
 */
import { Resend } from "resend";

let _client: Resend | null = null;
function client(): Resend | null {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _client = new Resend(key);
  return _client;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface TransactionalEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Logical name for observability; not shown to recipient. */
  category: string;
}

export async function sendTransactional(
  msg: TransactionalEmail
): Promise<{ ok: boolean; id?: string; reason?: string }> {
  const from =
    process.env.AUTH_EMAIL_FROM ?? "AccessOps AI <noreply@example.com>";
  const c = client();
  if (!c) {
    console.log(
      JSON.stringify({
        level: "info",
        scope: "email.dryrun",
        category: msg.category,
        to: msg.to,
        subject: msg.subject,
      })
    );
    return { ok: false, reason: "email_not_configured" };
  }
  const res = await c.emails.send({
    from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
  if ((res as { error?: unknown }).error) {
    return {
      ok: false,
      reason: String((res as { error?: { message?: string } }).error?.message ?? "send_failed"),
    };
  }
  return { ok: true, id: (res as { data?: { id?: string } }).data?.id };
}
