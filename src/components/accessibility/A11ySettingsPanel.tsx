"use client";

import { Contrast, MoveRight, Type, Wind } from "lucide-react";
import { useA11y } from "./A11yProvider";
import { cn } from "@/lib/utils";

function SegGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  icon,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  icon?: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-2 text-sm font-medium text-ink-700">
        {icon}
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex rounded-md border border-line bg-paper p-1"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-sm transition-colors min-h-[36px]",
                active
                  ? "bg-navy-900 text-paper"
                  : "text-ink-600 hover:bg-canvas-2"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function A11ySettingsPanel() {
  const { textSize, setTextSize, contrast, setContrast, motion, setMotion } = useA11y();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-ink-900">Accessibility preferences</h3>
        <p className="text-sm text-ink-600 mt-1">
          These settings apply to the AccessOps AI interface only. We respect your operating
          system&apos;s reduced-motion preference automatically.
        </p>
      </div>

      <SegGroup
        label="Text size"
        icon={<Type className="size-4" aria-hidden />}
        value={textSize}
        onChange={setTextSize}
        options={[
          { value: "sm", label: "Smaller" },
          { value: "md", label: "Default" },
          { value: "lg", label: "Larger" },
        ]}
      />

      <SegGroup
        label="Contrast"
        icon={<Contrast className="size-4" aria-hidden />}
        value={contrast}
        onChange={setContrast}
        options={[
          { value: "default", label: "Default" },
          { value: "high", label: "High contrast" },
        ]}
      />

      <SegGroup
        label="Motion"
        icon={<Wind className="size-4" aria-hidden />}
        value={motion}
        onChange={setMotion}
        options={[
          { value: "default", label: "Default" },
          { value: "reduced", label: "Reduced" },
        ]}
      />

      <p className="text-xs text-ink-500 flex items-center gap-1">
        Preferences are stored locally in your browser.
        <MoveRight className="size-3" aria-hidden />
      </p>
    </div>
  );
}
