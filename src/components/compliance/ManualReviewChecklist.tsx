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
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Circle,
  BookOpen,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/components/i18n/LanguageProvider";

interface CheckItem {
  id: string;
  Icon: React.ElementType;
  title: string;
  detail: string;
  steps: string[];
  checks: string[];
  tip: string;
}

const CHECKS: CheckItem[] = [
  {
    id: "keyboard",
    Icon: Keyboard,
    title: "Keyboard-only walkthrough",
    detail: "Complete primary user flows using only the keyboard.",
    steps: [
      "Navigate to the page and unplug your mouse/pointing device.",
      "Use the 'Tab' key to move focus forward and 'Shift + Tab' to move backward.",
      "Use 'Enter' to activate links and buttons; use 'Space' to trigger checkboxes or toggle controls.",
      "Use arrow keys to navigate menus, radio groups, and tab panels.",
      "Try opening and closing modals, checking if focus is properly trapped inside them."
    ],
    checks: [
      "Verify you can access every interactive control, link, button, and input.",
      "Ensure focus is never trapped permanently in a visual loop (Keyboard Trap).",
      "Confirm you can escape modals and dropdowns using the 'Escape' key."
    ],
    tip: "A standard keyboard test is the single most effective way to catch critical interactive accessibility blockers."
  },
  {
    id: "screen-reader",
    Icon: Ear,
    title: "Screen reader pass",
    detail: "Audit critical paths using a screen reader (VoiceOver, NVDA).",
    steps: [
      "Enable your OS screen reader (macOS: Cmd+F5; Windows: Ctrl+Win+Enter for Narrator, or start NVDA).",
      "Navigate the page hierarchy using headings (e.g., press 'H' in NVDA/VoiceOver rotor).",
      "Tab through interactive controls and listen to the announcement voice.",
      "Verify form inputs announce their associated visual label, placeholder, and error message."
    ],
    checks: [
      "Ensure visual content order matches the screen reader read-out order.",
      "Confirm screen reader announces the status changes (e.g. 'Expanded', 'Collapsed', 'Errors found').",
      "Verify decorative images have alt=\"\" so the screen reader skips them entirely."
    ],
    tip: "Screen readers rely heavily on semantic markup. If you hear 'Unlabeled button', the code lacks aria-label or accessible text."
  },
  {
    id: "zoom",
    Icon: ZoomIn,
    title: "Zoom & reflow at 200% / 400%",
    detail: "Ensure layout and content remain readable when zoomed.",
    steps: [
      "Press Cmd+ (macOS) or Ctrl+ (Windows) to zoom the browser page to 200%.",
      "Increase zoom further to 400% (equivalent to a 320px wide screen layout).",
      "Inspect the layout, text wraps, and overlay panels."
    ],
    checks: [
      "Verify text does not overlap, clip, or hide behind other components.",
      "Ensure content reflows vertically into a single column.",
      "Confirm that horizontal scrolling is not required to read a paragraph of text."
    ],
    tip: "Reflow is crucial for low-vision users who zoom in to read. Desktop layouts must adapt dynamically just like mobile viewports."
  },
  {
    id: "reduced-motion",
    Icon: Wind,
    title: "Reduced motion behaviors",
    detail: "Verify non-essential animations respect motion settings.",
    steps: [
      "Open your OS accessibility preferences and enable 'Reduce Motion' (or equivalent).",
      "Interact with website transitions, slide-outs, scroll-based triggers, and auto-playing carousels."
    ],
    checks: [
      "Verify that fast transitions, zooming, or parallax motion effects are completely disabled or replaced with quick fades.",
      "Confirm that auto-playing videos or carousels provide a visible Pause/Play control button."
    ],
    tip: "Excessive motion can cause physical nausea, vestibular disorders, or distraction. Respecting reduce-motion is a WCAG requirement."
  },
  {
    id: "focus-order",
    Icon: MoveVertical,
    title: "Focus order & visibility",
    detail: "Track the focus indicator as you navigate with Tab.",
    steps: [
      "Move focus through the page sequentially using the Tab key.",
      "Observe the outline border around each element as it receives focus."
    ],
    checks: [
      "Confirm that a clear, visible focus indicator (e.g. blue ring) is present and visible at all times on all active controls.",
      "Ensure focus moves in a logical order (top-to-bottom, left-to-right) matching the visual layout."
    ],
    tip: "Never use CSS outline: none unless you replace it with an accessible, high-contrast custom outline."
  },
  {
    id: "link-text",
    Icon: Link2,
    title: "Link & button descriptive text",
    detail: "Check if link destinations are clear from their text alone.",
    steps: [
      "Scan the page specifically for generic link text or icon-only buttons."
    ],
    checks: [
      "Verify links make sense out of context (avoid using generic 'Click here', 'More', or raw URLs as link text).",
      "Ensure icon-only buttons (like social media sharing, search magnifying glasses) have aria-label values."
    ],
    tip: "Screen reader users often generate a list of all page links to navigate quickly. A list of 'Click here', 'Click here' is unusable."
  },
  {
    id: "form-errors",
    Icon: AlertCircle,
    title: "Form validation errors & labels",
    detail: "Submit forms with errors and evaluate the feedback.",
    steps: [
      "Attempt to submit forms on the page with invalid or empty fields.",
      "Observe where focus is redirected and how the error alert is displayed."
    ],
    checks: [
      "Verify that error feedback clearly explains what is wrong and how to fix the field.",
      "Confirm that error messages are programmatically tied to inputs using aria-describedby.",
      "Ensure the error container announces itself automatically (e.g. role=\"alert\" or aria-live=\"assertive\")."
    ],
    tip: "Simply highlighting a field in red does not communicate the error to color-blind or blind users. Textual description is mandatory."
  },
];

