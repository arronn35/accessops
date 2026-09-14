import type { Locale } from "./config";

export type TranslationCatalog = Record<string, string>;

export function normalizeMessage(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function translateWithCatalog(
  value: string,
  locale: Locale,
  catalog: TranslationCatalog | null,
  vars?: Record<string, string | number>
): string {
  const translated = translateBase(value, locale, catalog);
  if (!vars) return translated;
  return translated.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

function translateBase(
  value: string,
  locale: Locale,
  catalog: TranslationCatalog | null
): string {
  if (locale === "en" || !value || !catalog) return value;

  const translated = catalog[normalizeMessage(value)];
  if (!translated) return value;

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}
