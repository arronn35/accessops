import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "wordmark" | "mark" | "lockup" | "wordmark-light";
  className?: string;
}

export function Logo({ variant = "wordmark", className }: LogoProps) {
  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 48 48"
        className={cn("size-8", className)}
        role="img"
        aria-label="maitrico"
      >
        <rect x="0" y="0" width="48" height="48" rx="12" fill="#0B1220" />
        <path
          d="M12 34V14h4l6 10 6-10h4v20h-4V21l-5 8h-2l-5-8v13h-4z"
          fill="#F7F8FB"
        />
        <circle cx="38" cy="14" r="4" fill="#7A6CF0" />
      </svg>
    );
  }

  if (variant === "lockup") {
    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <Logo variant="mark" className="size-9" />
        <div className="flex items-baseline gap-2.5">
          <span className="text-[22px] font-semibold tracking-tight text-navy-900">
            maitrico
          </span>
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-600 ring-1 ring-purple-100">
            AccessOps AI
          </span>
        </div>
      </div>
    );
  }

  const textColor = variant === "wordmark-light" ? "text-paper" : "text-navy-900";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo variant="mark" className="size-7" />
      <span
        className={cn(
          "text-[19px] font-semibold tracking-tight",
          textColor
        )}
      >
        maitrico
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
