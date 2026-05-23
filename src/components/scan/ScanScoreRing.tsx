import { cn } from "@/lib/utils";

export function ScanScoreRing({
  score,
  label = "Accessibility risk score",
  size = "md",
  className,
}: {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "lg" ? 132 : size === "md" ? 96 : 72;
  const stroke = size === "lg" ? 10 : 8;
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;

  const ringColor =
    score >= 85 ? "var(--color-green-500)" : score >= 65 ? "var(--color-amber-500)" : "var(--color-rose-500)";

  const valueClass = size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-lg";

  return (
    <div
      role="img"
      aria-label={`${label}: ${score} out of 100`}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: dim, height: dim }}
    >
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} aria-hidden>
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke="var(--color-canvas-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-semibold text-ink-900 leading-none", valueClass)}>{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-500 mt-1">/ 100</span>
      </div>
    </div>
  );
}
