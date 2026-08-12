import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { verifySessionCookie } from "@/lib/auth/session";

/**
 * Shared chrome for /legal/* pages.
 *
 * Same framed column as the rest of the public site, with a ruled sidebar of
 * sibling documents. Documents themselves are plain RSC pages under this
 * segment; the prose scale below is what gives them their typography.
 */
const LEGAL_NAV = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/ai-use", label: "AI Use Disclosure" },
  { href: "/legal/accessibility-methodology", label: "Accessibility Methodology" },
  { href: "/legal/no-legal-advice", label: "No Legal Advice" },
  { href: "/legal/dpa", label: "Data Processing Addendum" },
  { href: "/legal/subprocessors", label: "Subprocessors" },
  { href: "/legal/contact", label: "Contact" },
];

const PROSE = [
  "text-ink-700 leading-relaxed",
  "[&_h1]:text-[clamp(2rem,3.4vw,2.75rem)] [&_h1]:font-extrabold [&_h1]:tracking-[-0.04em] [&_h1]:leading-[1.02] [&_h1]:text-navy-900 [&_h1]:mt-0 [&_h1]:mb-3",
  "[&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-[-0.03em] [&_h2]:text-navy-900 [&_h2]:mt-12 [&_h2]:mb-3",
  "[&_h3]:text-base [&_h3]:font-bold [&_h3]:text-navy-900 [&_h3]:mt-7 [&_h3]:mb-2",
  "[&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul_li]:mt-1",
  "[&_a]:text-blue-700 [&_a]:underline-offset-2 [&_a:hover]:underline",
  "[&_code]:bg-canvas-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
  "[&_table]:w-full [&_th]:border-b [&_th]:border-rule [&_td]:border-b [&_td]:border-line-soft",
].join(" ");

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));

  return (
    <MarketingShell signedIn={signedIn}>
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-rule px-6 sm:px-10 py-10 lg:border-b-0 lg:border-r">
          <p className="eyebrow tracking-[0.16em] text-ink-600">Legal &amp; trust</p>
          <ul className="mt-5 grid gap-px bg-line-soft border-y border-line-soft">
            {LEGAL_NAV.map((l) => (
              <li key={l.href} className="bg-canvas">
                <Link
                  href={l.href}
                  className="block px-3 py-2.5 text-sm text-navy-900 hover:bg-canvas-2"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Capped and ruled on the right so the long documents keep a
            readable measure and the leftover space reads as margin. */}
        <main
          id="main"
          className={`border-rule px-6 sm:px-10 py-12 lg:max-w-[52rem] lg:border-r lg:py-14 ${PROSE}`}
        >
          {children}
        </main>
      </div>
    </MarketingShell>
  );
}
