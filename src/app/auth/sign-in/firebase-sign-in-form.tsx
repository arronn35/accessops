"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GithubAuthProvider,
  getRedirectResult,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
} from "firebase/auth";
import { ArrowRight, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import {
  firebaseClientAuth,
  firebaseClientConfigured,
} from "@/lib/firebase/client";

const EMAIL_STORAGE_KEY = "percevia_email_for_sign_in";

export function FirebaseSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallback(searchParams.get("callbackUrl") || "/app");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "signing-in">("idle");
  const [error, setError] = useState<string | null>(null);
  // True when the page was opened from an email link on a device that
  // doesn't know the address — the form completes the existing link
  // instead of sending a new one (typical for invitation emails).
  const [pendingLink, setPendingLink] = useState(false);
  const configured = firebaseClientConfigured();

  const finishSignIn = useCallback(
    async (idToken: string, nextUrl: string) => {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken, callbackUrl: nextUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || "Could not create a session.");
      }
      router.refresh();
      window.location.assign(sanitizeCallback(body.redirectTo || "/app"));
    },
    [router]
  );

  useEffect(() => {
    if (!configured) return;
    const auth = firebaseClientAuth();
    void getRedirectResult(auth)
      .then(async (result) => {
        if (!result) return;
        await finishSignIn(await result.user.getIdToken(), callbackUrl);
      })
      .catch((err) => setError(firebaseError(err)));
  }, [callbackUrl, configured, finishSignIn]);

  useEffect(() => {
    if (!configured || !isSignInWithEmailLink(firebaseClientAuth(), window.location.href)) {
      return;
    }
    // Deferred so state updates happen in a callback, not synchronously in
    // the effect body (react-hooks/set-state-in-effect).
    void Promise.resolve().then(async () => {
      const storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY);
      if (!storedEmail) {
        setPendingLink(true);
        setError("Enter the email address this link was sent to, then finish signing in.");
        return;
      }
      setStatus("signing-in");
      try {
        const credential = await signInWithEmailLink(
          firebaseClientAuth(),
          storedEmail,
          window.location.href
        );
        window.localStorage.removeItem(EMAIL_STORAGE_KEY);
        await finishSignIn(await credential.user.getIdToken(), callbackUrl);
      } catch (err) {
        setError(firebaseError(err));
        setStatus("idle");
      }
    });
  }, [callbackUrl, configured, finishSignIn]);

  async function sendEmailLink(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    if (pendingLink) {
      setError(null);
      setStatus("signing-in");
      try {
        const credential = await signInWithEmailLink(
          firebaseClientAuth(),
          email.trim(),
          window.location.href
        );
        window.localStorage.removeItem(EMAIL_STORAGE_KEY);
        await finishSignIn(await credential.user.getIdToken(), callbackUrl);
      } catch (err) {
        setError(firebaseError(err));
        setStatus("idle");
      }
      return;
    }
    setError(null);
    setStatus("sending");
    try {
      await sendSignInLinkToEmail(firebaseClientAuth(), email.trim(), {
        // Land on the dedicated callback route, not this form — the callback
        // completes the sign-in and redirects straight to the dashboard so the
        // user never lands back on the "check your email" confirmation.
        url: `${window.location.origin}/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(EMAIL_STORAGE_KEY, email.trim());
      setStatus("sent");
    } catch (err) {
      setError(firebaseError(err));
      setStatus("idle");
    }
  }

  async function githubSignIn() {
    if (!configured) return;
    setError(null);
    setStatus("signing-in");
    try {
      const result = await signInWithPopup(firebaseClientAuth(), new GithubAuthProvider());
      await finishSignIn(await result.user.getIdToken(), callbackUrl);
    } catch (err) {
      setError(firebaseError(err));
      setStatus("idle");
    }
  }

  return (
    <div className="min-h-screen bg-canvas-2 flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="max-w-md mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo variant="wordmark" /></Link>
          <Link href="/" className="text-xs text-ink-600 hover:text-ink-900">
            Back home
          </Link>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 max-w-md w-full mx-auto px-4 lg:px-8 py-12 focus:outline-none"
      >
        <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">
          Sign in to Percevia AI
        </h1>
        <p className="text-sm text-ink-600 mt-2">
          Use a Firebase email link or continue with GitHub. No password to manage.
        </p>

        {!configured && (
          <AlertCallout tone="warning" title="Firebase auth is not configured" className="mt-5">
            Add the NEXT_PUBLIC_FIREBASE_* variables for this deployment.
          </AlertCallout>
        )}

        {error && (
          <AlertCallout tone="danger" title="Sign-in failed" className="mt-5">
            {error}
          </AlertCallout>
        )}

        {status === "sent" && (
          <AlertCallout tone="success" title="Check your email" className="mt-5">
            We sent a Firebase sign-in link to {email}.
          </AlertCallout>
        )}

        <form onSubmit={sendEmailLink} className="mt-6 space-y-4 bg-paper rounded-lg ring-1 ring-line p-6">
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
              disabled={!configured || status === "sending" || status === "signing-in"}
            />
            <FieldHint>
              We&apos;ll send a one-time Firebase sign-in link.
            </FieldHint>
          </div>
          <button
            type="submit"
            disabled={!configured || status === "sending" || status === "signing-in"}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800 disabled:opacity-60"
          >
            <Mail className="size-4" aria-hidden />
            {pendingLink
              ? status === "signing-in"
                ? "Signing in..."
                : "Finish sign-in"
              : status === "sending"
              ? "Sending..."
              : "Email me a sign-in link"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <span className="flex-1 h-px bg-line" aria-hidden />
          <span className="text-xs text-ink-500 uppercase tracking-wider">or</span>
          <span className="flex-1 h-px bg-line" aria-hidden />
        </div>
        <button
          type="button"
          onClick={() => void githubSignIn()}
          disabled={!configured || status === "signing-in"}
          className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-900 hover:bg-canvas-2 disabled:opacity-60"
        >
          {status === "signing-in" ? "Signing in..." : "Continue with GitHub"}
          <ArrowRight className="size-4" aria-hidden />
        </button>

        <p className="text-xs text-ink-500 mt-6 leading-relaxed">
          By signing in you agree to our{" "}
          <Link href="/legal/terms" className="underline">Terms</Link> and{" "}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>, and
          acknowledge that Percevia AI does not guarantee legal compliance.
        </p>
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
  if (message.includes("auth/popup-blocked")) return "The GitHub popup was blocked.";
  if (message.includes("auth/invalid-action-code")) return "That sign-in link is invalid or expired.";
  if (message.includes("auth/unauthorized-domain")) {
    return "This domain is not authorized in Firebase Authentication settings.";
  }
  return message || "We couldn't sign you in. Please try again.";
}
