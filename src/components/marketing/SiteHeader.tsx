import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#compliance", label: "Compliance" },
];

const CELL =
  "flex items-center px-4 xl:px-5 border-l border-rule eyebrow tracking-[0.04em] text-ink-900 hover:bg-canvas-2";

/**
 * Marketing chrome. The header is a single ruled row: every cell is
 * separated by a hairline of ink rather than whitespace, so the page reads
 * as one continuous frame from header to footer.
 */
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="flex items-stretch justify-between border-b border-rule">
      <a
        href="#main"
        className="hidden lg:flex items-center px-4 border-r border-rule bg-navy-900 text-paper eyebrow tracking-[0.12em]"
      >
        Skip to content
      </a>

      <Link
        href="/"
        aria-label="Percevia AI home"
        className="flex items-center gap-3 px-4 sm:px-6 py-4 border-r border-rule"
      >
        <Logo variant="site" />
      </Link>

      <nav aria-label="Primary" className="flex items-stretch ml-auto">
        <div className="hidden lg:flex items-stretch">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={CELL}>
              {item.label}
            </Link>
          ))}
        </div>

        {signedIn ? (
          <Link
            href="/app"
            className="flex items-center px-4 sm:px-6 border-l border-rule bg-navy-900 text-paper eyebrow tracking-[0.04em] hover:bg-navy-800"
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
              className="flex items-center px-4 sm:px-6 border-l border-rule bg-navy-900 text-paper eyebrow tracking-[0.04em] hover:bg-navy-800"
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
