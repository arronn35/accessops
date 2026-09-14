import path from "node:path";

const runId = `${process.env.GITHUB_RUN_ID ?? process.env.E2E_RUN_ID ?? "local"}-${process.env.GITHUB_RUN_ATTEMPT ?? "1"}`;

/** Deterministic staging seed user for the authenticated lane. */
export const E2E_USER = {
  uid: `e2e-owner-${runId}`,
  email: `e2e-owner-${runId}@percevia.test`,
  name: "E2E Owner",
};

export const STORAGE_STATE_PATH = path.join(__dirname, ".auth", "owner.json");

export { authLaneConfigured } from "../../src/lib/testing/authenticated-e2e";
