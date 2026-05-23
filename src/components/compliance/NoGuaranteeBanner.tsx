import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";

export function NoGuaranteeBanner({
  variant = "default",
  className,
}: {
  variant?: "default" | "compact";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-md bg-canvas-2 ring-1 ring-line p-3 text-xs text-ink-700 leading-relaxed",
          className
        )}
      >
        <ShieldCheck className="size-4 shrink-0 text-navy-700 mt-0.5" aria-hidden />
        <p>
          {COMPLIANCE_COPY.NO_GUARANTEE_SHORT}{" "}
          <Link href="/app/compliance" className="font-medium text-blue-600 underline-offset-2 hover:underline">
            Learn more
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg ring-1 ring-line bg-canvas-2 p-4 flex gap-3 items-start",
        className
      )}
    >
      <span className="size-9 rounded-md bg-navy-900 text-paper inline-flex items-center justify-center shrink-0">
        <ShieldCheck className="size-4" aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-ink-900">No compliance guarantee</h3>
        <p className="text-xs text-ink-600 mt-1 leading-relaxed">
          {COMPLIANCE_COPY.NO_GUARANTEE_FULL}
        </p>
        <Link
          href="/app/compliance"
          className="inline-flex items-center mt-2 text-xs font-medium text-blue-600 hover:underline"
        >
          Open Privacy &amp; Compliance Center →
        </Link>
      </div>
    </div>
  );
}
