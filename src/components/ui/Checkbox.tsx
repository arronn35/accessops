"use client";

import { Check } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId = id ?? `cb-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <label htmlFor={inputId} className={cn("flex items-start gap-3 cursor-pointer group", className)}>
        <span className="relative inline-flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="peer absolute inset-0 size-5 opacity-0 cursor-pointer"
            {...props}
          />
          <span
            aria-hidden
            className={cn(
              "size-5 rounded-sm ring-1 ring-line-strong bg-paper transition-colors",
              "peer-checked:bg-navy-900 peer-checked:ring-navy-900",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2"
            )}
          />
          <Check
            aria-hidden
            className="absolute size-3.5 text-paper opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
            strokeWidth={3}
          />
        </span>
        {(label || description) && (
          <span className="flex-1 -mt-0.5">
            {label && <span className="block text-sm text-ink-900 leading-snug">{label}</span>}
            {description && <span className="block text-xs text-ink-600 mt-1 leading-snug">{description}</span>}
          </span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
