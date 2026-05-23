import { cn } from "@/lib/utils";

export function WcagBadge({
  criterion,
  level = "AA",
  version = "2.2",
  className,
}: {
  criterion: string; // e.g. "1.4.3 Contrast (Minimum)"
  level?: "A" | "AA" | "AAA";
  version?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-canvas-2 ring-1 ring-line px-2 py-0.5 text-[11px] font-medium text-ink-700",
        className
      )}
    >
      <span className="font-mono text-ink-500">WCAG {version}</span>
      <span className="px-1 rounded bg-navy-900 text-paper text-[10px] font-semibold tracking-wider">
        {level}
      </span>
      <span className="text-ink-700">{criterion}</span>
    </span>
  );
}
