import path from "node:path";

/** Deterministic staging seed user for the authenticated lane. */
export const E2E_USER = {
  uid: "e2e-owner",
  email: "e2e-owner@accessops.test",
  name: "E2E Owner",
};

export const STORAGE_STATE_PATH = path.join(__dirname, ".auth", "owner.json");

/** All staging credentials the authenticated lane depends on. */
export function authLaneConfigured(): boolean {
  return Boolean(
    process.env.E2E_FIREBASE_PROJECT_ID &&
      process.env.E2E_FIREBASE_CLIENT_EMAIL &&
      process.env.E2E_FIREBASE_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  );
}
