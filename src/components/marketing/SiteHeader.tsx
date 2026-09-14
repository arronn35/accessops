import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { PublicLanguageToggle } from "@/components/i18n/PublicLanguageToggle";
import { MobileNavMenu } from "@/components/marketing/MobileNavMenu";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#compliance", label: "Compliance" },
];

const CELL =
  "flex items-center whitespace-nowrap px-3 min-[420px]:px-4 xl:px-5 border-l border-rule eyebrow tracking-[0.04em] text-ink-900 hover:bg-canvas-2";

/**
 * Marketing chrome. The header is a single ruled row: every cell is
 * separated by a hairline of ink rather than whitespace, so the page reads
 * as one continuous frame from header to footer.
 */
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="safe-area-top relative flex min-w-0 items-stretch justify-between border-b border-rule">
      {/* No skip link here: the global SkipToContent in the root layout already
          targets #main. A second one was announced back-to-back with it. */}
      <Link
        href="/"
        aria-label="Percevia AI home"
        className="flex min-w-0 shrink items-center gap-3 border-r border-rule px-3 py-4 min-[420px]:px-4 sm:px-6"
      >
        <Logo variant="site" />
      </Link>

      <nav aria-label="Primary" className="ml-auto flex min-w-0 shrink-0 items-stretch">
        <div className="hidden lg:flex items-stretch">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={CELL}>
              {item.label}
            </Link>
          ))}
        </div>

        <MobileNavMenu items={NAV} />

        {/* Visible at every width: a visitor who needs Turkish needs it most on
            a small screen, where the nav links are already hidden. */}
        <PublicLanguageToggle />

        {signedIn ? (
          <Link
            href="/app"
            className="flex items-center whitespace-nowrap border-l border-rule bg-navy-900 px-3 text-paper eyebrow tracking-[0.04em] hover:bg-navy-800 min-[420px]:px-4 sm:px-6"
          >
            Open dashboard
          </Link>
        ) : (
          <>
            <Link href="/auth/sign-in" className={CELL}>
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="flex items-center whitespace-nowrap border-l border-rule bg-navy-900 px-3 text-paper eyebrow tracking-[0.04em] hover:bg-navy-800 min-[420px]:px-4 sm:px-6"
            >
              <span className="hidden min-[420px]:inline">Start free scan</span>
              <span className="min-[420px]:hidden">Start</span>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
