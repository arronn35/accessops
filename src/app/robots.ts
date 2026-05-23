import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://accessops-chi.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/onboarding", "/auth/sign-in"],
      disallow: ["/app", "/api"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
