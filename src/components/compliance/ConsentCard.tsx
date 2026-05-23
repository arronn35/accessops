"use client";

import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export function ConsentCard({
  title,
  description,
  status,
  defaultChecked,
  children,
  className,
}: {
  title: string;
  description?: string;
  status?: { label: string; tone: "neutral" | "info" | "success" | "warning" };
  defaultChecked?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-paper ring-1 ring-line p-5 shadow-[var(--shadow-soft)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
            {status && (
              <Badge tone={status.tone} size="sm">
                {status.label}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-sm text-ink-600 mt-2 leading-relaxed">{description}</p>
          )}
          {children && <div className="mt-3 text-sm">{children}</div>}
        </div>
        {defaultChecked !== undefined && (
          <Switch defaultChecked={defaultChecked} aria-label={title} />
        )}
      </div>
    </div>
  );
}
