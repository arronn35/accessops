import Link from "next/link";
import { canonical } from "@/lib/seo/canonical";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SectionTag, Aside } from "@/components/marketing/SectionTag";
import { verifySessionCookie } from "@/lib/auth/session";

export const metadata = {
  ...canonical("/"),
  title: "Page not found — Percevia AI",
  description:
    "The page you asked for does not exist. Return home or pick one of these routes to keep going.",
};

const SUGGESTED = [
  { href: "/pricing", label: "Pricing" },
  { href: "/sample-report", label: "Sample report" },
  { href: "/legal/contact", label: "Contact" },
];

export default async function NotFound() {
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));

  return (
    <MarketingShell signedIn={signedIn}>
      <main id="main">
        <section className="border-b border-rule px-6 py-14 sm:px-10 sm:py-20">
          <SectionTag index="04" label="Missing page" />
          <h1 className="mt-8 max-w-[16ch] font-extrabold leading-[0.95] tracking-[-0.045em] text-[clamp(2.4rem,6vw,5rem)]">
            This page could not be found.
          </h1>
          <Aside className="mt-5">a wrong turn, not a dead end</Aside>
          <p className="mt-7 max-w-[60ch] text-lg leading-relaxed text-ink-700">
            The link you followed may be mistyped, or the page may have moved.
            Start again from the home page, or jump straight to one of these:
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center bg-navy-900 px-7 text-sm font-bold text-paper hover:bg-navy-800"
            >
              Back home
            </Link>
            {SUGGESTED.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="inline-flex min-h-12 items-center border border-rule bg-canvas px-7 text-sm font-bold text-navy-900 hover:bg-canvas-2"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
