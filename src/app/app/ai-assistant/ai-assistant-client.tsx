"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Code2,
  FileText,
  FlaskConical,
  Loader2,
  MessageCircle,
  PlusCircle,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AiSuggestionBlock } from "@/components/ai/AiSuggestionBlock";
import { CodeDiffBlock } from "@/components/ai/CodeDiffBlock";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { aiErrorToView, type AiErrorView } from "@/lib/ai/error-messages";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { cn, formatRelative } from "@/lib/utils";

export interface AssistantScan {
  id: string;
  baseUrl: string;
  projectId: string | null;
  pagesScanned: number;
  completedAt: string | null;
  aiRemediationEnabled: boolean;
  storeScreenshots: boolean;
}

export interface AssistantResult {
  explanationPlain: string;
  remediationSummary?: string;
  codeFixExample?: string;
  verification?: string;
  clientFriendlyExplanation?: string;
  reactFix?: string;
  projectGuidance?: {
    summary: string;
    priority: string;
    whyItMatters: string;
    recommendedSteps: string[];
    readerNotes: string[];
    verificationSteps: string[];
  };
  modelProvider?: string;
  model?: string;
  preset?: string;
  framework?: string;
  /** Failing HTML of the targeted issue, returned for the diff "before" panel. */
  primaryIssueSnippet?: string | null;
  createdAt?: string;
}

const PRESETS = [
  { id: "react", label: "Generate React fix", icon: Code2 },
  { id: "html", label: "Generate HTML / CSS fix", icon: Code2 },
  { id: "shopify", label: "Generate Shopify Liquid fix", icon: Code2 },
  { id: "wordpress", label: "WordPress guidance", icon: FileText },
  { id: "test", label: "Generate test checklist", icon: FlaskConical },
  { id: "explain", label: "Explain issue in plain language", icon: MessageCircle },
  { id: "client", label: "Draft client-friendly explanation", icon: MessageCircle },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];

const FRAMEWORKS = [
  { id: "react", label: "React / Next.js" },
  { id: "html", label: "HTML / CSS" },
  { id: "shopify", label: "Shopify Liquid" },
  { id: "wordpress", label: "WordPress" },
  { id: "webflow", label: "Webflow" },
  { id: "framer", label: "Framer" },
];

