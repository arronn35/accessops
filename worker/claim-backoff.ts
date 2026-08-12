export function claimMissBackoffMs(
  consecutiveMisses: number,
  baseMs = 25,
  maxMs = 250
): number {
  const misses = Math.max(0, Math.floor(consecutiveMisses));
  if (misses === 0) return 0;
  const base = Math.max(1, Math.floor(baseMs));
  const maximum = Math.max(base, Math.floor(maxMs));
  const exponent = Math.min(20, misses - 1);
  return Math.min(maximum, base * 2 ** exponent);
}
