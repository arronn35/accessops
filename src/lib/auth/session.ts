import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { firebaseAdminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME =
  process.env.FIREBASE_SESSION_COOKIE_NAME || "percevia_session";

export function sessionDurationMs(): number {
  const days = Number(process.env.FIREBASE_SESSION_DAYS ?? 7);
  return Math.max(1, Math.min(days, 14)) * 24 * 60 * 60 * 1000;
}

export async function createFirebaseSessionCookie(idToken: string): Promise<string> {
  return firebaseAdminAuth().createSessionCookie(idToken, {
    expiresIn: sessionDurationMs(),
  });
}

export async function setSessionCookie(value: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(sessionDurationMs() / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function verifySessionCookie(): Promise<DecodedIdToken | null> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;
  return firebaseAdminAuth().verifySessionCookie(value, true);
}
