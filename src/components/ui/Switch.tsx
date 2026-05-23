"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId = id ?? `sw-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <label htmlFor={inputId} className={cn("flex items-start justify-between gap-4 cursor-pointer", className)}>
        {(label || description) && (
          <span className="flex-1">
            {label && <span className="block text-sm font-medium text-ink-900">{label}</span>}
            {description && <span className="block text-xs text-ink-600 mt-1 leading-snug">{description}</span>}
          </span>
        )}
        <span className="relative inline-flex items-center shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={inputId}
            className="peer sr-only"
            {...props}
          />
          <span
            aria-hidden
            className={cn(
              "block h-6 w-11 rounded-full bg-ink-300 transition-colors",
              "peer-checked:bg-blue-500",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2",
              "peer-disabled:opacity-50"
            )}
          />
          <span
            aria-hidden
            className="absolute top-0.5 left-0.5 size-5 rounded-full bg-paper shadow-[var(--shadow-soft)] transition-transform peer-checked:translate-x-5"
          />
        </span>
      </label>
    );
  }
);
Switch.displayName = "Switch";
