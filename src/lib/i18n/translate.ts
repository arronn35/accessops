import turkishCatalog from "./translations.tr.json";
import type { Locale } from "./config";
import { normalizeMessage, translateWithCatalog } from "./runtime";

const catalog = turkishCatalog as Record<string, string>;

export function translateMessage(value: string, locale: Locale): string {
  return translateWithCatalog(value, locale, catalog);
}

export function hasTurkishTranslation(value: string): boolean {
  return Boolean(catalog[normalizeMessage(value)]);
}
