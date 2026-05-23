import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  tone?: "neutral" | "success" | "ai";
}) {
  const toneClasses = {
    neutral: "bg-canvas-2 text-ink-700",
    success: "bg-green-50 text-green-700",
    ai: "bg-purple-50 text-purple-600",
  } as const;
  return (
    <div
      className={cn(
        "rounded-lg ring-1 ring-line bg-paper p-8 lg:p-12 text-center flex flex-col items-center",
        className
      )}
    >
      <span
        className={cn(
          "size-12 rounded-md inline-flex items-center justify-center mb-4",
          toneClasses[tone]
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description && (
        <p className="text-sm text-ink-600 mt-2 max-w-md leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
