/**
 * TEMPORARY Phase-2 acceptance: prove the Firestore security rules end-to-end
 * against the emulator (firestore + auth).
 *
 *   - active member of the workspace  -> CAN read the scan doc
 *   - non-member (different uid)       -> CANNOT read the scan doc
 *   - unauthenticated client           -> CANNOT read the scan doc
 *
 * Uses only installed deps (firebase + firebase-admin). Admin seeds data and
 * mints custom tokens (rules are bypassed by admin); the client SDK signs in
 * with those tokens and exercises the rules.
 */
import { initializeApp as adminInit, cert } from "firebase-admin/app";
import { getFirestore as adminFirestore } from "firebase-admin/firestore";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { initializeApp as clientInit, deleteApp } from "firebase/app";
import {
  getFirestore as clientFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  getAuth as clientAuth,
  connectAuthEmulator,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";

const PROJECT = "demo-accessops";
const WS = "ws-rules-test";
const SCAN = "scan-rules-test";
const MEMBER_UID = "member-uid";
const STRANGER_UID = "stranger-uid";

// A real signing key is required to mint custom tokens; the auth emulator does
// not verify the signature, so a throwaway key works.
const admin = adminInit(
  {
    projectId: PROJECT,
    credential: cert({
      projectId: PROJECT,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
  },
  "admin-rules"
);
const adb = adminFirestore(admin);
const aauth = adminAuth(admin);

async function tryClientRead(label: string, customToken: string | null): Promise<"allow" | "deny"> {
  const app = clientInit({ apiKey: "fake-key", projectId: PROJECT }, `client-${label}-${Date.now()}`);
  const db = clientFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const auth = clientAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  try {
    if (customToken) await signInWithCustomToken(auth, customToken);
    await getDoc(doc(db, "workspaces", WS, "scans", SCAN));
    return "allow";
  } catch (err) {
    const code = (err as { code?: string }).code ?? String(err);
    if (/permission-denied/i.test(code)) return "deny";
    throw err;
  } finally {
    await signOut(auth).catch(() => undefined);
    await deleteApp(app).catch(() => undefined);
  }
}

(async () => {
  // Seed: active member doc + scan doc (admin bypasses rules).
  await adb.doc(`workspaces/${WS}/members/${MEMBER_UID}`).set({
    userId: MEMBER_UID,
    status: "active",
    role: "owner",
    createdAt: new Date(),
  });
  await adb.doc(`workspaces/${WS}/scans/${SCAN}`).set({
    id: SCAN,
    workspaceId: WS,
    status: "running",
    pagesDone: 1,
    pagesTotal: 3,
    currentUrl: "https://example.com/about",
  });

  const memberToken = await aauth.createCustomToken(MEMBER_UID);
  const strangerToken = await aauth.createCustomToken(STRANGER_UID);

  const member = await tryClientRead("member", memberToken);
  const stranger = await tryClientRead("stranger", strangerToken);
  const anon = await tryClientRead("anon", null);

  console.log(JSON.stringify({ member, stranger, anon }, null, 2));
  const pass = member === "allow" && stranger === "deny" && anon === "deny";
  console.log(pass ? "RULES PASS ✅" : "RULES FAIL ❌");
  process.exit(pass ? 0 : 1);
})();
