"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/LanguageProvider";

/**
 * Marketing navigation for narrow viewports.
 *
 * The header's primary links are `hidden lg:flex`, with nothing in their place
 * below that width — so on a phone the only route to pricing, or to how the
 * product works, was to scroll the landing page (roughly 24 screens) or to
 * find the footer. The links existed; they were simply unreachable.
 *
 * A disclosure rather than a dialog: it reveals navigation that is part of the
 * page, it does not demand a decision. Escape closes it and focus returns to
 * the trigger, so keyboard users are never stranded inside it.
 */
export function MobileNavMenu({
  items,
}: {
  items: Array<{ href: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Menu labels go through React state, not the DOM-mutating i18n observer:
  // the trigger re-renders on every toggle and mutated text nodes throw
  // hydration #418. data-i18n-skip keeps the observer off this subtree.
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="flex items-stretch lg:hidden" data-i18n-skip>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 whitespace-nowrap border-l border-rule px-3 eyebrow tracking-[0.04em] text-ink-900 hover:bg-canvas-2"
      >
        {open ? (
          <X className="size-4" aria-hidden />
        ) : (
          <Menu className="size-4" aria-hidden />
        )}
        <span>{t("Menu")}</span>
      </button>

      {/* Rendered always, toggled with hidden, so the ids referenced by
          aria-controls resolve whether or not the panel is showing. */}
      <div
        id={panelId}
        hidden={!open}
        className={cn(
          "absolute inset-x-0 top-full z-50 border-b border-rule bg-paper shadow-[var(--shadow-card)]"
        )}
      >
        <nav aria-label="Primary (mobile)">
          <ul className="divide-y divide-rule">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center px-5 text-sm font-medium text-ink-900 hover:bg-canvas-2"
                >
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
