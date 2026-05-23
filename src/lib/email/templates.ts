/**
 * Plain-text + minimal-HTML templates for transactional emails.
 * Deliberately no styling framework; HTML is inlined and renders cleanly
 * in Gmail, Apple Mail, Outlook.com, and on mobile.
 */
import type { TransactionalEmail } from "./resend-client";

interface InviteArgs {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviterEmail: string;
  acceptUrl: string;
  expiresAt: Date;
}

export function workspaceInviteEmail(args: InviteArgs): TransactionalEmail {
  const expiresHuman = args.expiresAt.toUTCString();
  const subject = `You're invited to "${args.workspaceName}" on AccessOps AI`;

  const text = [
    `${args.inviterName || args.inviterEmail} invited you to join the "${args.workspaceName}" workspace on AccessOps AI.`,
    ``,
    `Accept here (expires ${expiresHuman}):`,
    args.acceptUrl,
    ``,
    `AccessOps AI is an accessibility operations platform. We do not guarantee legal compliance — see https://accessops-chi.vercel.app/legal/terms.`,
    ``,
    `If you weren't expecting this, you can safely ignore the email.`,
  ].join("\n");

  const html = `
    <table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #0E1422; line-height: 1.5;">
      <tr><td style="padding: 24px 0; border-bottom: 1px solid #E4E8F0;">
        <strong style="font-size: 16px;">AccessOps AI</strong>
      </td></tr>
      <tr><td style="padding: 24px 0;">
        <h1 style="font-size: 20px; margin: 0 0 12px;">You're invited to a workspace</h1>
        <p style="margin: 0 0 12px; font-size: 14px;">
          <strong>${escapeHtml(args.inviterName || args.inviterEmail)}</strong>
          invited you to join the
          <strong>${escapeHtml(args.workspaceName)}</strong>
          workspace on AccessOps AI.
        </p>
        <p style="margin: 0 0 24px; font-size: 14px;">
          AccessOps AI is an accessibility operations platform. Accept the invite to start
          collaborating on scans, findings, and remediation tasks.
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${args.acceptUrl}" style="display: inline-block; background: #0B1220; color: #fff; padding: 12px 18px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Accept invitation
          </a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #4B5570;">
          This link expires on ${escapeHtml(expiresHuman)}. If the button doesn't work, copy this URL into your browser:
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #4B5570; word-break: break-all;">
          ${escapeHtml(args.acceptUrl)}
        </p>
      </td></tr>
      <tr><td style="padding: 16px 0; border-top: 1px solid #E4E8F0; font-size: 11px; color: #626C87;">
        AccessOps AI helps identify and manage accessibility issues. It does not guarantee
        ADA, EAA, WCAG, Section 508, or EN 301 549 compliance.
        If you weren't expecting this email, ignore it.
      </td></tr>
    </table>
  `.trim();

  return {
    to: args.to,
    subject,
    html,
    text,
    category: "workspace_invite",
  };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
