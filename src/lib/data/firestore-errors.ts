export function isFirestoreQuotaError(err: unknown): boolean {
  const value = err as { code?: unknown; details?: unknown; message?: unknown } | null;
  return (
    value?.code === 8 ||
    String(value?.details ?? "").includes("Quota exceeded") ||
    String(value?.message ?? "").includes("RESOURCE_EXHAUSTED") ||
    String(value?.message ?? "").includes("Quota exceeded")
  );
}
