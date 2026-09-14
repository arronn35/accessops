import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import app from "../package.json";
import playwright from "playwright/package.json";
import axe from "axe-core/package.json";
import { SCANNER_VERSION } from "../src/lib/scanner/comparison-profile";
import { FINGERPRINT_VERSION } from "../src/lib/scanner/grouping";
import { SCORING_VERSION } from "../src/lib/scanner/scoring";

if (process.argv.includes("--if-missing") && existsSync("src/generated/build-manifest.json")) process.exit(0);

function git(args: string[]): string | null {
  try { return execFileSync("git", args, { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}
const environment = process.env.RELEASE_ENVIRONMENT ?? process.env.VERCEL_ENV ?? "development";
const commit = process.env.BUILD_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? git(["rev-parse", "HEAD"]);
const status = git(["status", "--porcelain", "--untracked-files=normal"]);
const trustedImmutableSource = Boolean(
  process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.RELEASE_SOURCE_CLEAN === "true"
);
const dirty = status === null ? (trustedImmutableSource ? false : null) : status.length > 0;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID ?? process.env.E2E_FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null;
const release = environment === "staging" || environment === "production";
if (release && (!commit || !/^[a-f0-9]{40}$/.test(commit) || dirty !== false || !firebaseProjectId || process.versions.node.split(".")[0] !== "22")) {
  throw new Error("Release manifest requires a clean committed source, Firebase project and Node 22");
}
if (release && process.env.ALLOW_DIRECT_PLAN_SELECT === "true") throw new Error("Direct plan selection cannot be enabled for release builds");
const manifest = {
  schemaVersion: 1, commit, dirty, builtAt: new Date().toISOString(), environment,
  nodeVersion: process.version, appVersion: app.version, scannerVersion: SCANNER_VERSION,
  playwrightVersion: playwright.version, axeVersion: axe.version,
  fingerprintVersion: FINGERPRINT_VERSION, scoringVersion: SCORING_VERSION, firebaseProjectId,
};
mkdirSync("src/generated", { recursive: true });
writeFileSync("src/generated/build-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Build manifest: ${environment}, commit ${commit ?? "unknown"}, dirty=${dirty}`);
