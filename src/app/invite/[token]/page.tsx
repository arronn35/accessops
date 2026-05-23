import Link from "next/link";
import type { Session } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaceInvitations, workspaces, users } from "@/lib/db/schema";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/Logo";
import { AcceptInviteButton } from "./accept-client";

export const metadata = { title: "Workspace invitation — AccessOps AI" };
export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // NextAuth's polymorphic `auth` export returns Session | null when
  // called without arguments. Narrow explicitly so the helper signature
  // below stays readable.
  const session = (await auth()) as Session | null;

  const [invite] = await db
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      status: workspaceInvitations.status,
      expiresAt: workspaceInvitations.expiresAt,
      workspaceId: workspaceInvitations.workspaceId,
      workspaceName: workspaces.name,
    })
    .from(workspaceInvitations)
    .leftJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
    .where(eq(workspaceInvitations.token, token))
    .limit(1);

  return (
    <div className="min-h-screen bg-canvas-2 flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="max-w-md mx-auto px-4 lg:px-8 h-16 flex items-center">
          <Link href="/">
            <Logo variant="wordmark" />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 lg:px-8 py-12">
        {!invite && <InvalidState />}
        {invite && invite.status !== "pending" && (
          <NotPendingState status={invite.status} />
        )}
        {invite && invite.status === "pending" && invite.expiresAt < new Date() && (
          <ExpiredState />
        )}
        {invite &&
          invite.status === "pending" &&
          invite.expiresAt >= new Date() &&
          (await renderActionable(invite, session, token))}
      </main>
    </div>
  );
}

async function renderActionable(
  invite: {
    email: string;
    role: string;
    expiresAt: Date;
    workspaceName: string | null;
  },
  session: Session | null,
  token: string
) {
  if (!session?.user?.id) {
    const callback = `/invite/${token}`;
    return (
      <div className="bg-paper rounded-lg ring-1 ring-line p-6">
        <h1 className="text-xl font-semibold text-ink-900 tracking-tight">
          Workspace invitation
        </h1>
        <p className="text-sm text-ink-700 mt-2">
          You&apos;ve been invited to join{" "}
          <strong>{invite.workspaceName ?? "a workspace"}</strong> as a{" "}
          <strong>{invite.role}</strong>.
        </p>
        <p className="text-sm text-ink-600 mt-3">
          Sign in with <strong>{invite.email}</strong> to accept.
        </p>
        <Link
          href={`/auth/sign-in?callbackUrl=${encodeURIComponent(callback)}`}
          className="mt-5 inline-flex h-11 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium items-center justify-center"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }

  const [me] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const sameEmail =
    !!me?.email && me.email.toLowerCase() === invite.email.toLowerCase();

  return (
    <div className="bg-paper rounded-lg ring-1 ring-line p-6">
      <h1 className="text-xl font-semibold text-ink-900 tracking-tight">
        Workspace invitation
      </h1>
      <p className="text-sm text-ink-700 mt-2">
        You&apos;ve been invited to join{" "}
        <strong>{invite.workspaceName ?? "a workspace"}</strong> as a{" "}
        <strong>{invite.role}</strong>.
      </p>
      {sameEmail ? (
        <AcceptInviteButton token={token} />
      ) : (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3">
          You&apos;re signed in as <strong>{me?.email}</strong>, but this invite is
          for <strong>{invite.email}</strong>.{" "}
          <Link
            href="/api/auth/signout"
            className="underline"
          >
            Sign out
          </Link>{" "}
          and sign back in with the invited address.
        </div>
      )}
      <p className="text-xs text-ink-500 mt-4">
        Expires {invite.expiresAt.toUTCString()}.
      </p>
    </div>
  );
}

function InvalidState() {
  return (
    <div className="bg-paper rounded-lg ring-1 ring-line p-6">
      <h1 className="text-xl font-semibold text-ink-900 tracking-tight">
        Invitation not found
      </h1>
      <p className="text-sm text-ink-700 mt-2">
        This link is invalid or has been revoked. Ask the inviter to send a new
        one.
      </p>
      <Link href="/" className="text-blue-600 hover:underline text-sm mt-4 inline-block">
        Back home
      </Link>
    </div>
  );
}

function NotPendingState({ status }: { status: string }) {
  return (
    <div className="bg-paper rounded-lg ring-1 ring-line p-6">
      <h1 className="text-xl font-semibold text-ink-900 tracking-tight">
        Invitation no longer active
      </h1>
      <p className="text-sm text-ink-700 mt-2">
        This invitation is <strong>{status}</strong> and can&apos;t be used.
      </p>
      <Link href="/" className="text-blue-600 hover:underline text-sm mt-4 inline-block">
        Back home
      </Link>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="bg-paper rounded-lg ring-1 ring-line p-6">
      <h1 className="text-xl font-semibold text-ink-900 tracking-tight">
        Invitation expired
      </h1>
      <p className="text-sm text-ink-700 mt-2">
        This invitation has expired. Ask the inviter to send a new one.
      </p>
      <Link href="/" className="text-blue-600 hover:underline text-sm mt-4 inline-block">
        Back home
      </Link>
    </div>
  );
}
