import { readFile, writeFile } from "node:fs/promises";
import { validateAuthenticatedE2E, assertAuthenticatedEvidence } from "../src/lib/testing/authenticated-e2e";
async function main() {
  if (process.versions.node.split(".")[0] !== "22") throw new Error("Release evidence requires Node 22");
  const { projectId } = validateAuthenticatedE2E();
  if (!process.argv.includes("--verify-report")) { console.log(`Authenticated E2E configured for ${projectId}`); return; }
  const report = JSON.parse(await readFile("playwright-report/authenticated.json", "utf8"));
  const proof = JSON.parse(await readFile("test-results/auth-fixture.json", "utf8"));
  const result = assertAuthenticatedEvidence(report, proof, projectId);
  await writeFile("playwright-report/authenticated-evidence.json", JSON.stringify({ ...result, commit: process.env.GITHUB_SHA, node: process.version, completedAt: new Date().toISOString() }, null, 2));
  console.log(`Ran against staging Firebase ${projectId}: ${result.testsPassed} authenticated tests passed.`);
}
main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
