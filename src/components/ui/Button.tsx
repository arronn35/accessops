"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Square, ruled, and heavy — buttons are blocks in the layout, never pills.
 * Elevation, where it exists, is an offset of solid colour.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-blue-600 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-navy-900 text-paper hover:bg-navy-800 active:bg-navy-700",
        secondary:
          "bg-paper text-ink-900 border border-rule hover:bg-canvas-2",
        ghost: "bg-transparent text-ink-700 hover:bg-canvas-2",
        accent:
          "bg-blue-600 text-paper hover:bg-blue-700",
        ai: "bg-purple-600 text-paper hover:bg-purple-700",
        danger:
          "bg-rose-600 text-paper hover:bg-rose-700",
        outline:
          "border border-rule bg-transparent text-ink-900 hover:bg-canvas-2",
        link: "text-blue-700 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm min-w-[36px]",
        md: "h-11 px-4 text-sm min-w-[44px]",
        lg: "h-12 px-5 text-base min-w-[48px]",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { buttonVariants };
