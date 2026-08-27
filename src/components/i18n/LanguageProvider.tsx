"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/i18n/config";
import { translateWithCatalog, type TranslationCatalog } from "@/lib/i18n/runtime";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (message: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const TRANSLATABLE_ATTRIBUTES = ["alt", "aria-description", "aria-label", "placeholder", "title"];
const SKIP_SELECTOR = "[data-i18n-skip], code, kbd, pre, samp, script, style";

interface TextState {
  original: string;
  rendered: string;
}

interface AttributeState extends TextState {
  name: string;
}

function shouldSkip(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  return Boolean(element?.closest(SKIP_SELECTOR));
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Cookies remain the durable fallback when storage is unavailable.
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function LanguageProvider({
  children,
  initialLocale,
  initialCatalog,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialCatalog: TranslationCatalog | null;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [catalog, setCatalog] = useState<TranslationCatalog | null>(initialCatalog);
  const localeRef = useRef(locale);
  const catalogRef = useRef<TranslationCatalog | null>(initialCatalog);
  const catalogPromiseRef = useRef<Promise<TranslationCatalog> | null>(null);
  const textStates = useRef(new WeakMap<Text, TextState>());
  const attributeStates = useRef(new WeakMap<Element, Map<string, AttributeState>>());

  const localizeText = useCallback((node: Text, activeLocale: Locale) => {
    if (shouldSkip(node)) return;
    const current = node.nodeValue ?? "";
    let state = textStates.current.get(node);

    if (!state) {
      state = { original: current, rendered: current };
      textStates.current.set(node, state);
    } else if (current !== state.rendered) {
      state.original = current;
    }

    const next = translateWithCatalog(state.original, activeLocale, catalogRef.current);
    state.rendered = next;
    if (current !== next) node.nodeValue = next;
  }, []);

  const localizeAttributes = useCallback((element: Element, activeLocale: Locale) => {
    if (shouldSkip(element)) return;
    let states = attributeStates.current.get(element);
    if (!states) {
      states = new Map();
      attributeStates.current.set(element, states);
    }

    for (const name of TRANSLATABLE_ATTRIBUTES) {
      const current = element.getAttribute(name);
      if (current === null) continue;
      let state = states.get(name);
      if (!state) {
        state = { name, original: current, rendered: current };
        states.set(name, state);
      } else if (current !== state.rendered) {
        state.original = current;
      }

      const next = translateWithCatalog(state.original, activeLocale, catalogRef.current);
      state.rendered = next;
      if (current !== next) element.setAttribute(name, next);
    }
  }, []);

  const localizeTree = useCallback((root: Node, activeLocale: Locale) => {
    if (root.nodeType === Node.TEXT_NODE) {
      localizeText(root as Text, activeLocale);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

    if (root.nodeType === Node.ELEMENT_NODE) {
      const element = root as Element;
      if (element.matches(SKIP_SELECTOR)) return;
      localizeAttributes(element, activeLocale);
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return shouldSkip(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) localizeText(node as Text, activeLocale);
      else localizeAttributes(node as Element, activeLocale);
      node = walker.nextNode();
    }
  }, [localizeAttributes, localizeText]);

  const loadTurkishCatalog = useCallback(() => {
    if (catalogRef.current) return Promise.resolve(catalogRef.current);
    catalogPromiseRef.current ??= import("@/lib/i18n/translations.tr.json").then(
      (module) => module.default as TranslationCatalog
    );
    return catalogPromiseRef.current.then((loadedCatalog) => {
      catalogRef.current = loadedCatalog;
      setCatalog(loadedCatalog);
      return loadedCatalog;
    });
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    localeRef.current = nextLocale;
    setLocaleState(nextLocale);
    persistLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    localizeTree(document.documentElement, nextLocale);
    if (nextLocale === "tr" && !catalogRef.current) {
      void loadTurkishCatalog().then(() => {
        if (localeRef.current === "tr") localizeTree(document.documentElement, "tr");
      });
    }
  }, [loadTurkishCatalog, localizeTree]);

  useLayoutEffect(() => {
    localeRef.current = locale;
    persistLocale(locale);
    document.documentElement.lang = locale;
    localizeTree(document.documentElement, locale);
    if (locale === "tr" && !catalogRef.current) {
      void loadTurkishCatalog().then(() => {
        if (localeRef.current === "tr") localizeTree(document.documentElement, "tr");
      });
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          localizeText(mutation.target as Text, localeRef.current);
        } else if (mutation.type === "attributes") {
          localizeAttributes(mutation.target as Element, localeRef.current);
        } else {
          for (const node of mutation.addedNodes) localizeTree(node, localeRef.current);
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [loadTurkishCatalog, locale, localizeAttributes, localizeText, localizeTree]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    t: (message) => translateWithCatalog(message, locale, catalog),
  }), [catalog, locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
