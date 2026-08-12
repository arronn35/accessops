import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function privateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
}

function projectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT
  );
}

function explicitServiceAccountConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

/**
 * Cloud Run supplies short-lived Application Default Credentials through the
 * metadata server. Prefer those credentials there so the worker never needs a
 * long-lived Firebase private key in its container configuration.
 */
function applicationDefaultConfigured(): boolean {
  return Boolean(
    projectId() &&
      (process.env.K_SERVICE ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT)
  );
}

export function firebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const firebaseProjectId = projectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const key = privateKey();

  if (firebaseProjectId && clientEmail && key) {
    return initializeApp({
      credential: cert({
        projectId: firebaseProjectId,
        clientEmail,
        privateKey: key,
      }),
      projectId: firebaseProjectId,
    });
  }

  if (applicationDefaultConfigured()) {
    return initializeApp({
      credential: applicationDefault(),
      projectId: firebaseProjectId,
    });
  }

  throw new Error(
    "Firebase Admin is not configured. Set the Firebase service-account variables, or run with Google Application Default Credentials."
  );
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
  return explicitServiceAccountConfigured() || applicationDefaultConfigured();
}
