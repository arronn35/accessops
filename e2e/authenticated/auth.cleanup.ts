import { test as teardown } from "@playwright/test";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFile, writeFile } from "node:fs/promises";
import { E2E_USER } from "./fixtures";
import { validateAuthenticatedE2E } from "../../src/lib/testing/authenticated-e2e";

teardown("remove only this run's owned staging fixtures", async () => {
  const { projectId } = validateAuthenticatedE2E();
  const app = initializeApp({ projectId, credential: cert({ projectId, clientEmail: process.env.E2E_FIREBASE_CLIENT_EMAIL!, privateKey: process.env.E2E_FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n") }) }, "e2e-cleanup");
  try {
    const db = getFirestore(app);
    const userRef = db.collection("users").doc(E2E_USER.uid);
    const user = await userRef.get();
    const workspaceId = user.data()?.currentWorkspaceId;
    if (workspaceId) {
      const workspace = db.collection("workspaces").doc(workspaceId);
      const owner = (await workspace.get()).data()?.ownerUserId;
      if (owner !== E2E_USER.uid) throw new Error("Refusing to clean a workspace this fixture does not own");
      await db.recursiveDelete(workspace);
      // Auxiliary top-level collections are scoped to this exact workspace.
      for (const collection of ["visualEvidence", "publicReportShares", "dataDeletionJobs", "auditLogs", "analyticsEvents"]) {
        for (;;) {
          const page = await db.collection(collection).where("workspaceId", "==", workspaceId).limit(200).get();
          if (page.empty) break;
          const batch = db.batch();
          page.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        }
      }
    }
    await userRef.delete();
    await getAuth(app).deleteUser(E2E_USER.uid).catch((error: { code?: string }) => { if (error.code !== "auth/user-not-found") throw new Error("Staging auth fixture cleanup failed"); });
    const proof = JSON.parse(await readFile("test-results/auth-fixture.json", "utf8"));
    await writeFile("test-results/auth-fixture.json", JSON.stringify({ ...proof, cleanupCompleted: true }));
  } finally { await deleteApp(app); }
});
