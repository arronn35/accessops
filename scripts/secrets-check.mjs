#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const encryptedRelative = process.env.ACCESSOPS_SECRETS_FILE || "secrets/accessops.env.enc";
const encrypted = resolve(root, encryptedRelative);
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
  ["--decrypt", "--input-type", "dotenv", "--output-type", "dotenv", encryptedRelative],
  {
    cwd: root,
    env: { ...process.env, SOPS_AGE_KEY_FILE: keyFile },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (result.status !== 0) {
  fail(`sops check failed with exit code ${result.status ?? "unknown"}.`);
}

console.log(`Encrypted secrets are readable (${countEnvKeys(result.stdout)} env keys).`);
