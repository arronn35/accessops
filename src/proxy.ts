import { NextResponse, type NextRequest } from "next/server";

/**
 * Content-Security-Policy.
 *
 * Next 16 renamed the `middleware` file convention to `proxy`; this file is the
 * documented place to attach a per-request nonce (see
 * `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`).
 * Next reads the CSP off the *request* headers we set below and stamps the same
 * nonce onto the framework's own inline bootstrap scripts, so `'strict-dynamic'`
 * works without allowlisting anything.
 *
 * The static headers (nosniff, Referrer-Policy, Permissions-Policy, HSTS) are
 * in `next.config.ts` instead, because they also apply to `/api/*` and static
 * assets, which this proxy deliberately skips.
 *
 * Known relaxations, deliberate:
 *   - `style-src 'unsafe-inline'`: next/font injects inline `<style>` blocks and
 *     a handful of components use React `style={{…}}` attributes. A nonce would
 *     silently disable `'unsafe-inline'`, so styles get no nonce at all. Style
 *     injection is a far weaker primitive than script injection.
 *   - Firebase endpoints in `connect-src` / `frame-src`: the client SDK talks to
 *     Identity Toolkit, the token service and Firestore directly, and
 *     `signInWithPopup` runs the OAuth handler on the project's auth domain.
 *
 * Set `CSP_REPORT_ONLY=true` to emit `Content-Security-Policy-Report-Only`
 * instead — use it for one deploy when changing the policy, then turn it off.
 */
const FIREBASE_ENDPOINTS = [
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://firestore.googleapis.com",
  "https://www.googleapis.com",
];

function authDomainOrigin(): string | null {
  const domain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  return domain ? `https://${domain}` : null;
}

function buildCsp(nonce: string, isDev: boolean): string {
  const authOrigin = authDomainOrigin();
  const connect = [
    "'self'",
    ...FIREBASE_ENDPOINTS,
    ...(authOrigin ? [authOrigin] : []),
    // Next's dev server uses a websocket for HMR.
    ...(isDev ? ["ws:", "http://localhost:*"] : []),
  ];
  const frame = ["'self'", ...(authOrigin ? [authOrigin] : [])];

  return [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    `frame-src ${frame.join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCsp(nonce, isDev);
  const headerName =
    process.env.CSP_REPORT_ONLY === "true"
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Server components cannot read the current URL. Publishing it lets an
  // auth redirect carry the user's destination through sign-in instead of
  // dropping them on the dashboard. Prefetches skip this proxy (see the
  // matcher's `missing` rules), so readers must tolerate the header's absence.
  requestHeaders.set(
    "x-pathname",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  // Next reads this off the request to nonce its own inline scripts.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(headerName, csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
