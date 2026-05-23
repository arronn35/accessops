import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { signInWithGithub, signInWithResend } from "./actions";

export const metadata = { title: "Sign in — AccessOps AI" };

const githubEnabled = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
const resendEnabled = !!process.env.RESEND_API_KEY;

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return <SignInForm searchParams={searchParams} />;
}

async function SignInForm({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl = "/app", error } = await searchParams;
  const errorMessage = signInErrorMessage(error);

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
          Sign in to AccessOps AI
        </h1>
        <p className="text-sm text-ink-600 mt-2">
          We&apos;ll email you a one-time sign-in link. No password to manage.
        </p>

        {errorMessage && (
          <AlertCallout tone="danger" title="Sign-in failed" className="mt-5">
            {errorMessage}
          </AlertCallout>
        )}

        {!resendEnabled && (
          <AlertCallout tone="warning" title="Email sign-in not configured" className="mt-5">
            RESEND_API_KEY is missing in this environment. Set it in <code>.env.local</code>{" "}
            and restart, or use GitHub if available.
          </AlertCallout>
        )}

        {resendEnabled && (
          <form
            action={signInWithResend}
            className="mt-6 space-y-4 bg-paper rounded-lg ring-1 ring-line p-6"
          >
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <div>
              <Label htmlFor="email" required>Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <FieldHint>
                We&apos;ll send a one-time sign-in link valid for 15 minutes.
              </FieldHint>
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
            >
              <Mail className="size-4" aria-hidden /> Email me a sign-in link
            </button>
          </form>
        )}

        {githubEnabled && (
          <>
            <div className="flex items-center gap-3 my-6">
              <span className="flex-1 h-px bg-line" aria-hidden />
              <span className="text-xs text-ink-500 uppercase tracking-wider">or</span>
              <span className="flex-1 h-px bg-line" aria-hidden />
            </div>
            <form
              action={signInWithGithub}
            >
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-900 hover:bg-canvas-2"
              >
                Continue with GitHub <ArrowRight className="size-4" aria-hidden />
              </button>
            </form>
          </>
        )}

        <p className="text-xs text-ink-500 mt-6 leading-relaxed">
          By signing in you agree to our{" "}
          <Link href="/legal/terms" className="underline">Terms</Link> and{" "}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>, and
          acknowledge that AccessOps AI does not guarantee legal compliance with ADA, EAA,
          WCAG, Section 508, or EN 301 549.
        </p>
      </main>
    </div>
  );
}

function signInErrorMessage(error?: string): string | null {
  switch (error) {
    case undefined:
      return null;
    case "Configuration":
    case "MissingSecret":
    case "MissingAdapter":
    case "MissingAdapterMethods":
      return "Authentication is not fully configured on this deployment. Check AUTH_SECRET, DATABASE_URL, RESEND_API_KEY, and AUTH_EMAIL_FROM.";
    case "EmailSignin":
    case "Verification":
      return "We could not send or verify that sign-in link. Please check the email address and try again.";
    case "OAuthSignin":
    case "OAuthCallbackError":
      return "GitHub sign-in could not be completed. Please try again or use email sign-in.";
    default:
      return "We couldn't sign you in. Please try again or contact support.";
  }
}
