export const SUPPORTED_LOCALES = ["en", "tr"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE_NAME = "percevia_locale";
export const LOCALE_STORAGE_KEY = "percevia.locale:v1";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: unknown): Locale {
  if (isLocale(value)) return value;
  if (typeof value === "string" && value.toLowerCase().startsWith("tr")) return "tr";
  return DEFAULT_LOCALE;
}
