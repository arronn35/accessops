import type { NextConfig } from "next";

/**
 * Baseline security headers.
 *
 * These are static and cheap, so they live here rather than in `proxy.ts`:
 * `headers()` also covers `/api/*` and static assets, which the proxy matcher
 * deliberately skips. The Content-Security-Policy is NOT here — it carries a
 * per-request nonce and is set in `src/proxy.ts`.
 *
 * Permissions-Policy denies the device APIs the product never uses. Scanning
 * happens server-side in the Cloud Run worker, so the browser needs none of
 * them.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "usb=()",
      "xr-spatial-tracking=()",
      "browsing-topics=()",
      "interest-cohort=()",
    ].join(", "),
  },
  // Two years, preload-eligible. Vercel terminates TLS for every domain we
  // serve, so no subdomain is HTTP-only.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework version.
  poweredByHeader: false,
  // @sparticuz/chromium ships ~60MB of compressed browser binaries that are
  // extracted to /tmp at runtime. Bundling them into the serverless function
  // would blow past size limits and break the file-tracer; externalize so the
  // export route requires them from node_modules at runtime instead.
  serverExternalPackages: ["@sparticuz/chromium"],
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
