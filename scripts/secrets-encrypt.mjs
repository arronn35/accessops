#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, process.env.PERCEVIA_ENV_FILE || ".env.local");
const encryptedRelative = process.env.PERCEVIA_SECRETS_FILE || "secrets/percevia.env.enc";
const encrypted = resolve(root, encryptedRelative);
const keyFile = process.env.SOPS_AGE_KEY_FILE || `${process.env.HOME}/.config/sops/age/percevia-keys.txt`;

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

if (!existsSync(source)) {
  fail(`Missing plaintext env file: ${source}`);
}

const plain = readFileSync(source, "utf8");
const keyCount = countEnvKeys(plain);
if (keyCount === 0) {
  fail(`No dotenv keys found in ${source}`);
}

mkdirSync(resolve(root, "secrets"), { recursive: true });
const scratchDir = mkdtempSync(join(tmpdir(), "percevia-secrets-"));
const scratchFile = join(scratchDir, "percevia.env");

try {
  writeFileSync(scratchFile, plain, { mode: 0o600 });

  const result = spawnSync(
    "sops",
    [
      "--encrypt",
      "--filename-override",
      encryptedRelative,
      "--input-type",
      "dotenv",
      "--output-type",
      "dotenv",
      "--output",
      encryptedRelative,
      scratchFile,
    ],
    {
      cwd: root,
      env: { ...process.env, SOPS_AGE_KEY_FILE: keyFile },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.status !== 0) {
    fail(`sops encryption failed with exit code ${result.status ?? "unknown"}.`);
  }

  chmodSync(encrypted, 0o600);
  console.log(`Encrypted ${keyCount} env keys to ${encryptedRelative}`);
} finally {
  rmSync(scratchDir, { recursive: true, force: true });
}
