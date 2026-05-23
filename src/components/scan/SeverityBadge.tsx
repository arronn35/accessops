import { AlertOctagon, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Severity = "critical" | "moderate" | "minor" | "passed" | "review";

const cfg: Record<Severity, { label: string; bg: string; ring: string; text: string; iconColor: string; Icon: React.ElementType }> = {
  critical: {
    label: "Critical",
    bg: "bg-rose-50",
    ring: "ring-rose-50",
    text: "text-rose-700",
    iconColor: "text-rose-500",
    Icon: AlertOctagon,
  },
  moderate: {
    label: "Moderate",
    bg: "bg-amber-50",
    ring: "ring-amber-50",
    text: "text-amber-700",
    iconColor: "text-amber-500",
    Icon: AlertTriangle,
  },
  minor: {
    label: "Minor",
    bg: "bg-blue-50",
    ring: "ring-blue-100",
    text: "text-blue-700",
    iconColor: "text-blue-500",
    Icon: Info,
  },
  passed: {
    label: "Passed",
    bg: "bg-green-50",
    ring: "ring-green-50",
    text: "text-green-700",
    iconColor: "text-green-500",
    Icon: CheckCircle2,
  },
  review: {
    label: "Needs review",
    bg: "bg-purple-50",
    ring: "ring-purple-100",
    text: "text-purple-600",
    iconColor: "text-purple-600",
    Icon: AlertTriangle,
  },
};

export function SeverityBadge({
  severity,
  size = "md",
  className,
}: {
  severity: Severity;
  size?: "sm" | "md";
  className?: string;
}) {
  const { label, bg, ring, text, iconColor, Icon } = cfg[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1",
        bg,
        ring,
        text,
        size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-1" : "text-xs px-2.5 py-0.5",
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "size-3" : "size-3.5", iconColor)} aria-hidden />
      {label}
    </span>
  );
}
