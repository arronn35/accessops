import type { Metadata } from "next";
import { Archivo, Caveat, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { A11yProvider } from "@/components/accessibility/A11yProvider";
import { SkipToContent } from "@/components/accessibility/SkipToContent";

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
    "AI-assisted accessibility scanning, remediation guidance, and audit-ready reporting for agencies, founders, developers, and product teams.",
  icons: {
    icon: "/brand/percevia-logo.png",
    apple: "/brand/percevia-logo.png",
  },
  openGraph: {
    type: "website",
    title: "maitrico Percevia AI",
    description:
      "Privacy-first accessibility scanning, remediation guidance, and audit-ready reporting.",
    siteName: "maitrico Percevia AI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${archivo.variable} ${plexMono.variable} ${caveat.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <A11yProvider>
          <SkipToContent />
          {children}
        </A11yProvider>
      </body>
    </html>
  );
}
