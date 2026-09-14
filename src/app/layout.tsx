import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Archivo, Caveat, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { A11yProvider } from "@/components/accessibility/A11yProvider";
import { SkipToContent } from "@/components/accessibility/SkipToContent";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { LOCALE_COOKIE_NAME, isLocale, normalizeLocale, type Locale } from "@/lib/i18n/config";
import type { TranslationCatalog } from "@/lib/i18n/runtime";
import { AnalyticsPageView } from "@/components/analytics/AnalyticsPageView";

/**
 * Type system: a heavy grotesk for everything structural, mono for
 * micro-labels and data, and a handwritten face for the asides that keep
 * the tone human. Self-hosted by next/font — no request leaves the app.
 */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  // `||` (not `??`) so an empty-string env var falls back too.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://percevia-chi.vercel.app"
  ),
  title: "maitrico Percevia AI — Accessibility operations, not one-click compliance",
  description:
    "AI-assisted accessibility scanning, remediation guidance, and engineering-ready automated reporting for agencies, founders, developers, and product teams.",
  icons: {
    icon: "/brand/percevia-logo.png",
    apple: "/brand/percevia-logo.png",
  },
  openGraph: {
    type: "website",
    title: "maitrico Percevia AI",
    description:
      "Privacy-first accessibility scanning, remediation guidance, and engineering-ready automated reporting.",
    siteName: "maitrico Percevia AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "maitrico Percevia AI",
    description:
      "Privacy-first accessibility scanning, remediation guidance, and engineering-ready automated reporting.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F8FB",
  colorScheme: "light",
};

/**
 * Server-side locale: the cookie wins (it is the user's explicit choice and
 * what `<html lang>` plus the preloaded catalog are derived from). On a first
 * visit there is no cookie yet, so fall back to the browser's Accept-Language
 * — otherwise a Turkish visitor gets `lang="en"` SSR HTML and the screen
 * reader announces Turkish copy with English phonology until hydration.
 */
async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE_NAME)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accepted = (await headers()).get("accept-language");
  return normalizeLocale(accepted?.split(",")[0]?.trim());
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await resolveLocale();
  const initialCatalog: TranslationCatalog | null = locale === "tr"
    ? (await import("@/lib/i18n/translations.tr.json")).default
    : null;

  return (
    <html
      lang={locale}
      className={`h-full antialiased ${archivo.variable} ${plexMono.variable} ${caveat.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh w-full flex-col overflow-x-clip">
        <LanguageProvider initialLocale={locale} initialCatalog={initialCatalog}>
          <A11yProvider>
            <SkipToContent />
            <AnalyticsPageView />
            {children}
          </A11yProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
