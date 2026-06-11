#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const encryptedRelative = process.env.ACCESSOPS_SECRETS_FILE || "secrets/accessops.env.enc";
const encrypted = resolve(root, encryptedRelative);
const targetRelative = process.env.ACCESSOPS_ENV_FILE || ".env.local";
const target = resolve(root, targetRelative);
const keyFile = process.env.SOPS_AGE_KEY_FILE || `${process.env.HOME}/.config/sops/age/accessops-keys.txt`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function countEnvKeys(contents) {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("=")).length;
}

if (!existsSync(encrypted)) {
  fail(`Missing encrypted secrets file: ${encrypted}`);
}

if (!existsSync(keyFile)) {
  fail(`Missing age private key: ${keyFile}`);
}

const result = spawnSync(
  "sops",
  ["--decrypt", "--input-type", "dotenv", "--output-type", "dotenv", "--output", targetRelative, encryptedRelative],
  {
    cwd: root,
    env: { ...process.env, SOPS_AGE_KEY_FILE: keyFile },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (result.status !== 0) {
  fail(`sops decryption failed with exit code ${result.status ?? "unknown"}.`);
}

chmodSync(target, 0o600);
const keyCount = countEnvKeys(readFileSync(target, "utf8"));
console.log(`Decrypted ${keyCount} env keys to ${targetRelative}`);
