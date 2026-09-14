"use client";

import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/config";
import { useLanguage } from "./LanguageProvider";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, { short: string; full: string }> = {
  en: { short: "EN", full: "English" },
  tr: { short: "TR", full: "Türkçe" },
};

function prefetchTurkishCatalog() {
  void import("@/lib/i18n/translations.tr.json");
}

/**
 * Language switch for signed-out pages.
 *
 * The full LanguageSettings control also syncs the choice to the account via
 * PATCH /api/me, which a visitor cannot do. This one only calls setLocale,
 * which writes the cookie and localStorage — and because the root layout reads
 * that cookie server-side, the next page already renders in the chosen
 * language rather than flashing English first.
 *
 * Without it a Turkish visitor could reach a Turkish page but had no way to
 * choose Turkish, and no way to keep it through pricing and sign-in.
 */
export function PublicLanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      className={cn("flex items-stretch", className)}
      role="group"
      aria-label="Interface language"
    >
      {SUPPORTED_LOCALES.map((option) => {
        const selected = option === locale;
        return (
          <button
            key={option}
            type="button"
            // aria-pressed rather than a link: this changes the current page in
            // place, it does not navigate anywhere.
            aria-pressed={selected}
            onClick={() => setLocale(option)}
            // Warm the Turkish catalog chunk on hover/focus so the first
            // toggle doesn't flash English while the dynamic import resolves.
            // Same specifier the provider imports → shared module cache.
            onMouseEnter={option === "tr" ? prefetchTurkishCatalog : undefined}
            onFocus={option === "tr" ? prefetchTurkishCatalog : undefined}
            className={cn(
              "flex items-center whitespace-nowrap border-l border-rule px-2.5 eyebrow tracking-[0.04em] min-[420px]:px-3",
              selected
                ? "bg-navy-900 text-paper"
                : "text-ink-600 hover:bg-canvas-2 hover:text-ink-900"
            )}
          >
            {/* Autonyms: each language is named in itself, so someone who
                cannot read the current language can still find theirs.
                data-i18n-skip keeps the provider from turning "English" into
                "İngilizce" once Turkish is active. */}
            <span aria-hidden data-i18n-skip>
              {LABELS[option].short}
            </span>
            <span className="sr-only" data-i18n-skip>
              {LABELS[option].full}
            </span>
          </button>
        );
      })}
    </div>
  );
}
