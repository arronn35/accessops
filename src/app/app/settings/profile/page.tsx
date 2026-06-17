import Link from "next/link";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { ProfileClient } from "./profile-client";

export const metadata = { title: "Profile — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const ctx = await getCurrentWorkspaceOrRedirect();

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10">
      <div className="mb-6">
        <Link
          href="/app/settings"
          className="text-xs text-ink-500 hover:text-ink-700"
        >
          ← Settings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 mt-2">
          Profile
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          Manage the name and account details used across your workspace.
        </p>
      </div>

      <ProfileClient
        name={ctx.user.name ?? null}
        fullName={ctx.user.fullName ?? null}
        email={ctx.user.email ?? null}
      />
    </div>
  );
}
