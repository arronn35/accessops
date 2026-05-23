import { AlertTriangle, CheckCircle2, Info, ShieldAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger" | "neutral";

const styles: Record<Tone, { bg: string; ring: string; text: string; icon: LucideIcon; accent: string }> = {
  info: {
    bg: "bg-blue-50",
    ring: "ring-blue-100",
    text: "text-blue-700",
    icon: Info,
    accent: "text-blue-500",
  },
  success: {
    bg: "bg-green-50",
    ring: "ring-green-50",
    text: "text-green-700",
    icon: CheckCircle2,
    accent: "text-green-500",
  },
  warning: {
    bg: "bg-amber-50",
    ring: "ring-amber-50",
    text: "text-amber-700",
    icon: AlertTriangle,
    accent: "text-amber-500",
  },
  danger: {
    bg: "bg-rose-50",
    ring: "ring-rose-50",
    text: "text-rose-700",
    icon: ShieldAlert,
    accent: "text-rose-500",
  },
  neutral: {
    bg: "bg-canvas-2",
    ring: "ring-line",
    text: "text-ink-700",
    icon: Info,
    accent: "text-ink-500",
  },
};

export function AlertCallout({
  tone = "info",
  title,
  children,
  action,
  className,
  icon: IconOverride,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}) {
  const s = styles[tone];
  const Icon = IconOverride ?? s.icon;
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : undefined}
      className={cn("rounded-md p-4 ring-1 flex gap-3", s.bg, s.ring, className)}
    >
      <Icon className={cn("size-5 shrink-0 mt-0.5", s.accent)} aria-hidden />
      <div className="flex-1 min-w-0">
        {title && <p className={cn("text-sm font-semibold leading-snug", s.text)}>{title}</p>}
        <div className={cn("text-sm leading-relaxed", title ? "mt-1" : "", s.text)}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
