"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CodeBlock {
  label: string;
  language?: string;
  code: string;
  tone: "before" | "after";
}

export function CodeDiffBlock({
  before,
  after,
  className,
}: {
  before: Omit<CodeBlock, "tone">;
  after: Omit<CodeBlock, "tone">;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)}>
      <CodePanel block={{ ...before, tone: "before" }} />
      <CodePanel block={{ ...after, tone: "after" }} />
    </div>
  );
}

function CodePanel({ block }: { block: CodeBlock }) {
  const [copied, setCopied] = useState(false);
  const isAfter = block.tone === "after";

  const handleCopy = () => {
    navigator.clipboard.writeText(block.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div
      className={cn(
        "rounded-md overflow-hidden ring-1",
        isAfter ? "ring-green-50 bg-green-50/30" : "ring-rose-50 bg-rose-50/30"
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 border-b text-xs font-medium",
          isAfter ? "border-green-50 text-green-700" : "border-rose-50 text-rose-700"
        )}
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "size-1.5 rounded-full",
              isAfter ? "bg-green-500" : "bg-rose-500"
            )}
            aria-hidden
          />
          {block.label}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium hover:bg-paper/60"
          aria-label={`Copy ${block.label}`}
        >
          {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </header>
      <pre className="px-3 py-3 text-xs leading-relaxed font-mono text-ink-900 overflow-x-auto bg-paper">
        <code>{block.code}</code>
      </pre>
    </div>
  );
}
