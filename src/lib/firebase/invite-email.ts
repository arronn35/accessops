/**
 * Invitation email delivery via Firebase Auth email-link — no SMTP
 * provider, no extra cost. The invite email is a Firebase sign-in link
 * whose continue URL routes through /auth/sign-in (which completes
 * `signInWithEmailLink`) and then forwards to the invite-accept page.
 *
 * Client-side only: `sendSignInLinkToEmail` is a Firebase client SDK
 * call, so the inviter's browser performs the send right after the
 * invitation is created.
 */
import { sendSignInLinkToEmail } from "firebase/auth";
import { firebaseClientAuth, firebaseClientConfigured } from "@/lib/firebase/client";

/**
 * The email link must land on the sign-in page (the only place that
 * completes email-link auth), carrying the invite path as callbackUrl.
 */
export function signInUrlForInvite(inviteUrl: string): string {
  const target = new URL(inviteUrl);
  const callback = encodeURIComponent(`${target.pathname}${target.search}`);
  return `${target.origin}/auth/sign-in?callbackUrl=${callback}`;
}

/** Returns true when the email was handed to Firebase for delivery. */
export async function sendInviteEmail(
  email: string,
  inviteUrl: string
): Promise<boolean> {
  if (!firebaseClientConfigured()) return false;
  try {
    await sendSignInLinkToEmail(firebaseClientAuth(), email, {
      url: signInUrlForInvite(inviteUrl),
      handleCodeInApp: true,
    });
    return true;
  } catch {
    // Quota, blocked domain, malformed address — the caller falls back
    // to manual link sharing, so this is intentionally non-throwing.
    return false;
  }
}
