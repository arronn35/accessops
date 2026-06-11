import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { verifySessionCookie } from "@/lib/auth/session";
import { FirebaseSignInForm } from "./firebase-sign-in-form";

export const metadata = { title: "Sign in — AccessOps AI" };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const callbackUrl = sanitizeCallback(params.callbackUrl || "/app");
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));
  if (signedIn) redirect(callbackUrl);

  return (
    <Suspense fallback={<SignInFallback />}>
      <FirebaseSignInForm />
    </Suspense>
  );
}

function SignInFallback() {
  return (
    <div className="min-h-screen bg-canvas-2 flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="max-w-md mx-auto px-4 lg:px-8 h-16 flex items-center">
          <Logo variant="wordmark" />
        </div>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto px-4 lg:px-8 py-12">
        <div className="h-7 w-48 rounded bg-canvas animate-pulse" />
        <div className="mt-4 h-4 w-72 rounded bg-canvas animate-pulse" />
        <div className="mt-8 rounded-lg bg-paper ring-1 ring-line p-6 space-y-4">
          <div className="h-4 w-28 rounded bg-canvas animate-pulse" />
          <div className="h-11 rounded-md bg-canvas animate-pulse" />
          <div className="h-11 rounded-md bg-canvas animate-pulse" />
        </div>
      </main>
    </div>
  );
}

function sanitizeCallback(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}
