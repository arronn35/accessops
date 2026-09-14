import type { Firestore } from "firebase-admin/firestore";
export const MANUAL_REVIEW_PATH = /^workspaces\/[^/]+\/scans\/[^/]+\/manualReviews\/[^/]+$/;
/** Revalidate under a transaction so an old audit cannot delete an active review. */
export async function deleteOrphanManualReview(db: Firestore, path: string): Promise<boolean> {
  if (!MANUAL_REVIEW_PATH.test(path)) throw new Error("Invalid manual review path");
  return db.runTransaction(async (tx) => {
    const ref = db.doc(path);
    const scan = await tx.get(ref.parent.parent!);
    const review = await tx.get(ref);
    if (scan.exists || !review.exists) return false;
    tx.delete(ref);
    return true;
  });
}
