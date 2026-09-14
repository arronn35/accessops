import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://percevia-chi.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/onboarding", "/auth/sign-in"],
      // Tokenised and per-user surfaces. /r and /statement already send
      // noindex headers of their own; listing them here stops a crawler
      // fetching them at all, which is the stronger guarantee for a URL that
      // is itself the credential.
      disallow: [
        "/app",
        "/api",
        "/r/",
        "/statement/",
        "/invite/",
        "/workspace/",
        "/auth/callback",
      ],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
