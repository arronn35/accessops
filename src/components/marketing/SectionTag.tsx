import { cn } from "@/lib/utils";

/**
 * The numbered mono marker that opens every marketing section
 * ("03 / Method"). Inverted by default, light on the dark sections.
 */
export function SectionTag({
  index,
  label,
  tone = "dark",
  className,
}: {
  index: string;
  label: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "eyebrow inline-block px-2.5 py-1.5 tracking-[0.16em]",
        tone === "dark" ? "bg-navy-900 text-paper" : "bg-paper text-navy-900",
        className
      )}
    >
      {index} / {label}
    </span>
  );
}

/** Handwritten aside used to undercut the marketing voice with a plain one. */
export function Aside({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("script text-[25px] text-purple-600", className)}>{children}</p>
  );
}
