import { deleteOrphanManualReview, MANUAL_REVIEW_PATH } from "../src/lib/data/orphan-reviews";
/** Dry run by default. Apply only paths from a reviewed report, rechecking each parent. */
import { readFile, writeFile } from "node:fs/promises";
import { FieldPath, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { firestore } from "../src/lib/firebase/admin";

const reportPath = process.argv.find((arg) => arg.startsWith("--report="))?.slice(9);
if (!reportPath) throw new Error("Provide --report=<path>; default operation only writes an audit report.");
const db = firestore();
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required");
const validPath = MANUAL_REVIEW_PATH;

async function main() {
  if (process.argv.includes("--apply")) {
    const report = JSON.parse(await readFile(reportPath!, "utf8")) as { projectId: string; paths: string[] };
    if (report.projectId !== projectId || !Array.isArray(report.paths) || report.paths.some((p) => !validPath.test(p))) {
      throw new Error("Invalid audit report or Firebase project mismatch");
    }
    let deleted = 0;
    let retained = 0;
    const failedPaths: string[] = [];
    for (const path of report.paths) {
      try {
        const removed = await deleteOrphanManualReview(db, path);
        if (removed) deleted++; else retained++;
      } catch { failedPaths.push(path); }
    }
    await writeFile(`${reportPath}.result.json`, JSON.stringify({ projectId, deleted, retained, failedPaths }, null, 2), { mode: 0o600 });
    if (failedPaths.length) process.exitCode = 1;
    console.log(JSON.stringify({ projectId, deleted, retained, failed: failedPaths.length }));
    return;
  }
  const paths: string[] = [];
  let examined = 0;
  let cursor: QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collectionGroup("manualReviews").orderBy(FieldPath.documentId()).limit(200);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;
    for (const doc of page.docs) {
      examined++;
      if (validPath.test(doc.ref.path) && !(await doc.ref.parent.parent!.get()).exists) paths.push(doc.ref.path);
    }
    cursor = page.docs.at(-1);
  }
  await writeFile(reportPath!, JSON.stringify({ projectId, generatedAt: new Date().toISOString(), examined, paths }, null, 2), { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ projectId, examined, orphans: paths.length, mode: "report-only" }));
}
main().catch(() => { console.error("Orphan audit failed; no credentials are logged. Check configuration and permissions."); process.exitCode = 1; });
