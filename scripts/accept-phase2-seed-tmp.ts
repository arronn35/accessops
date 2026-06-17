/** TEMPORARY Phase-2 acceptance: seed an active member + a multi-page scan. */
import { firestore } from "../src/lib/firebase/admin";
import { createScanJob } from "../src/lib/data/firestore";

const ws = "ws-rt";
const uid = "rt-member";
const scanId = process.argv[3] ?? "scan-rt";
const baseUrl = process.argv[2] ?? "https://www.iana.org";

(async () => {
  await firestore()
    .doc(`workspaces/${ws}/members/${uid}`)
    .set({ userId: uid, status: "active", role: "owner", createdAt: new Date() });
  await createScanJob({
    id: scanId,
    workspaceId: ws,
    requestedBy: uid,
    baseUrl,
    scanType: "multi",
    maxPages: 3,
    permissionConfirmed: true,
  });
  console.log(JSON.stringify({ ws, uid, scanId, baseUrl }));
})();
