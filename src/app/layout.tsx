import type { Metadata } from "next";
import "./globals.css";
import { A11yProvider } from "@/components/accessibility/A11yProvider";
import { SkipToContent } from "@/components/accessibility/SkipToContent";

export const metadata: Metadata = {
  // `||` (not `??`) so an empty-string env var falls back too.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://accessops-chi.vercel.app"
  ),
  title: "maitrico AccessOps AI — Accessibility operations, not one-click compliance",
  description:
    "AI-assisted accessibility scanning, remediation guidance, and audit-ready reporting for agencies, founders, developers, and product teams.",
  icons: { icon: "/brand/favicon.svg" },
  openGraph: {
    type: "website",
    title: "maitrico AccessOps AI",
    description:
      "Privacy-first accessibility scanning, remediation guidance, and audit-ready reporting.",
    siteName: "maitrico AccessOps AI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
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
