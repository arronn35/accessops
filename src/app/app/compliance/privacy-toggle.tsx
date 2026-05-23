"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/Switch";

export function PrivacyToggle({
  fieldKey,
  initial,
  label,
  description,
  disabled,
}: {
  fieldKey: "aiProcessingEnabled" | "screenshotStorageEnabled";
  initial: boolean;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onToggle(next: boolean) {
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/privacy/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [fieldKey]: next }),
      });
      if (!res.ok) {
        setChecked(!next);
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Could not save");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-ink-900">{label}</p>
          {description && (
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pending && <Loader2 className="size-3.5 animate-spin text-ink-500" aria-hidden />}
          <Switch
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled || pending}
            aria-label={label}
          />
        </div>
      </div>
      {error && <p className="text-xs text-rose-700 mt-2">{error}</p>}
    </div>
  );
}
