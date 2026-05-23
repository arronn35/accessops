import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-md bg-paper px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-line shadow-[var(--shadow-soft)] placeholder:text-ink-500 disabled:opacity-60 disabled:bg-canvas-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(baseField, className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(baseField, "min-h-[88px] leading-relaxed", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          baseField,
          "appearance-none pr-9 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22><path d=%22M3 4.5L6 7.5L9 4.5%22 stroke=%22%234B5570%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-no-repeat bg-[right_12px_center]",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
);
Select.displayName = "Select";

export function Label({
  htmlFor,
  required,
  children,
  className,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-sm font-medium text-ink-700 mb-1.5", className)}
    >
      {children}
      {required && (
        <span className="text-rose-500 ml-0.5" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

export function FieldHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-1.5 text-xs text-ink-500", className)}>{children}</p>;
}

export function FieldError({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <p id={id} className={cn("mt-1.5 text-xs font-medium text-rose-700", className)}>
      {children}
    </p>
  );
}
