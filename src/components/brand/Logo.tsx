import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "wordmark" | "mark" | "lockup" | "wordmark-light";
  className?: string;
}

export function Logo({ variant = "wordmark", className }: LogoProps) {
  if (variant === "mark") {
    return (
      <Image
        src="/brand/accessops-logo.png"
        alt="accessops"
        width={460}
        height={460}
        priority
        className={cn("size-10 shrink-0 object-contain", className)}
      />
    );
  }

  if (variant === "lockup") {
    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <Logo variant="mark" className="size-12" />
        <div className="flex flex-col leading-none">
          <span className="text-[22px] font-semibold tracking-tight text-navy-900">
            accessops
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-purple-600">
            maitrico.
          </span>
        </div>
      </div>
    );
  }

  const textColor = variant === "wordmark-light" ? "text-paper" : "text-navy-900";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo variant="mark" className="size-10" />
      <span
        className={cn(
          "text-[19px] font-semibold tracking-tight",
          textColor
        )}
      >
        accessops
      </span>
    </div>
  );
}

export function ProductBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-600 ring-1 ring-purple-100",
        className
      )}
    >
      AccessOps AI
    </span>
  );
}
