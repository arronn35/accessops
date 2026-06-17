import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function privateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
}

export function firebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const key = privateKey();

  if (!projectId || !clientEmail || !key) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey: key }),
  });
}

export function firebaseAdminAuth() {
  return getAuth(firebaseAdminApp());
}

let firestoreSettingsApplied = false;

export function firestore() {
  const db = getFirestore(firebaseAdminApp());
  // Tolerate `undefined` fields on writes instead of throwing
  // `Cannot use 'undefined' as a Firestore value`, which otherwise surfaces as
  // an opaque 500. `settings()` may only be called once, before first use, so
  // guard it and swallow the "already initialized" throw on later calls.
  if (!firestoreSettingsApplied) {
    firestoreSettingsApplied = true;
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Already initialized elsewhere — the setting is sticky, nothing to do.
    }
  }
  return db;
}

export function firebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}
