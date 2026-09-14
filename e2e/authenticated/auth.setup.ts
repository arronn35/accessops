import { mkdir, writeFile } from "node:fs/promises";
import { validateAuthenticatedE2E } from "../../src/lib/testing/authenticated-e2e";
/**
 * Authenticated-lane setup: signs in a deterministic staging user without
 * any public test-login endpoint.
 *
 *   1. Firebase Admin (staging credentials) ensures the seed user exists
 *      and mints a custom token for it.
 *   2. The Identity Toolkit REST API exchanges the custom token for an
 *      ID token — exactly what the real sign-in form produces.
 *   3. POST /api/auth/session converts it into the app's session cookie,
 *      which is saved as Playwright storage state for the lane's specs.
 *
 * Requires E2E_FIREBASE_PROJECT_ID / E2E_FIREBASE_CLIENT_EMAIL /
 * E2E_FIREBASE_PRIVATE_KEY / NEXT_PUBLIC_FIREBASE_API_KEY. The Playwright
 * config only registers this project when those are present, so public
 * lanes keep running without staging secrets.
 */
import { test as setup, expect } from "@playwright/test";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { E2E_USER, STORAGE_STATE_PATH } from "./fixtures";

setup("create authenticated session", async ({ request, baseURL }) => {
  const { projectId } = validateAuthenticatedE2E();
  const clientEmail = process.env.E2E_FIREBASE_CLIENT_EMAIL!;
  const privateKey = process.env.E2E_FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;

  const app = initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }) },
    `e2e-setup-${Date.now()}`
  );
  try {
    const auth = getAuth(app);
    await auth
      .createUser({ uid: E2E_USER.uid, email: E2E_USER.email, displayName: E2E_USER.name })
      .catch((error: { code?: string }) => { if (error.code !== "auth/uid-already-exists" && error.code !== "auth/email-already-exists") throw new Error("Failed to initialize staging auth user"); });
    const customToken = await auth.createCustomToken(E2E_USER.uid);

    const exchange = await request.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      { data: { token: customToken, returnSecureToken: true } }
    );
    expect(exchange.ok(), "custom token exchange should succeed").toBe(true);
    const { idToken } = (await exchange.json()) as { idToken: string };

    const decoded = await auth.verifyIdToken(idToken);
    expect(decoded.aud).toBe(projectId);
    expect(decoded.uid).toBe(E2E_USER.uid);

    const session = await request.post(`${baseURL}/api/auth/session`, {
      data: { idToken, callbackUrl: "/app" },
    });
    expect(session.ok(), "session creation should succeed").toBe(true);

    await request.storageState({ path: STORAGE_STATE_PATH });
    await mkdir("test-results", { recursive: true });
    await writeFile("test-results/auth-fixture.json", JSON.stringify({ projectId, fixtureInitialized: true, initializedAt: new Date().toISOString() }));
  } finally {
    await deleteApp(app);
  }
});
