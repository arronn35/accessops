import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const COLUMNS = [
  {
    label: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/#how", label: "How it works" },
      { href: "/#who", label: "Who it's for" },
      { href: "/#report", label: "Example report" },
    ],
  },
  {
    label: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/dpa", label: "DPA" },
      { href: "/legal/subprocessors", label: "Subprocessors" },
      { href: "/legal/ai-use", label: "AI Use Disclosure" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/app/compliance", label: "Compliance Center" },
      { href: "/legal/accessibility-methodology", label: "Methodology" },
      { href: "/legal/contact", label: "Contact" },
      { href: "https://maitrico.online", label: "maitrico.online" },
    ],
  },
];

/**
 * Cells are divided by hairlines that survive every breakpoint: a top rule
 * when the grid stacks, a right rule between side-by-side cells.
 */
const CELL =
  "p-8 border-rule border-t first:border-t-0 sm:[&:nth-child(-n+2)]:border-t-0 lg:border-t-0 sm:[&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule bg-canvas">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-rule">
        <div className={CELL}>
          <div className="flex items-center gap-3">
            <Logo
              variant="mark"
              className="size-7 shadow-[4px_4px_0_var(--color-accent)]"
            />
            <span className="text-[17px] font-extrabold tracking-[-0.03em] text-navy-900">
              Percevia AI
            </span>
          </div>
          <p className="mt-5 max-w-[32ch] text-sm leading-relaxed text-ink-600">
            Accessibility operations, not one-click compliance.
          </p>
          <a
            href="mailto:maitritechco@gmail.com"
            className="mt-3.5 inline-block text-sm text-ink-600 hover:text-navy-900"
          >
            maitritechco@gmail.com
          </a>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.label} aria-label={col.label} className={CELL}>
            <div className="eyebrow tracking-[0.16em] text-ink-600">{col.label}</div>
            <div className="mt-4 grid gap-2.5">
              {col.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-navy-900 hover:text-blue-700"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </nav>
        ))}
      </div>
      <p className="px-8 pt-6 pb-9 text-xs leading-relaxed text-ink-600">
        Percevia AI is an accessibility assessment aid and does not provide legal
        advice or certification. © 2026 maitrico.
      </p>
    </footer>
  );
}
