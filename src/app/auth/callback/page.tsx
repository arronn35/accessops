import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { verifySessionCookie } from "@/lib/auth/session";
import { FirebaseCallbackClient } from "./firebase-callback-client";

export const metadata = { title: "Signing you in — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function CallbackPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const callbackUrl = sanitizeCallback(params.callbackUrl || "/app");

  // Already signed in (e.g. the link was opened a second time) — skip the
  // exchange and go straight to the destination.
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));
  if (signedIn) redirect(callbackUrl);

  return (
    <Suspense fallback={<CallbackFallback />}>
      <FirebaseCallbackClient />
    </Suspense>
  );
}

function CallbackFallback() {
  return (
    <div className="min-h-screen bg-canvas-2 flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="max-w-md mx-auto px-4 lg:px-8 h-16 flex items-center">
          <Logo variant="wordmark" />
        </div>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto px-4 lg:px-8 py-16 text-center">
        <span
          aria-hidden
          className="inline-flex size-12 rounded-md bg-navy-900 text-paper items-center justify-center mb-5"
        >
          <Loader2 className="size-5 animate-spin" />
        </span>
        <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">
          Signing you in…
        </h1>
      </main>
    </div>
  );
}

function sanitizeCallback(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}
