import { UserCheck } from "lucide-react";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { cn } from "@/lib/utils";

export function HumanReviewBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md bg-amber-50 ring-1 ring-amber-50 p-3 text-xs text-amber-700 leading-relaxed",
        className
      )}
    >
      <UserCheck className="size-4 shrink-0 text-amber-500 mt-0.5" aria-hidden />
      <p>{COMPLIANCE_COPY.HUMAN_REVIEW}</p>
    </div>
  );
}