export function AiAssistantClient({
  scans,
  workspaceName,
  initialResults,
}: {
  scans: AssistantScan[];
  workspaceName: string;
  initialResults: Record<string, AssistantResult>;
}) {
  const [framework, setFramework] = useState("react");
  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState<PresetId>("react");
  const [selectedScanId, setSelectedScanId] = useState(scans[0]?.id ?? "");
  const [manualIssueDraft, setManualIssueDraft] = useState("");
  const [manualIssues, setManualIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiErrorView | null>(null);
  const [resultsByScan, setResultsByScan] = useState<Record<string, AssistantResult>>(
    () => initialResults ?? {}
  );

  const selectedScan = useMemo(
    () => scans.find((scan) => scan.id === selectedScanId) ?? scans[0] ?? null,
    [scans, selectedScanId]
  );
  const result = selectedScan ? resultsByScan[selectedScan.id] ?? null : null;
  const canGenerate = Boolean(selectedScan) && !busy;

  function addManualIssue() {
    const issue = manualIssueDraft.trim();
    if (!issue) return;
    setManualIssues((current) => [...current, issue]);
    setManualIssueDraft("");
  }

  function removeManualIssue(indexToRemove: number) {
    setManualIssues((current) => current.filter((_, index) => index !== indexToRemove));
  }

  async function generate() {
    if (!canGenerate || !selectedScan) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: buildAssistantPrompt(prompt, manualIssues, preset),
          framework,
          preset,
          scanJobId: selectedScan.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          aiErrorToView(
            typeof data.error === "string" ? data.error : "",
            typeof data.retryAfterSeconds === "number" ? data.retryAfterSeconds : undefined
          )
        );
        return;
      }
      const generated = data.result as AssistantResult;
      setResultsByScan((current) => ({
        ...current,
        [selectedScan.id]: {
          ...generated,
          framework: generated.framework ?? framework,
          preset: generated.preset ?? preset,
        },
      }));
    } catch {
      setError(aiErrorToView("network_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1100px] space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="size-3.5 text-purple-600" aria-hidden /> AI Fix Assistant
        </p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Generate, explain, and review accessibility fixes
        </h1>
        <p className="text-sm text-ink-600 mt-1 max-w-2xl">
          Select a past scan, then ask the coding-focused assistant for reviewable remediation
          diffs and verification steps for that project.
        </p>
      </header>

      <AlertCallout tone="warning" icon={ShieldAlert} title="What this assistant will not do">
        <ul className="mt-2 space-y-1 list-disc list-inside marker:text-amber-500">
          <li>It will not claim your site is compliant with any law or standard.</li>
          <li>It will not issue or imply certification.</li>
          <li>It will not recommend accessibility overlays as a substitute for real fixes.</li>
          <li>It will not mutate a repository; fixes are generated for developer review.</li>
        </ul>
      </AlertCallout>

      {/* Step 1 — scope */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">1 · Select a scan</CardTitle>
          <CardDescription>
            Every answer is grounded in the selected scan&apos;s findings, pages, and root-cause
            groups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scans.length === 0 ? (
            <AlertCallout tone="info">
              No completed scans are available in {workspaceName}. Complete a scan before asking
              the assistant for project-specific fixes.
            </AlertCallout>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {scans.map((scan) => {
                  const active = selectedScan?.id === scan.id;
                  return (
                    <button
                      key={scan.id}
                      type="button"
                      onClick={() => {
                        setSelectedScanId(scan.id);
                        setError(null);
                      }}
                      aria-pressed={active}
                      className={cn(
                        "min-w-[220px] rounded-md px-3 py-2 text-left ring-1 transition-colors",
                        active
                          ? "bg-navy-900 text-paper ring-navy-900"
                          : "bg-paper text-ink-700 ring-line hover:bg-canvas-2"
                      )}
                    >
                      <span className="block truncate text-sm font-semibold">
                        {scan.projectId || hostFromUrl(scan.baseUrl)}
                      </span>
                      <span className={cn("mt-0.5 block truncate text-xs", active ? "text-paper/75" : "text-ink-500")}>
                        {hostFromUrl(scan.baseUrl)} · {scan.pagesScanned} page(s)
                      </span>
                      <span className={cn("mt-1 block font-mono text-[10px]", active ? "text-paper/65" : "text-ink-500")}>
                        {scan.id.slice(0, 12)}
                        {resultsByScan[scan.id] ? " · plan saved" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedScan && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone={selectedScan.aiRemediationEnabled ? "ai" : "neutral"} size="sm">
                    {selectedScan.aiRemediationEnabled ? "AI on" : "AI off at scan"}
                  </Badge>
                  <Badge tone="success" size="sm">Privacy mode</Badge>
                  <Badge tone={selectedScan.storeScreenshots ? "info" : "neutral"} size="sm">
                    {selectedScan.storeScreenshots ? "Screenshots stored" : "Screenshots off"}
                  </Badge>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — configure & generate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">2 · Configure and generate</CardTitle>
          <CardDescription>
            Pick an action and a target framework. Adding a prompt or manual findings is optional
            but makes the plan more specific.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-ink-700 mb-1.5">Action</p>
            <ul className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const active = preset === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPreset(p.id)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                        active
                          ? "bg-purple-600 text-paper ring-purple-600"
                          : "bg-paper text-ink-700 ring-line hover:bg-canvas-2"
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      <span>{p.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-ink-700 mb-1.5">Target framework</p>
            <div className="flex flex-wrap gap-1.5">
              {FRAMEWORKS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFramework(f.id)}
                  aria-pressed={framework === f.id}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium ring-1 transition-colors",
                    framework === f.id
                      ? "bg-navy-900 text-paper ring-navy-900"
                      : "bg-paper text-ink-700 ring-line hover:bg-canvas-2"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="ai-prompt" className="block text-xs font-medium text-ink-700 mb-1.5">
              Ask the assistant <span className="text-ink-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Generate a Next.js diff for the unlabeled icon buttons in this scan"
              className="w-full rounded-md bg-paper px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-line shadow-[var(--shadow-soft)] placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
            />
          </div>

          <details className="rounded-md ring-1 ring-line bg-canvas-2 px-3 py-2.5">
            <summary className="cursor-pointer select-none text-xs font-medium text-ink-700">
              Target specific findings (optional)
              {manualIssues.length > 0 ? ` · ${manualIssues.length} added` : ""}
            </summary>
            <div className="mt-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <textarea
                  value={manualIssueDraft}
                  onChange={(event) => setManualIssueDraft(event.target.value)}
                  rows={2}
                  placeholder="Example: Header icon buttons have no accessible names on mobile."
                  className="min-h-[72px] w-full rounded-md bg-paper px-3 py-2 text-sm text-ink-900 ring-1 ring-line placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addManualIssue}
                  disabled={!manualIssueDraft.trim()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-navy-900 px-3 text-sm font-medium text-paper hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
                >
                  <PlusCircle className="size-4" aria-hidden />
                  Add issue
                </button>
              </div>
              {manualIssues.length > 0 && (
                <ul className="space-y-2">
                  {manualIssues.map((issue, index) => (
                    <li
                      key={`${issue}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-md bg-blue-50 px-3 py-2 ring-1 ring-blue-100"
                    >
                      <span className="text-xs leading-5 text-ink-900">{issue}</span>
                      <button
                        type="button"
                        onClick={() => removeManualIssue(index)}
                        className="rounded p-1 text-blue-700 hover:bg-paper"
                        aria-label={`Remove manual issue ${index + 1}`}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-ink-500 leading-relaxed max-w-md">
              {COMPLIANCE_COPY.AI_DISCLOSURE}
            </p>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={!canGenerate}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-purple-500 text-paper text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {busy ? "Generating…" : "Generate remediation plan"}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Step 3 — result */}
      <div aria-live="polite" className="space-y-6">
        {error && (
          <AlertCallout
            tone="danger"
            title={error.title}
            action={
              error.action === "retry" ? (
                <button
                  type="button"
                  onClick={() => void generate()}
                  disabled={!canGenerate}
                  className="inline-flex h-8 items-center rounded-md bg-paper px-3 text-xs font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50"
                >
                  Try again
                </button>
              ) : typeof error.action === "object" ? (
                <Link
                  href={error.action.href}
                  className="inline-flex h-8 items-center rounded-md bg-paper px-3 text-xs font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                >
                  {error.action.label}
                </Link>
              ) : undefined
            }
          >
            {error.message}
          </AlertCallout>
        )}

        {result ? (
          <RemediationPlan result={result} scan={selectedScan} />
        ) : (
          !error && (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <p className="text-sm text-ink-700">
                  No remediation plan yet. Select a scan above and press{" "}
                  <strong className="font-semibold text-ink-900">Generate remediation plan</strong>{" "}
                  — the assistant will return a summary, prioritized steps, a reviewable code fix,
                  and a verification plan.
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}

function RemediationPlan({
  result,
  scan,
}: {
  result: AssistantResult;
  scan: AssistantScan | null;
}) {
  const guidance = result.projectGuidance;
  const summary = guidance?.summary || result.clientFriendlyExplanation || result.explanationPlain;
  const recommendedSteps = guidance?.recommendedSteps.filter(Boolean) ?? [];
  const verificationSteps = guidance?.verificationSteps.filter(Boolean) ?? [];
  const readerNotes = guidance?.readerNotes.filter(Boolean) ?? [];
  const fixCode = result.reactFix || result.codeFixExample || "";
  const frameworkLabel = result.framework ?? "";
  const language = /react|next/i.test(frameworkLabel) ? "tsx" : "html";
  const verificationItems =
    verificationSteps.length > 0
      ? verificationSteps
      : result.verification
      ? [result.verification]
      : [];

  return (
    <AiSuggestionBlock title="Remediation plan">
      <div className="space-y-6">
        <p className="text-xs text-ink-500">
          {scan && (
            <>
              Based on scan <span className="font-mono text-ink-700">{scan.id}</span> (
              {hostFromUrl(scan.baseUrl)}, {scan.pagesScanned} page(s)) ·{" "}
            </>
          )}
          {result.createdAt ? `Generated ${formatRelative(result.createdAt)}` : "Generated just now"}
          {result.model ? ` · ${result.modelProvider ?? "AI"} / ${result.model}` : ""}
        </p>

        <PlanSection title="Summary">
          <p className="whitespace-pre-wrap">{summary}</p>
        </PlanSection>

        {guidance?.priority && (
          <PlanSection title="Priority">
            <p className="whitespace-pre-wrap">{guidance.priority}</p>
          </PlanSection>
        )}

        {guidance?.whyItMatters && (
          <PlanSection title="Why it matters">
            <p className="whitespace-pre-wrap">{guidance.whyItMatters}</p>
          </PlanSection>
        )}

        {result.remediationSummary && (
          <PlanSection title="Recommended fix">
            <p className="whitespace-pre-wrap">{result.remediationSummary}</p>
          </PlanSection>
        )}

        {recommendedSteps.length > 0 && (
          <PlanSection title={`Recommended steps (${recommendedSteps.length})`}>
            <ol className="list-decimal pl-5 space-y-1.5">
              {recommendedSteps.map((step) => (
                <li key={step} className="whitespace-pre-wrap">
                  {step}
                </li>
              ))}
            </ol>
          </PlanSection>
        )}

        {fixCode && (
          <PlanSection title="Code fix — review before applying">
            <CodeDiffBlock
              before={
                result.primaryIssueSnippet
                  ? {
                      label: "Failing snippet from this scan",
                      language,
                      code: result.primaryIssueSnippet,
                    }
                  : undefined
              }
              after={{
                label: `Suggested fix${frameworkLabel ? ` (${frameworkLabel})` : ""}`,
                language,
                code: fixCode,
              }}
            />
          </PlanSection>
        )}

        {verificationItems.length > 0 && (
          <PlanSection title="Verification plan">
            <ul className="space-y-1.5">
              {verificationItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-green-600" aria-hidden />
                  <span className="whitespace-pre-wrap">{item}</span>
                </li>
              ))}
            </ul>
          </PlanSection>
        )}

        {result.clientFriendlyExplanation && result.clientFriendlyExplanation !== summary && (
          <PlanSection title="Client-friendly explanation">
            <p className="whitespace-pre-wrap">{result.clientFriendlyExplanation}</p>
          </PlanSection>
        )}

        {readerNotes.length > 0 && (
          <PlanSection title="Review notes">
            <ul className="list-disc pl-5 space-y-1 text-xs text-ink-500">
              {readerNotes.map((note) => (
                <li key={note} className="whitespace-pre-wrap">
                  {note}
                </li>
              ))}
            </ul>
          </PlanSection>
        )}
      </div>
    </AiSuggestionBlock>
  );
}

function PlanSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5">
        {title}
      </h4>
      <div className="text-sm text-ink-700 leading-relaxed">{children}</div>
    </section>
  );
}

function buildAssistantPrompt(prompt: string, manualIssues: string[], preset: PresetId): string {
  const presetLabel = PRESETS.find((p) => p.id === preset)?.label ?? "Generate guidance";
  const trimmedPrompt = prompt.trim();
  const manualBlock = manualIssues.length
    ? [
        "Manual issues added by the user:",
        ...manualIssues.map((issue, index) => `${index + 1}. ${issue}`),
        "Return reviewable code fixes and example commands for these manual issues first, while still using the selected scan context.",
      ].join("\n")
    : "";

  return [
    trimmedPrompt || `${presetLabel} for the selected scan.`,
    manualBlock,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
