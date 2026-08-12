import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface FieldOverrideIndex {
  order?: string;
  queryScope?: string;
}

interface FirestoreIndexConfig {
  fieldOverrides?: Array<{
    collectionGroup?: string;
    fieldPath?: string;
    indexes?: FieldOverrideIndex[];
  }>;
}

describe("Firestore index configuration", () => {
  it("keeps scans.status indexed for collection and collection-group queries", () => {
    const config = JSON.parse(
      readFileSync(
        new URL("../firestore.indexes.json", import.meta.url),
        "utf8"
      )
    ) as FirestoreIndexConfig;
    const override = config.fieldOverrides?.find(
      (item) =>
        item.collectionGroup === "scans" && item.fieldPath === "status"
    );

    expect(override).toBeDefined();
    expect(override?.indexes).toEqual(
      expect.arrayContaining([
        { order: "ASCENDING", queryScope: "COLLECTION" },
        { order: "DESCENDING", queryScope: "COLLECTION" },
        { order: "ASCENDING", queryScope: "COLLECTION_GROUP" },
        { order: "DESCENDING", queryScope: "COLLECTION_GROUP" },
      ])
    );
  });
});
