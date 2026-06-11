export interface CleanupCliArgs {
  email: string;
  host: string;
  dryRun: boolean;
  confirmScanId: string | null;
  timeoutMs: number;
}

export function parseCleanupArgs(argv: string[]): CleanupCliArgs {
  const args = new Map<string, string | boolean>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, true);
    } else {
      args.set(key, next);
      i += 1;
    }
  }

  const email = String(args.get("email") ?? "").trim().toLowerCase();
  const host = String(args.get("host") ?? "").trim().toLowerCase();
  const confirm = args.get("confirm");
  const dryRun = Boolean(args.get("dry-run")) || !confirm;
  const timeoutMs = Number(args.get("timeout-ms") ?? 30_000);

  if (!email) throw new Error("Missing --email");
  if (!host) throw new Error("Missing --host");
  if (!dryRun && typeof confirm !== "string") throw new Error("Use --confirm <scanId>");

  return {
    email,
    host,
    dryRun,
    confirmScanId: typeof confirm === "string" ? confirm : null,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30_000,
  };
}

export function scanHostMatches(rawUrl: string, expectedHost: string): boolean {
  try {
    const actual = new URL(rawUrl).hostname.toLowerCase();
    return actual === expectedHost || actual.endsWith(`.${expectedHost}`);
  } catch {
    return rawUrl.toLowerCase().includes(expectedHost);
  }
}

export function cleanupDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function cleanupMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function clampUsageDecrement(value: unknown, amount: number): number {
  return Math.max(0, Number(value ?? 0) - Math.max(0, amount));
}
