import Link from "next/link";
import { getInvitationByToken } from "@/lib/data/firestore";
import { verifySessionCookie } from "@/lib/auth/session";
import { AcceptInviteButton } from "./accept-client";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvitationByToken(token);
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));
  return (
    <div className="min-h-screen grid place-items-center bg-canvas-2 px-4">
      <div className="max-w-md rounded-md bg-paper ring-1 ring-line p-6">
        <h1 className="text-xl font-semibold text-ink-900">Workspace invitation</h1>
        <p className="text-sm text-ink-600 mt-2">
          {invite
            ? `You have been invited to join a maitrico Percevia workspace as ${invite.role}.`
            : "This invitation is no longer available."}
        </p>
        {invite && signedIn ? (
          <AcceptInviteButton token={token} />
        ) : invite ? (
          <Link
            href={`/auth/sign-in?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
            className="inline-flex mt-5 h-10 px-3 rounded-md bg-navy-900 text-paper text-sm items-center"
          >
            Sign in to accept
          </Link>
        ) : (
          <Link href="/auth/sign-in" className="inline-flex mt-5 h-10 px-3 rounded-md bg-navy-900 text-paper text-sm items-center">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
