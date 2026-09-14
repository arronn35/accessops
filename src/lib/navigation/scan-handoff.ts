const MAX_URL_LENGTH = 2_048;

export function safePublicScanUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Path to workspace setup, carrying whatever the visitor has told us so far.
 *
 * The persona is chosen before sign-in, so it can only reach the workspace by
 * travelling in the URL through the auth redirect. Unknown persona ids are
 * dropped by personaById at the other end, so nothing arbitrary is stored.
 */
export function scanSetupPath(url: string | null, persona?: string | null): string {
  const params = new URLSearchParams();
  if (url) params.set("url", url);
  if (persona) params.set("persona", persona);
  const query = params.toString();
  return query ? `/workspace/setup?${query}` : "/workspace/setup";
}

export function newScanPath(url: string | null): string {
  return url ? `/app/scans/new?url=${encodeURIComponent(url)}` : "/app";
}
