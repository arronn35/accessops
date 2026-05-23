import { Sparkles, AlertTriangle } from "lucide-react";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { cn } from "@/lib/utils";

export function AiSuggestionBlock({
  title = "AI explanation",
  children,
  className,
  tone = "default",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "subtle";
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "rounded-lg overflow-hidden ring-1",
        tone === "subtle"
          ? "ring-line bg-paper"
          : "ring-purple-100 bg-gradient-to-b from-purple-50/70 to-paper",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-purple-100 bg-purple-50/60">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-purple-600" aria-hidden />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-600">
            {title}
          </h4>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-purple-600/80">
          AI · review required
        </span>
      </header>
      <div className="p-4 text-sm text-ink-700 leading-relaxed">{children}</div>
      <footer className="flex items-start gap-2 px-4 py-2.5 border-t border-purple-100 bg-purple-50/40 text-[11px] text-purple-700 leading-snug">
        <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-purple-600" aria-hidden />
        <span>{COMPLIANCE_COPY.AI_REVIEW_REQUIRED}</span>
      </footer>
    </section>
  );
}
