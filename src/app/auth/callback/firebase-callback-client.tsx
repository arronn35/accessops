"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { Loader2, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import {
  firebaseClientAuth,
  firebaseClientConfigured,
} from "@/lib/firebase/client";

// Must match the key the sign-in form writes before sending the link.
const EMAIL_STORAGE_KEY = "percevia_email_for_sign_in";

/**
 * Landing page for the Firebase email sign-in link. Its only job is to
 * exchange the link for a session and send the user to their dashboard.
 *
 * Keeping this separate from the sign-in form is the whole point: the form
 * page also renders the "we sent you a link" confirmation, so when the email
 * link pointed back at it users could land on that confirmation state instead
 * of being signed in. This page has no other UI to get stuck on — it signs
 * the user in and redirects.
 */
export function FirebaseCallbackClient() {
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallback(searchParams.get("callbackUrl") || "/app");
  const [phase, setPhase] = useState<"working" | "need-email" | "error">("working");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const completeSignIn = useCallback(
    async (address: string, link: string) => {
      const credential = await signInWithEmailLink(firebaseClientAuth(), address, link);
      window.localStorage.removeItem(EMAIL_STORAGE_KEY);
      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken, callbackUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || "Could not create a session.");
      }
      // Full-document navigation so the destination renders with the
      // freshly-set session cookie. `replace` keeps the single-use link out
      // of history so Back doesn't return to a consumed code.
      window.location.replace(sanitizeCallback(body.redirectTo || "/app"));
    },
    [callbackUrl]
  );

  useEffect(() => {
    // Deferred so state updates happen in a callback rather than synchronously
    // in the effect body (react-hooks/set-state-in-effect).
    void Promise.resolve().then(async () => {
      if (!firebaseClientConfigured()) {
        setError("Firebase auth is not configured for this deployment.");
        setPhase("error");
        return;
      }
      const href = window.location.href;
      if (!isSignInWithEmailLink(firebaseClientAuth(), href)) {
        // Not a valid sign-in link — nothing to finish, send them to the form.
        window.location.replace("/auth/sign-in");
        return;
      }
      const storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY);
      if (!storedEmail) {
        // Opened where we can't recall the address (a different browser, or an
        // in-app webview that doesn't share localStorage). Ask for it instead
        // of failing — the single-use code is still unspent at this point.
        setPhase("need-email");
        return;
      }
      try {
        await completeSignIn(storedEmail, href);
      } catch (err) {
        setError(firebaseError(err));
        setPhase("error");
      }
    });
  }, [completeSignIn]);

  async function confirmEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhase("working");
    try {
      await completeSignIn(email.trim(), window.location.href);
    } catch (err) {
      setError(firebaseError(err));
      setPhase("need-email");
    }
  }

  return (
    <div className="min-h-screen bg-canvas-2 flex flex-col">
      <header className="bg-paper border-b border-rule">
        <div className="max-w-md mx-auto px-4 lg:px-8 h-16 flex items-center">
          <Link href="/"><Logo variant="site" /></Link>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 max-w-md w-full mx-auto px-4 lg:px-8 py-16 focus:outline-none"
      >
        {phase === "working" && (
          <div className="text-center">
            <span
              aria-hidden
              className="inline-flex size-12 rounded-md bg-navy-900 text-paper items-center justify-center mb-5"
            >
              <Loader2 className="size-5 animate-spin" />
            </span>
            <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">
              Signing you in…
            </h1>
            <p className="text-sm text-ink-600 mt-3 leading-relaxed" role="status">
              Hold on while we confirm your link and open your dashboard.
            </p>
          </div>
        )}

        {phase === "need-email" && (
          <>
            <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">
              Confirm your email
            </h1>
            <p className="text-sm text-ink-600 mt-2">
              Enter the email address this sign-in link was sent to and we&apos;ll finish
              signing you in.
            </p>

            {error && (
              <AlertCallout tone="danger" title="Sign-in failed" className="mt-5">
                {error}
              </AlertCallout>
            )}

            <form onSubmit={confirmEmail} className="mt-6 space-y-4 bg-paper border border-rule p-6">
              <div>
                <Label htmlFor="email" required>Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <FieldHint>Use the address you requested the link with.</FieldHint>
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md bg-navy-900 text-paper text-sm font-bold hover:bg-navy-800"
              >
                <Mail className="size-4" aria-hidden /> Finish sign-in
              </button>
            </form>
          </>
        )}

        {phase === "error" && (
          <div className="text-center">
            <AlertCallout tone="danger" title="We couldn't sign you in" className="mt-2 text-left">
              {error}
            </AlertCallout>
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center justify-center gap-2 h-11 px-4 mt-6 rounded-md bg-navy-900 text-paper text-sm font-bold hover:bg-navy-800"
            >
              Back to sign-in
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function sanitizeCallback(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

function firebaseError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("auth/invalid-action-code")) {
    return "That sign-in link is invalid or has already been used. Request a new one.";
  }
  if (message.includes("auth/invalid-email")) {
    return "That doesn't match the address the link was sent to.";
  }
  if (message.includes("auth/unauthorized-domain")) {
    return "This domain is not authorized in Firebase Authentication settings.";
  }
  return message || "We couldn't sign you in. Please try again.";
}
