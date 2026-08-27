import type { Locale } from "./config";

export type TranslationCatalog = Record<string, string>;

export function normalizeMessage(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function translateWithCatalog(
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
