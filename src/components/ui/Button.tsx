"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-navy-900 text-paper hover:bg-navy-800 active:bg-navy-700",
        secondary:
          "bg-paper text-ink-900 ring-1 ring-line hover:bg-canvas-2 hover:ring-line-strong",
        ghost: "bg-transparent text-ink-700 hover:bg-canvas-2",
        accent:
          "bg-blue-500 text-paper hover:bg-blue-600 active:bg-blue-700",
        ai: "bg-purple-500 text-paper hover:bg-purple-600",
        danger:
          "bg-rose-500 text-paper hover:bg-rose-700",
        outline:
          "border border-line bg-transparent text-ink-700 hover:bg-canvas-2",
        link: "text-blue-600 underline-offset-4 hover:underline",
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
