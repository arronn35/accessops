import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Badges are mono tags, not pills — same voice as the section markers. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em]",
  {
    variants: {
      tone: {
        neutral: "bg-canvas-2 text-ink-700 border-line",
        info: "bg-blue-50 text-blue-700 border-blue-100",
        success: "bg-green-50 text-green-700 border-green-500/40",
        warning: "bg-amber-50 text-amber-700 border-amber-500/40",
        danger: "bg-rose-50 text-rose-700 border-rose-500/40",
        ai: "bg-purple-50 text-purple-600 border-purple-100",
        navy: "bg-navy-900 text-paper border-navy-900",
      },
      size: {
        sm: "text-[10px] px-1.5 py-0.5",
        md: "text-[11px] px-2 py-0.5",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