export type ManualCheckStatus = "pending" | "passed" | "failed";

/** Serialisable view of a stored review, as handed down by the server page. */
export interface ManualReviewSnapshot {
  checkId: string;
  status: ManualCheckStatus;
  notes: string | null;
  reviewerName: string | null;
  reviewerEmail: string | null;
  revision: number;
  updatedAt: string;
}

function byCheckId(reviews: ManualReviewSnapshot[]): Record<string, ManualReviewSnapshot> {
  return Object.fromEntries(reviews.map((r) => [r.checkId, r]));
}

/**
 * Guided manual audit.
 *
 * Verdicts are stored per workspace + scan + check with the reviewer's identity
 * and a revision count, so a teammate on another machine sees the same record
 * and the generated report can cite the actual review. This previously lived in
 * localStorage, which meant it was invisible to everyone else and gone the
 * moment the browser was cleared.
 */
export function ManualReviewChecklist({
  scanId,
  initialReviews,
  canRecord,
}: {
  scanId: string;
  initialReviews: ManualReviewSnapshot[];
  canRecord: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [auditState, setAuditState] = useState(() => byCheckId(initialReviews));
  // Note text is edited locally and persisted on blur; saving per keystroke
  // would be one write per character.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Rendered copy goes through React state (never the DOM-mutating i18n
  // observer): this checklist re-renders on every verdict/note save, and
  // provider-mutated text nodes diverge from React's virtual DOM and throw
  // hydration #418. data-i18n-skip keeps the observer off this subtree entirely.
  const { t } = useLanguage();

  const noteFor = (id: string) => drafts[id] ?? auditState[id]?.notes ?? "";

  const updateCheck = async (
    id: string,
    status: ManualCheckStatus,
    notes: string
  ) => {
    if (!canRecord) return;
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/scans/${scanId}/manual-review`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checkId: id, status, notes }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { review } = (await res.json()) as { review: ManualReviewSnapshot };
      setAuditState((prev) => ({ ...prev, [id]: review }));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      // Nothing was stored, so say so rather than leaving a verdict on screen
      // that no teammate and no report will ever see.
      setError("We couldn't save that review. Check your connection and try again.");
    } finally {
      setSavingId(null);
    }
  };

  const completedCount = CHECKS.filter(
    (c) => auditState[c.id]?.status && auditState[c.id].status !== "pending"
  ).length;
  const progressPercent = Math.round((completedCount / CHECKS.length) * 100);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderStatusIcon = (status: "pending" | "passed" | "failed" | undefined) => {
    if (status === "passed") {
      return <CheckCircle2 className="size-5 text-green-500 shrink-0 mt-0.5" aria-hidden />;
    }
    if (status === "failed") {
      return <XCircle className="size-5 text-rose-500 shrink-0 mt-0.5" aria-hidden />;
    }
    return <Circle className="size-5 text-ink-400 shrink-0 mt-0.5" aria-hidden />;
  };

  return (
    <Card data-i18n-skip className="ring-1 ring-line shadow-[var(--shadow-card)] overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <ClipboardCheck className="size-4 text-purple-600" aria-hidden /> {t("Guided manual audit")}
            </span>
            <span className="text-xs font-medium text-ink-500 tabular-nums">
              {completedCount} / {CHECKS.length} {t("checks done")}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-canvas-2 overflow-hidden" aria-hidden>
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-5 pt-0">
        <p className="text-xs text-ink-600 mb-4 leading-relaxed">
          {t("Automated checkers cannot detect every violation. Step through this guide to review keyboard, screen reader, and layout behaviors. Results are saved to this scan with your name, so teammates see them and the report can cite them.")}
        </p>

        {error && (
          <p
            role="alert"
            className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
          >
            {t(error)}
          </p>
        )}

        {!canRecord && (
          <p className="mb-3 rounded-md border border-line bg-canvas-2 px-3 py-2 text-xs text-ink-600">
            {t("Your role can read these results but not record them.")}
          </p>
        )}

        <ul className="space-y-2.5">
          {CHECKS.map((c) => {
            const stored = auditState[c.id];
            const currentItem = {
              status: (stored?.status ?? "pending") as ManualCheckStatus,
              notes: noteFor(c.id),
            };
            const isExpanded = expandedId === c.id;

            return (
              <li
                key={c.id}
                className={`rounded-md border border-line transition-all duration-150 ${
                  isExpanded ? "bg-canvas-2/40 border-line-strong" : "bg-paper hover:bg-canvas-2/10"
                }`}
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(c.id)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-start justify-between gap-3 p-3 text-left cursor-pointer"
                >
                  <div className="flex gap-3">
                    {renderStatusIcon(currentItem.status)}
                    <div className="min-w-0">
                      <span className="block text-sm font-medium text-ink-900 leading-snug">
                        {t(c.title)}
                      </span>
                      {!isExpanded && (
                        <span className="block text-[11px] text-ink-500 mt-0.5 truncate max-w-[220px]">
                          {currentItem.notes || t(c.detail)}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-ink-400 shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="size-4 text-ink-400 shrink-0 mt-0.5" />
                  )}
                </button>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="border-t border-line/60 p-3.5 space-y-4 text-xs">
                    {/* Steps */}
                    <div className="space-y-1.5">
                      <h4 className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-bold">
                        <BookOpen className="size-3" /> {t("Step-by-step instructions")}
                      </h4>
                      <ol className="list-decimal pl-4 space-y-1 text-ink-700 leading-relaxed">
                        {c.steps.map((step, idx) => (
                          <li key={idx}>{t(step)}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Checks */}
                    <div className="space-y-1.5">
                      <h4 className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-bold">
                        <Info className="size-3" /> {t("Critical checks")}
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-ink-700 leading-relaxed">
                        {c.checks.map((check, idx) => (
                          <li key={idx}>{t(check)}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Tip */}
                    <div className="rounded-md bg-purple-50/50 p-2.5 border border-purple-100 text-purple-800 leading-relaxed">
                      <strong>{t("Audit tip:")}</strong> {t(c.tip)}
                    </div>

                    {/* Notes Area */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`notes-${c.id}`}
                        className="block text-[10px] uppercase tracking-wider text-ink-500 font-bold"
                      >
                        {t("Observations & notes")}
                      </label>
                      <textarea
                        id={`notes-${c.id}`}
                        value={currentItem.notes}
                        disabled={!canRecord}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        onBlur={(e) => {
                          // Persist once the reviewer moves on, not per keystroke.
                          if (e.target.value !== (stored?.notes ?? "")) {
                            void updateCheck(c.id, currentItem.status, e.target.value);
                          }
                        }}
                        placeholder={t("Write down any accessibility bugs, failures or general remarks found here...")}
                        className="w-full min-h-[70px] rounded-md bg-paper p-2.5 border border-line focus:outline-none focus:ring-1 focus:ring-purple-500 text-ink-900 leading-relaxed resize-y disabled:opacity-60"
                      />
                    </div>

                    {stored && (
                      <p className="text-[11px] text-ink-500">
                        {t("Recorded by")}{" "}
                        <span className="font-medium text-ink-700">
                          {stored.reviewerName || stored.reviewerEmail || t("a teammate")}
                        </span>{" "}
                        · {new Date(stored.updatedAt).toLocaleString()}
                        {stored.revision > 1 ? (
                          <>
                            {" · "}
                            {t("revision")} {stored.revision}
                          </>
                        ) : (
                          ""
                        )}
                      </p>
                    )}

                    {/* Status selectors */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-line/60">
                      <span className="text-[10px] uppercase tracking-wider text-ink-500 font-bold">
                        {t("Audit Status")}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => void updateCheck(c.id, "pending", currentItem.notes)}
                          disabled={!canRecord || savingId === c.id}
                          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                            currentItem.status === "pending"
                              ? "bg-ink-100 text-ink-800"
                              : "bg-paper text-ink-600 border border-line hover:bg-canvas-2/50"
                          }`}
                        >
                          {t("Clear")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateCheck(c.id, "passed", currentItem.notes)}
                          disabled={!canRecord || savingId === c.id}
                          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                            currentItem.status === "passed"
                              ? "bg-green-500 text-paper"
                              : "bg-paper text-green-700 border border-green-200 hover:bg-green-50/30"
                          }`}
                        >
                          {t("Passed")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateCheck(c.id, "failed", currentItem.notes)}
                          disabled={!canRecord || savingId === c.id}
                          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                            currentItem.status === "failed"
                              ? "bg-rose-500 text-paper"
                              : "bg-paper text-rose-700 border border-rose-200 hover:bg-rose-50/30"
                          }`}
                        >
                          {t("Failed")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
