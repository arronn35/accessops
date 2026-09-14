import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "wordmark" | "mark" | "lockup" | "wordmark-light" | "site";
  className?: string;
  /**
   * Render the image with an empty alt.
   *
   * The composite variants below place the mark next to the wordmark text, so
   * a described image repeats the name that is already there — a screen reader
   * announces "Percevia AI Percevia AI". Standalone marks keep their alt.
   */
  decorative?: boolean;
}

export function Logo({ variant = "wordmark", className, decorative }: LogoProps) {
  // The public-site lockup: square mark offset in accent, heavy wordmark.
  if (variant === "site") {
    return (
      <span className={cn("inline-flex items-center gap-3", className)}>
        <Logo
          variant="mark"
          decorative
          className="size-8 shadow-[5px_5px_0_var(--color-accent)]"
        />
        <span className="hidden whitespace-nowrap text-[17px] font-extrabold tracking-[-0.03em] text-navy-900 min-[360px]:inline sm:text-[19px]">
          Percevia AI
        </span>
      </span>
    );
  }

  if (variant === "mark") {
    return (
      <Image
        src="/brand/percevia-logo.png"
        alt={decorative ? "" : "Percevia AI"}
        // Decorative marks sit next to the wordmark text: hiding them keeps
        // screen readers from announcing "Percevia AI Percevia AI".
        aria-hidden={decorative ? true : undefined}
        width={1356}
        height={1356}
        priority
        className={cn("size-10 shrink-0 bg-black object-contain", className)}
      />
    );
  }

  if (variant === "lockup") {
    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <Logo variant="mark" decorative className="size-12" />
        <div className="flex flex-col leading-none">
          <span className="text-[22px] font-semibold tracking-tight text-navy-900">
            percevia
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
      <Logo variant="mark" decorative className="size-10" />
      <span
        className={cn(
          "text-[19px] font-semibold tracking-tight",
          textColor
        )}
      >
        percevia
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
      Percevia AI
    </span>
  );
}
