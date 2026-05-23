/**
 * Next.js Proxy — auth gate for /app/* and protected /api/* routes.
 *
 * IMPORTANT: this file runs in the Edge runtime. It must NOT import
 * `@/auth` (the full NextAuth config), because the Drizzle adapter and
 * the `pg` / Neon drivers depend on Node built-ins (`node:util/types`,
 * etc.) that the Edge runtime does not provide.
 *
 * The proxy only does a cheap, edge-safe check: is a session cookie
 * present? If not, redirect to sign-in (or 401 for API routes).
 *
 * This is a UX gate, not the security boundary. Every protected page
 * calls `getCurrentWorkspaceOrRedirect()` and every protected API route
 * calls `requireSession()` — both run in the Node runtime and perform
 * real database-backed session validation. A forged or stale cookie gets
 * past this proxy but is rejected there.
 */
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/app",
  "/api/scans",
  "/api/issues",
  "/api/reports",
  "/api/remediation-tasks",
  "/api/privacy",
];

// Auth.js v5 database-strategy session cookie names.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (hasSession) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/auth/sign-in", req.nextUrl.origin);
  signInUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/.*|mock/.*|auth/.*|api/auth/.*).*)",
  ],
};
