"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dlg-title"
      aria-describedby={description ? "dlg-desc" : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={cn(
          "bg-paper rounded-t-xl sm:rounded-lg shadow-[var(--shadow-pop)] w-full max-h-[90vh] overflow-hidden flex flex-col",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl"
        )}
      >
        <header className="flex items-start justify-between gap-4 p-5 border-b border-line">
          <div>
            <h2 id="dlg-title" className="text-base font-semibold text-ink-900">
              {title}
            </h2>
            {description && (
              <p id="dlg-desc" className="text-sm text-ink-600 mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="size-9 inline-flex items-center justify-center rounded-md text-ink-600 hover:bg-canvas-2"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && (
          <footer className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-5 border-t border-line bg-canvas/50">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
