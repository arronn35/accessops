import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Check your email — AccessOps AI" };

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen bg-canvas-2 flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="max-w-md mx-auto px-4 lg:px-8 h-16 flex items-center">
          <Link href="/"><Logo variant="wordmark" /></Link>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 max-w-md w-full mx-auto px-4 lg:px-8 py-16 focus:outline-none text-center"
      >
        <span
          aria-hidden
          className="inline-flex size-12 rounded-md bg-navy-900 text-paper items-center justify-center mb-5"
        >
          <Mail className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">
          Check your inbox
        </h1>
        <p className="text-sm text-ink-600 mt-3 leading-relaxed">
          We sent a sign-in link to your email address. Open it on this device to continue. The
          link is valid for 15 minutes.
        </p>
        <p className="text-xs text-ink-500 mt-6">
          Didn&apos;t get it?{" "}
          <Link href="/auth/sign-in" className="underline">Try again</Link>.
        </p>
      </main>
    </div>
  );
}
