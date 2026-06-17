// Adds hosts to a Firebase project's Authentication "Authorized domains"
// allowlist (fixes auth/unauthorized-continue-uri) using the *Firebase CLI's
// existing login* — no service-account secret is read.
//
// The user's OAuth access token is obtained in-memory from the refresh token
// the `firebase` CLI already stored, and is never printed or persisted.
//
// Usage: node scripts/firebase-add-authorized-domains.mjs <projectId> [--apply] host1 host2 ...
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Public desktop-app OAuth client baked into open-source firebase-tools.
const CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const positional = args.filter((a) => !a.startsWith("--"));
const projectId = positional[0];
const hosts = positional.slice(1);
if (!projectId || hosts.length === 0) {
  console.error("Usage: node scripts/firebase-add-authorized-domains.mjs <projectId> [--apply] host...");
  process.exit(1);
}

const cfgPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
if (!fs.existsSync(cfgPath)) {
  console.error(`No firebase CLI config at ${cfgPath} — run \`firebase login\` first.`);
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const refreshToken = cfg?.tokens?.refresh_token;
if (!refreshToken) {
  console.error("No firebase CLI refresh token found — run `firebase login` first.");
  process.exit(1);
}

const tokRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }),
});
if (!tokRes.ok) {
  console.error(`Token refresh failed: ${tokRes.status} ${await tokRes.text()}`);
  process.exit(1);
}
const accessToken = (await tokRes.json()).access_token;

const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
const auth = { Authorization: `Bearer ${accessToken}` };

const getRes = await fetch(base, { headers: auth });
if (!getRes.ok) {
  console.error(`GET config failed: ${getRes.status} ${await getRes.text()}`);
  process.exit(1);
}
const config = await getRes.json();
const current = config.authorizedDomains || [];
console.log("Current authorized domains:");
for (const d of current) console.log("  -", d);

const toAdd = hosts.filter((h) => !current.includes(h));
if (toAdd.length === 0) {
  console.log("\nAll requested hosts are already authorized — nothing to do.");
  process.exit(0);
}
console.log("\nWill add:");
for (const d of toAdd) console.log("  +", d);
if (!apply) {
  console.log("\n(dry run — pass --apply to write)");
  process.exit(0);
}

const merged = [...current, ...toAdd];
const patchRes = await fetch(`${base}?updateMask=authorizedDomains`, {
  method: "PATCH",
  headers: { ...auth, "content-type": "application/json" },
  body: JSON.stringify({ authorizedDomains: merged }),
});
if (!patchRes.ok) {
  console.error(`PATCH config failed: ${patchRes.status} ${await patchRes.text()}`);
  process.exit(1);
}
const updated = await patchRes.json();
console.log("\n✓ Updated. Authorized domains are now:");
for (const d of updated.authorizedDomains || []) console.log("  -", d);
