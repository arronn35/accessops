import { test, expect } from "@playwright/test";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { E2E_USER } from "./fixtures";
import { validateAuthenticatedE2E } from "../../src/lib/testing/authenticated-e2e";

test("manual reviews retain revisions and disappear with the scan across batch boundaries", async ({ request }) => {
  const { projectId } = validateAuthenticatedE2E();
  const app = initializeApp({ projectId, credential: cert({ projectId, clientEmail: process.env.E2E_FIREBASE_CLIENT_EMAIL!, privateKey: process.env.E2E_FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n") }) }, "e2e-manual-review");
  try {
    const db = getFirestore(app);
    const user = await db.collection("users").doc(E2E_USER.uid).get();
    const workspaceId = user.data()?.currentWorkspaceId;
    expect(workspaceId).toBeTruthy();
    const workspace = db.collection("workspaces").doc(workspaceId);
    expect((await workspace.get()).data()?.ownerUserId).toBe(E2E_USER.uid);
    const scan = workspace.collection("scans").doc();
    await scan.set({ id: scan.id, workspaceId, requestedBy: E2E_USER.uid, baseUrl: "https://example.com/manual-lifecycle", status: "completed", createdAt: new Date(), completedAt: new Date() });
    const endpoint = `/api/scans/${scan.id}/manual-review`;
    for (const [index, status] of ["failed", "passed"].entries()) {
      const result = await request.put(endpoint, { data: { checkId: "keyboard", status, notes: `staging revision ${index + 1}` } });
      expect(result.ok()).toBe(true);
      expect((await result.json()).review.revision).toBe(index + 1);
    }
    for (let offset = 0; offset < 700; offset += 200) {
      const batch = db.batch();
      for (let i = offset; i < Math.min(offset + 200, 700); i++) batch.set(scan.collection("manualReviews").doc(`fixture-${i}`), { checkId: `fixture-${i}`, scanJobId: scan.id, revision: 1 });
      await batch.commit();
    }
    expect((await scan.collection("manualReviews").count().get()).data().count).toBe(701);
    const deleted = await request.delete(`/api/scans/${scan.id}`);
    expect(deleted.ok()).toBe(true);
    expect((await deleted.json()).deletedCounts.manualReviews).toBe(701);
    expect((await scan.get()).exists).toBe(false);
    expect((await scan.collection("manualReviews").count().get()).data().count).toBe(0);
    expect((await request.put(endpoint, { data: { checkId: "keyboard", status: "passed" } })).status()).toBe(404);
  } finally { await deleteApp(app); }
});
