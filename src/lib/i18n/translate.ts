import turkishCatalog from "./translations.tr.json";
import type { Locale } from "./config";
import { normalizeMessage, translateWithCatalog } from "./runtime";

const catalog = turkishCatalog as Record<string, string>;

export function translateMessage(
  value: string,
  locale: Locale,
  vars?: Record<string, string | number>
): string {
  return translateWithCatalog(value, locale, catalog, vars);
}

export function hasTurkishTranslation(value: string): boolean {
  return Boolean(catalog[normalizeMessage(value)]);
}
