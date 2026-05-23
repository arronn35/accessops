/**
 * Manual scan smoke test:
 *   npx tsx scripts/scan-test.ts https://example.com
 *
 * Launches Playwright + axe-core against a public URL and dumps the
 * normalized issues to stdout. Useful for verifying the scanner module
 * outside of the queue / worker plumbing.
 *
 * Does NOT touch the database or queue.
 */
import "dotenv/config";
import { runScanJob } from "../src/lib/scanner";

const url = process.argv[2];
if (!url) {
  console.error("usage: tsx scripts/scan-test.ts <url>");
  process.exit(2);
}

(async () => {
  console.log(`[scan-test] scanning ${url}`);
  const started = Date.now();
  const outcome = await runScanJob(
    {
      jobId: "local-test",
      url,
      maxPages: 1,
      scanType: "single",
      includeScreenshots: false,
      storeScreenshots: false,
      timeoutMs: 60_000,
    },
    (u) => console.log(`[scan-test] progress`, u)
  );
  console.log(
    `[scan-test] done in ${Date.now() - started}ms — ${outcome.pagesScanned} page(s), ${outcome.pages.reduce(
      (n, p) => n + p.issues.length,
      0
    )} issue(s)`
  );
  for (const p of outcome.pages) {
    console.log(`\n--- ${p.url}  (status ${p.statusCode}) ---`);
    for (const i of p.issues) {
      console.log(`  [${i.severity}] ${i.ruleId} — ${i.help}`);
      console.log(`    Target: ${JSON.stringify(i.target)}`);
      if (i.htmlSnippet) console.log(`    HTML: ${i.htmlSnippet}`);
      if (i.failureSummary) console.log(`    Failure Summary: ${i.failureSummary.replace(/\n/g, ' ')}`);
      console.log();
    }
  }
})();
