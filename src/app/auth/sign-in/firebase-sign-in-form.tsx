"use client";

import Link from "next/link";
import { sanitizeCallback } from "@/lib/auth/callback-url";
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
import { useLanguage } from "@/components/i18n/LanguageProvider";
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
  // Copy renders through React state (never the DOM-mutating i18n observer):
  // every keystroke re-renders this form and mutated text nodes throw
  // hydration #418. data-i18n-skip keeps the observer off this subtree.
  // Error state keeps source English; translation happens at render so a
  // later language switch still applies.
  const { t } = useLanguage();

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
    <div className="min-h-screen bg-canvas-2 flex flex-col" data-i18n-skip>
      <header className="bg-paper border-b border-rule">
        <div className="max-w-md mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo variant="site" /></Link>
          <Link href="/" className="text-xs text-ink-600 hover:text-ink-900">
            {t("Back home")}
          </Link>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 max-w-md w-full mx-auto px-4 lg:px-8 py-12 focus:outline-none"
      >
        <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">
          {t("Sign in to Percevia AI")}
        </h1>
        <p className="text-sm text-ink-600 mt-2">
          {t("Use a Firebase email link or continue with GitHub. No password to manage.")}
        </p>

        {!configured && (
          <AlertCallout tone="warning" title={t("Firebase auth is not configured")} className="mt-5">
            {t("Add the NEXT_PUBLIC_FIREBASE_* variables for this deployment.")}
          </AlertCallout>
        )}

        {error && (
          <AlertCallout tone="danger" title={t("Sign-in failed")} className="mt-5">
            {t(error)}
          </AlertCallout>
        )}

        {status === "sent" && (
          <AlertCallout tone="success" title={t("Check your email")} className="mt-5">
            {t("We sent a Firebase sign-in link to")} {email}.
          </AlertCallout>
        )}

        <form onSubmit={sendEmailLink} className="mt-6 space-y-4 bg-paper border border-rule p-6">
          <div>
            <Label htmlFor="email" required>{t("Email address")}</Label>
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
              {t("We'll send a one-time Firebase sign-in link.")}
            </FieldHint>
          </div>
          <button
            type="submit"
            disabled={!configured || status === "sending" || status === "signing-in"}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md bg-navy-900 text-paper text-sm font-bold hover:bg-navy-800 disabled:opacity-60"
          >
            <Mail className="size-4" aria-hidden />
            {pendingLink
              ? status === "signing-in"
                ? t("Signing in...")
                : t("Finish sign-in")
              : status === "sending"
              ? t("Sending...")
              : t("Email me a sign-in link")}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <span className="flex-1 h-px bg-line" aria-hidden />
          <span className="text-xs text-ink-500 uppercase tracking-wider">{t("or")}</span>
          <span className="flex-1 h-px bg-line" aria-hidden />
        </div>
        <button
          type="button"
          onClick={() => void githubSignIn()}
          disabled={!configured || status === "signing-in"}
          className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 border border-rule bg-paper text-sm font-medium text-ink-900 hover:bg-canvas-2 disabled:opacity-60"
        >
          {status === "signing-in" ? t("Signing in...") : t("Continue with GitHub")}
          <ArrowRight className="size-4" aria-hidden />
        </button>

        <p className="text-xs text-ink-500 mt-6 leading-relaxed">
          {t("By signing in you agree to our")}{" "}
          <Link href="/legal/terms" className="underline">{t("Terms")}</Link> {t("and")}{" "}
          <Link href="/legal/privacy" className="underline">{t("Privacy Policy")}</Link>
          {t(", and acknowledge that Percevia AI does not guarantee legal compliance.")}
        </p>
      </main>
    </div>
  );
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
