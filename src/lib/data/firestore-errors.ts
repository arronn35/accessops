export function isFirestoreQuotaError(err: unknown): boolean {
  const value = err as { code?: unknown; details?: unknown; message?: unknown } | null;
  return (
    value?.code === 8 ||
    String(value?.details ?? "").includes("Quota exceeded") ||
    String(value?.message ?? "").includes("RESOURCE_EXHAUSTED") ||
    String(value?.message ?? "").includes("Quota exceeded")
  );
}

/**
 * Firestore reports missing/disabled indexes as gRPC FAILED_PRECONDITION (9).
 * Match the index-specific wording too so unrelated failed preconditions do
 * not get mislabeled as an indexing incident.
 */
export function isFirestoreIndexError(err: unknown): boolean {
  const value = err as { code?: unknown; details?: unknown; message?: unknown } | null;
  const text = `${String(value?.details ?? "")} ${String(value?.message ?? "")}`;
  const failedPrecondition =
    value?.code === 9 ||
    value?.code === "9" ||
    String(value?.code ?? "").toLowerCase() === "failed-precondition" ||
    /failed_precondition/i.test(text);
  return (
    failedPrecondition &&
    (/query requires (?:a |an )?.*index/i.test(text) ||
      /requires an index/i.test(text) ||
      /firestore\/indexes\?create_/i.test(text))
  );
}
