import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

/**
 * Shared chrome for /legal/* pages.
 *
 * Keeps the marketing site's header/footer feel but with prose-friendly
 * widths and a sidebar of sibling documents. Documents themselves are
 * plain RSC pages under this segment; they import from this layout's
 * sibling `legal.css` for typography.
 */
const LEGAL_NAV = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/dpa", label: "Data Processing Addendum" },
  { href: "/legal/subprocessors", label: "Subprocessors" },
  { href: "/legal/contact", label: "Contact" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-paper min-h-screen">
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="wordmark" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-900"
          >
            <ArrowLeft className="size-4" aria-hidden /> Back home
          </Link>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12 lg:py-16 grid lg:grid-cols-[220px_1fr] gap-10">
        <aside className="lg:sticky lg:top-24 self-start">
          <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-3">
            Legal & trust
          </p>
          <ul className="space-y-1">
            {LEGAL_NAV.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block px-3 py-2 rounded-md text-sm text-ink-700 hover:bg-canvas-2"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <main className="max-w-2xl text-ink-700 leading-relaxed [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-ink-900 [&_h1]:mt-0 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul_li]:mt-1 [&_a]:text-blue-600 [&_a]:underline-offset-2 [&_a:hover]:underline [&_code]:bg-canvas-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
          {children}
        </main>
      </div>
      <footer className="border-t border-line py-10 mt-10">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 text-xs text-ink-500">
          © 2026 maitrico ·{" "}
          <Link href="/legal/contact" className="hover:text-ink-700">
            Contact
          </Link>
        </div>
      </footer>
    </div>
  );
}
