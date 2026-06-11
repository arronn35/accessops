"use client";

import { useState } from "react";
import {
  Keyboard,
  Ear,
  ZoomIn,
  Wind,
  MoveVertical,
  Link2,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

/**
 * Manual review checklist.
 *
 * Automated scans catch ~30–50% of accessibility issues. These are the
 * checks a human still has to perform. Surfaced in-app so teams treat the
 * automated scan as a starting point, not a finish line. State is local /
 * session-only — this is a guide, not tracked compliance data.
 */
const CHECKS: { id: string; Icon: React.ElementType; title: string; detail: string }[] = [
  {
    id: "keyboard",
    Icon: Keyboard,
    title: "Keyboard-only walkthrough",
    detail: "Tab through every interactive element and complete primary journeys without a mouse.",
  },
  {
    id: "screen-reader",
    Icon: Ear,
    title: "Screen reader pass",
    detail: "Navigate home, a key content page, and any checkout/forms with VoiceOver or NVDA.",
  },
  {
    id: "zoom",
    Icon: ZoomIn,
    title: "Zoom & reflow at 200% / 400%",
    detail: "Confirm content reflows without horizontal scrolling or clipped controls.",
  },
  {
    id: "reduced-motion",
    Icon: Wind,
    title: "Reduced motion",
    detail: "With prefers-reduced-motion on, verify animations and auto-playing motion are suppressed.",
  },
  {
    id: "focus-order",
    Icon: MoveVertical,
    title: "Focus order & visibility",
    detail: "Focus moves in a logical order and a visible focus indicator is always present.",
  },
  {
    id: "link-text",
    Icon: Link2,
    title: "Link & button text",
    detail: 'Each control makes sense out of context — no bare "click here" or icon-only buttons.',
  },
  {
    id: "form-errors",
    Icon: AlertCircle,
    title: "Form errors & labels",
    detail: "Errors are announced, tied to their field, and describe how to fix the problem.",
  },
];

export function ManualReviewChecklist() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const completed = Object.values(done).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-ink-500" aria-hidden /> Manual review checklist
          </span>
          <span className="text-xs font-normal text-ink-500 tabular-nums">
            {completed}/{CHECKS.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-ink-500 mb-3 leading-relaxed">
          Automated checks detect roughly 30–50% of issues. Work through these manual checks to
          cover the rest. This list is a guide and is not stored as compliance evidence.
        </p>
        <ul className="space-y-1.5">
          {CHECKS.map((c) => {
            const checked = !!done[c.id];
            return (
              <li key={c.id}>
                <label className="flex items-start gap-3 rounded-md p-2.5 hover:bg-canvas-2 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setDone((p) => ({ ...p, [c.id]: e.target.checked }))}
                    className="mt-0.5 size-4 rounded border-line accent-navy-900"
                  />
                  <c.Icon className="size-4 text-ink-500 mt-0.5 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span
                      className={
                        "block text-sm font-medium " +
                        (checked ? "text-ink-400 line-through" : "text-ink-900")
                      }
                    >
                      {c.title}
                    </span>
                    <span className="block text-xs text-ink-600 leading-snug mt-0.5">{c.detail}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
