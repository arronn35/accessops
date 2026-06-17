/**
 * TEMPORARY Phase-2 acceptance: subscribe to a scan doc exactly as the
 * progress page does — onSnapshot, as an authenticated workspace member,
 * through the security rules — and log every emission so we can see the
 * progress tick in realtime (no HTTP polling involved).
 *
 * Usage: tsx scripts/accept-onsnapshot-tmp.ts <workspaceId> <scanId> <memberUid>
 */
import { initializeApp as adminInit, cert } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { initializeApp as clientInit } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  onSnapshot,
} from "firebase/firestore";
import {
  getAuth,
  connectAuthEmulator,
  signInWithCustomToken,
} from "firebase/auth";
import { viewFromScanDoc, isHeartbeatStale } from "../src/lib/scanner/progress";

const [ws, scanId, uid] = process.argv.slice(2);
const PROJECT = "demo-accessops";

(async () => {
  const admin = adminInit(
    {
      projectId: PROJECT,
      credential: cert({
        projectId: PROJECT,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
    },
    "admin-snap"
  );
  const token = await adminAuth(admin).createCustomToken(uid);

  const app = clientInit({ apiKey: "fake-key", projectId: PROJECT }, "client-snap");
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  await signInWithCustomToken(auth, token);

  // Demo threshold so the stale-banner check flips without a 45s real wait;
  // production default is HEARTBEAT_STALE_MS (45s), covered by progress.test.ts.
  const staleMs = Number(process.env.STALE_MS ?? 45_000);
  console.log(`[snap] subscribed as member ${uid} to ${ws}/${scanId} (staleMs=${staleMs})`);
  let emissions = 0;
  let lastView: ReturnType<typeof viewFromScanDoc> | null = null;
  let lastBannerShown = false;

  const unsub = onSnapshot(
    doc(db, "workspaces", ws, "scans", scanId),
    (snap) => {
      if (!snap.exists()) return;
      emissions += 1;
      const v = viewFromScanDoc(snap.id, snap.data() as Record<string, unknown>);
      lastView = v;
      console.log(
        JSON.stringify({
          t: new Date().toISOString().slice(11, 23),
          ev: "snapshot",
          status: v.status,
          step: v.currentStep,
          done: v.pagesDone,
          total: v.pagesTotal,
          state: v.currentState,
          url: v.currentUrl,
          stale: isHeartbeatStale(v, Date.now(), staleMs),
        })
      );
      if (v.status === "completed" || v.status === "failed") {
        console.log(`[snap] terminal=${v.status} after ${emissions} emissions`);
        unsub();
        process.exit(0);
      }
    },
    (err) => {
      console.error(`[snap] listener error:`, (err as Error).message);
      process.exit(1);
    }
  );

  // Mirrors the UI's local clock tick: surfaces the recovery banner state even
  // when no new snapshot arrives (i.e. the worker died and stopped writing).
  setInterval(() => {
    if (!lastView) return;
    const stale = isHeartbeatStale(lastView, Date.now(), staleMs);
    if (stale !== lastBannerShown) {
      lastBannerShown = stale;
      console.log(
        JSON.stringify({
          t: new Date().toISOString().slice(11, 23),
          ev: "banner",
          recoveryBanner: stale,
          status: lastView.status,
        })
      );
    }
  }, 3_000);

  setTimeout(() => {
    console.log(`[snap] timeout after ${emissions} emissions`);
    process.exit(2);
  }, 180_000);
})();
