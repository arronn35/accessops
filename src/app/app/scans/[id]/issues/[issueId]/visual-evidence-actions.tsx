"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DeleteVisualEvidenceButton({ evidenceId }: { evidenceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/visual-evidence/${evidenceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Could not delete visual evidence");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onDelete}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-4" aria-hidden />
        )}
        Delete evidence
      </Button>
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
