"use client";

import { useEffect } from "react";
import { useLanguage } from "./LanguageProvider";
import { isLocale, type Locale } from "@/lib/i18n/config";

export function AccountLocaleSync({ locale }: { locale?: Locale | null }) {
  const { locale: activeLocale, setLocale } = useLanguage();

  useEffect(() => {
    if (isLocale(locale) && locale !== activeLocale) setLocale(locale);
    // The account value should be applied when the server prop changes, not
    // every time the user makes an optimistic local selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, setLocale]);

  return null;
}
