/**
 * Next.js Proxy — auth gate for /app/* and protected /api/* routes.
 *
 * IMPORTANT: this file runs in the Edge runtime. It must NOT import
 * Firebase Admin uses Node-only APIs, so the proxy only checks for the
 * HTTP-only session cookie. Route handlers and RSC pages do full verification.
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
  "/workspace/setup",
  "/app",
  "/api/scans",
  "/api/issues",
  "/api/reports",
  "/api/remediation-tasks",
  "/api/privacy",
  "/api/team",
  "/api/ai-assistant",
  "/api/workspace",
  "/api/plan",
];

const SESSION_COOKIE_NAME =
  process.env.FIREBASE_SESSION_COOKIE_NAME || "accessops_session";
const SESSION_COOKIES = [
  SESSION_COOKIE_NAME,
  `__Secure-${SESSION_COOKIE_NAME}`,
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
