import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
  {
    variants: {
      tone: {
        neutral: "bg-canvas-2 text-ink-700 ring-line",
        info: "bg-blue-50 text-blue-700 ring-blue-100",
        success: "bg-green-50 text-green-700 ring-green-50",
        warning: "bg-amber-50 text-amber-700 ring-amber-50",
        danger: "bg-rose-50 text-rose-700 ring-rose-50",
        ai: "bg-purple-50 text-purple-600 ring-purple-100",
        navy: "bg-navy-900 text-paper ring-navy-900",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
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
