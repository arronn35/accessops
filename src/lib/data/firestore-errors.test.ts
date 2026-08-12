import { describe, expect, it } from "vitest";
import {
  isFirestoreIndexError,
  isFirestoreQuotaError,
} from "./firestore-errors";

describe("Firestore error classification", () => {
  it("recognizes missing-index FAILED_PRECONDITION errors", () => {
    expect(
      isFirestoreIndexError({
        code: 9,
        message:
          "9 FAILED_PRECONDITION: The query requires a COLLECTION_ASC index for collection scans and field status. Create it at https://console.firebase.google.com/firestore/indexes?create_exemption=abc",
      })
    ).toBe(true);
  });

  it("does not label unrelated failed preconditions as index errors", () => {
    expect(
      isFirestoreIndexError({
        code: 9,
        message: "FAILED_PRECONDITION: transaction contention",
      })
    ).toBe(false);
  });

  it("keeps quota errors separate", () => {
    const error = { code: 8, message: "RESOURCE_EXHAUSTED: Quota exceeded" };
    expect(isFirestoreQuotaError(error)).toBe(true);
    expect(isFirestoreIndexError(error)).toBe(false);
  });
});
