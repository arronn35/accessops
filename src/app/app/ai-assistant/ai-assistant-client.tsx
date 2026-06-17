"use client";

import { useMemo, useState } from "react";
import {
  Code2,
  FileText,
  FlaskConical,
  Globe,
  ListChecks,
  MessageCircle,
  PlusCircle,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AiSuggestionBlock } from "@/components/ai/AiSuggestionBlock";
import { CodeDiffBlock } from "@/components/ai/CodeDiffBlock";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { cn } from "@/lib/utils";

export interface AssistantScan {
  id: string;
  baseUrl: string;
  projectId: string | null;
  pagesScanned: number;
  completedAt: string | null;
  aiRemediationEnabled: boolean;
  storeScreenshots: boolean;
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

const FRAMEWORKS = [
  { id: "react", label: "React / Next.js" },
  { id: "html", label: "HTML / CSS" },
  { id: "shopify", label: "Shopify Liquid" },
  { id: "wordpress", label: "WordPress" },
  { id: "webflow", label: "Webflow" },
  { id: "framer", label: "Framer" },
];

interface AiResult {
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
}

export function AiAssistantClient({
  scans,
  workspaceName,
}: {
  scans: AssistantScan[];
  workspaceName: string;
}) {
  const [framework, setFramework] = useState("react");
  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("react");
  const [selectedScanId, setSelectedScanId] = useState(scans[0]?.id ?? "");
  const [manualIssueDraft, setManualIssueDraft] = useState("");
  const [manualIssues, setManualIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);

  const selectedScan = useMemo(
    () => scans.find((scan) => scan.id === selectedScanId) ?? scans[0] ?? null,
    [scans, selectedScanId]
  );

  const canGenerate = Boolean(selectedScan && (prompt.trim() || manualIssues.length > 0));
  const assistantPrompt = buildAssistantPrompt(prompt, manualIssues);

  function addManualIssue() {
    const issue = manualIssueDraft.trim();
    if (!issue) return;
    setManualIssues((current) => [...current, issue]);
    setManualIssueDraft("");
    setResult(null);
  }

  function removeManualIssue(indexToRemove: number) {
    setManualIssues((current) => current.filter((_, index) => index !== indexToRemove));
    setResult(null);
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
          prompt: assistantPrompt,
          framework,
          preset,
          scanJobId: selectedScan.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || "Could not generate analysis.");
        return;
      }
      setResult(data.result);
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1400px]">
      <header className="mb-6">
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

      <AlertCallout
        tone="warning"
        icon={ShieldAlert}
        title="What this assistant will not do"
        className="mb-6"
      >
        <ul className="mt-2 space-y-1 list-disc list-inside marker:text-amber-500">
          <li>It will not claim your site is compliant with any law or standard.</li>
          <li>It will not issue or imply certification.</li>
          <li>It will not recommend accessibility overlays as a substitute for real fixes.</li>
          <li>It will not mutate a repository; fixes are generated for developer review.</li>
        </ul>
      </AlertCallout>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Past scans</CardTitle>
        </CardHeader>
        <CardContent>
          {scans.length === 0 ? (
            <AlertCallout tone="info">
              No completed scans are available in {workspaceName}. Complete a scan before asking
              the assistant for project-specific fixes.
            </AlertCallout>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {scans.map((scan) => {
                const active = selectedScan?.id === scan.id;
                return (
                  <button
                    key={scan.id}
                    type="button"
                    onClick={() => {
                      setSelectedScanId(scan.id);
                      setResult(null);
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
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-5 min-w-0">
          {error && (
            <AlertCallout tone="danger" title="AI request failed">
              {error}
            </AlertCallout>
          )}

          <AiSuggestionBlock title="Reviewable code fix">
            <ReviewableCodeFixPreview
              framework={framework}
              manualIssueDraft={manualIssueDraft}
              manualIssues={manualIssues}
              selectedScan={selectedScan}
              result={result}
              onDraftChange={setManualIssueDraft}
              onAddIssue={addManualIssue}
              onRemoveIssue={removeManualIssue}
            />
          </AiSuggestionBlock>

          {result && (
            <AiSuggestionBlock title="Project guidance">
              <ProjectGuidanceView result={result} selectedScan={selectedScan} />
            </AiSuggestionBlock>
          )}

          {result && (
            <AiSuggestionBlock title="Generated patch example">
              <CodeDiffBlock
                before={{
                  label: "Before",
                  language: framework === "react" ? "tsx" : "html",
                  code: "// Use the selected scan context and manual issues to target the failing component.",
                }}
                after={{
                  label: "After",
                  language: framework === "react" ? "tsx" : "html",
                  code: result.reactFix || result.codeFixExample || result.remediationSummary || "",
                }}
              />
              {result.verification && (
                <p className="mt-3 text-xs text-ink-600 leading-relaxed whitespace-pre-wrap">
                  {result.verification}
                </p>
              )}
              {result.model && (
                <p className="mt-3 text-[11px] text-ink-500">
                  Generated with {result.modelProvider ?? "AI"} / {result.model}
                </p>
              )}
            </AiSuggestionBlock>
          )}

          <Card>
            <CardContent className="pt-5">
              <label htmlFor="ai-prompt" className="block text-sm font-medium text-ink-700 mb-2">
                Ask the assistant
              </label>
              <textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Generate a Next.js diff for the unlabeled icon buttons in this scan"
                className="w-full rounded-md bg-paper px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-line shadow-[var(--shadow-soft)] placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
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
                <button
                  type="button"
                  onClick={() => void generate()}
                  disabled={busy || !canGenerate}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-purple-500 text-paper text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="size-4" aria-hidden /> {busy ? "Generating..." : "Generate"}
                </button>
              </div>
              <p className="text-[11px] text-ink-500 mt-3 leading-relaxed">
                {COMPLIANCE_COPY.AI_DISCLOSURE}
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preset actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
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
                          "w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-md text-sm min-h-[40px] transition-colors",
                          active
                            ? "bg-purple-50 text-purple-900 ring-1 ring-purple-200"
                            : "hover:bg-canvas-2 text-ink-700"
                        )}
                      >
                        <Icon className="size-4 text-purple-600 shrink-0" aria-hidden />
                        <span>{p.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="size-4 text-ink-500" aria-hidden /> Scope
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedScan ? (
                <>
                  <p className="text-xs text-ink-700">
                    Scan <span className="font-mono font-medium text-ink-900">{selectedScan.id}</span>
                  </p>
                  <p className="text-xs text-ink-500 mt-1">{selectedScan.baseUrl}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone={selectedScan.aiRemediationEnabled ? "ai" : "neutral"} size="sm">
                      {selectedScan.aiRemediationEnabled ? "AI on" : "AI off at scan"}
                    </Badge>
                    <Badge tone="success" size="sm">Privacy mode</Badge>
                    <Badge tone={selectedScan.storeScreenshots ? "info" : "neutral"} size="sm">
                      {selectedScan.storeScreenshots ? "Screenshots stored" : "Screenshots off"}
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-xs text-ink-600">Select a completed scan to set project scope.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ReviewableCodeFixPreview({
  framework,
  manualIssueDraft,
  manualIssues,
  selectedScan,
  result,
  onDraftChange,
  onAddIssue,
  onRemoveIssue,
}: {
  framework: string;
  manualIssueDraft: string;
  manualIssues: string[];
  selectedScan: AssistantScan | null;
  result: AiResult | null;
  onDraftChange: (value: string) => void;
  onAddIssue: () => void;
  onRemoveIssue: (index: number) => void;
}) {
  const frameworkName = frameworkLabel(framework);
  const commandPreview = buildFixCommandPreview({
    framework,
    manualIssues,
    selectedScan,
    result,
  });
  const patchPreview =
    result?.reactFix || result?.codeFixExample || result?.remediationSummary || starterPatchForFramework(framework);

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-paper p-3 ring-1 ring-line">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Manual issue queue</p>
            <p className="mt-1 text-xs text-ink-600">
              Add the exact problems you want the assistant to target. These entries are sent with
              the selected scan context.
            </p>
          </div>
          <Badge tone="info" size="sm">
            {frameworkName}
          </Badge>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <textarea
            value={manualIssueDraft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={2}
            placeholder="Example: Header icon buttons have no accessible names on mobile."
            className="min-h-[72px] w-full rounded-md bg-canvas-2 px-3 py-2 text-sm text-ink-900 ring-1 ring-line placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          <button
            type="button"
            onClick={onAddIssue}
            disabled={!manualIssueDraft.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-navy-900 px-3 text-sm font-medium text-paper hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
          >
            <PlusCircle className="size-4" aria-hidden />
            Add issue
          </button>
        </div>

        {manualIssues.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {manualIssues.map((issue, index) => (
              <li
                key={`${issue}-${index}`}
                className="flex items-start justify-between gap-3 rounded-md bg-blue-50 px-3 py-2 ring-1 ring-blue-100"
              >
                <span className="font-mono text-xs leading-5 text-ink-900">
                  issue_{String(index + 1).padStart(2, "0")}: {issue}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveIssue(index)}
                  className="rounded p-1 text-blue-700 hover:bg-paper"
                  aria-label={`Remove manual issue ${index + 1}`}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-md bg-canvas-2 px-3 py-2 text-xs text-ink-600">
            No manual issues added yet. The preview below will use the selected scan and a starter
            remediation command.
          </p>
        )}
      </div>

      <GuidanceCodeList label="fix_command_preview" items={commandPreview} tone="violet" />

      <CodeDiffBlock
        before={{
          label: "Problem input",
          language: "text",
          code:
            manualIssues.length > 0
              ? manualIssues.map((issue, index) => `issue_${index + 1}: ${issue}`).join("\n")
              : "Add a manual issue above or generate from the selected scan.",
        }}
        after={{
          label: result ? "AI patch preview" : "Starter fix pattern",
          language: framework === "react" ? "tsx" : "html",
          code: patchPreview,
        }}
      />
    </div>
  );
}

function ProjectGuidanceView({
  result,
  selectedScan,
}: {
  result: AiResult;
  selectedScan: AssistantScan | null;
}) {
  const guidance = result.projectGuidance;
  const summary = guidance?.summary || result.clientFriendlyExplanation || result.explanationPlain;
  const recommendedSteps = guidance?.recommendedSteps.filter(Boolean) ?? [];
  const verificationSteps = guidance?.verificationSteps.filter(Boolean) ?? [];
  const readerNotes = guidance?.readerNotes.filter(Boolean) ?? [];

  return (
    <div className="space-y-4">
      {selectedScan && (
        <GuidanceCodeCard
          label="selected_scan"
          tone="slate"
          value={[
            `project: ${selectedScan.projectId || hostFromUrl(selectedScan.baseUrl)}`,
            `url: ${selectedScan.baseUrl}`,
            `pages_scanned: ${selectedScan.pagesScanned}`,
            `scan_id: ${selectedScan.id}`,
          ].join("\n")}
        />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <GuidanceCodeCard label="summary" tone="blue" value={summary} />
        {guidance?.priority && (
          <GuidanceCodeCard label="priority" tone="amber" value={guidance.priority} />
        )}
      </div>

      {guidance?.whyItMatters && (
        <GuidanceCodeCard
          label="why_it_matters"
          tone="green"
          value={guidance.whyItMatters}
        />
      )}

      {recommendedSteps.length > 0 && (
        <GuidanceCodeList
          label="recommended_steps"
          items={recommendedSteps}
          tone="violet"
        />
      )}

      {verificationSteps.length > 0 ? (
        <GuidanceCodeList
          label="verification_plan"
          items={verificationSteps}
          tone="green"
        />
      ) : result.verification ? (
        <GuidanceCodeList
          label="verification_plan"
          items={[result.verification]}
          tone="green"
        />
      ) : null}

      {readerNotes.length > 0 && (
        <GuidanceCodeList label="reader_notes" items={readerNotes} tone="slate" />
      )}
    </div>
  );
}

function GuidanceCodeCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: GuidanceTone;
}) {
  const styles = guidanceToneStyles[tone];
  return (
    <section className={cn("overflow-hidden rounded-md ring-1", styles.shell)}>
      <header className={cn("flex items-center justify-between gap-3 border-b px-3 py-2", styles.header)}>
        <span className={cn("font-mono text-[11px] font-semibold uppercase tracking-wider", styles.label)}>
          {label}
        </span>
        <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]", styles.badge)}>
          text
        </span>
      </header>
      <pre className={cn("whitespace-pre-wrap break-words px-3 py-3 font-mono text-xs leading-6", styles.body)}>
        <code>{value}</code>
      </pre>
    </section>
  );
}

function GuidanceCodeList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: GuidanceTone;
}) {
  const styles = guidanceToneStyles[tone];
  return (
    <section className={cn("overflow-hidden rounded-md ring-1", styles.shell)}>
      <header className={cn("flex items-center justify-between gap-3 border-b px-3 py-2", styles.header)}>
        <span className={cn("flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider", styles.label)}>
          <ListChecks className="size-3.5" aria-hidden />
          {label}
        </span>
        <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]", styles.badge)}>
          array[{items.length}]
        </span>
      </header>
      <ol className={cn("space-y-2 px-3 py-3", styles.body)}>
        {items.map((item, index) => {
          const itemNumber = String(index + 1).padStart(2, "0");
          return (
            <li key={`${label}-${item}`} className="grid grid-cols-[2rem_1fr] gap-2">
              <span className={cn("font-mono text-xs leading-6", styles.line)}>
                {itemNumber}
              </span>
              <code className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-ink-900">
                {item}
              </code>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type GuidanceTone = "slate" | "blue" | "amber" | "green" | "violet";

const guidanceToneStyles: Record<
  GuidanceTone,
  {
    shell: string;
    header: string;
    label: string;
    badge: string;
    body: string;
    line: string;
  }
> = {
  slate: {
    shell: "bg-slate-50 ring-slate-200",
    header: "border-slate-200 bg-slate-100/80",
    label: "text-slate-700",
    badge: "bg-paper text-slate-600 ring-1 ring-slate-200",
    body: "bg-paper text-slate-900",
    line: "text-slate-500",
  },
  blue: {
    shell: "bg-blue-50 ring-blue-100",
    header: "border-blue-100 bg-blue-50",
    label: "text-blue-700",
    badge: "bg-paper text-blue-700 ring-1 ring-blue-100",
    body: "bg-paper text-ink-900",
    line: "text-blue-500",
  },
  amber: {
    shell: "bg-amber-50 ring-amber-100",
    header: "border-amber-100 bg-amber-50",
    label: "text-amber-700",
    badge: "bg-paper text-amber-700 ring-1 ring-amber-100",
    body: "bg-paper text-ink-900",
    line: "text-amber-600",
  },
  green: {
    shell: "bg-green-50 ring-green-100",
    header: "border-green-100 bg-green-50",
    label: "text-green-700",
    badge: "bg-paper text-green-700 ring-1 ring-green-100",
    body: "bg-paper text-ink-900",
    line: "text-green-600",
  },
  violet: {
    shell: "bg-purple-50 ring-purple-100",
    header: "border-purple-100 bg-purple-50",
    label: "text-purple-700",
    badge: "bg-paper text-purple-700 ring-1 ring-purple-100",
    body: "bg-paper text-ink-900",
    line: "text-purple-600",
  },
};

function buildAssistantPrompt(prompt: string, manualIssues: string[]): string {
  const trimmedPrompt = prompt.trim();
  const manualBlock = manualIssues.length
    ? [
        "Manual issues added by the user:",
        ...manualIssues.map((issue, index) => `${index + 1}. ${issue}`),
        "Return reviewable code fixes and example commands for these manual issues first, while still using the selected scan context.",
      ].join("\n")
    : "";

  return [trimmedPrompt || "Generate a reviewable code fix preview for the selected scan.", manualBlock]
    .filter(Boolean)
    .join("\n\n");
}

function frameworkLabel(framework: string): string {
  return FRAMEWORKS.find((item) => item.id === framework)?.label ?? framework;
}

function buildFixCommandPreview({
  framework,
  manualIssues,
  selectedScan,
  result,
}: {
  framework: string;
  manualIssues: string[];
  selectedScan: AssistantScan | null;
  result: AiResult | null;
}): string[] {
  const scanFlag = selectedScan ? `--scan ${selectedScan.id}` : "--scan <selected-scan-id>";
  const frameworkFlag = `--framework "${frameworkLabel(framework)}"`;
  const issueSource =
    manualIssues.length > 0
      ? manualIssues
      : ["Use selected scan findings as the issue source."];

  return [
    `scope ${scanFlag} ${frameworkFlag}`,
    ...issueSource.map(
      (issue, index) =>
        `fix issue_${String(index + 1).padStart(2, "0")} --target "${issue}" --output reviewable-patch`
    ),
    result
      ? "preview generated_patch --compare before-after --review-required"
      : "preview starter_patch --compare before-after --review-required",
    `verify ${scanFlag} --keyboard --screen-reader-spot-check --rerun-scan`,
  ];
}

function starterPatchForFramework(framework: string): string {
  if (framework === "react") {
    return [
      'type AccessibleIconButtonProps = {',
      "  label: string;",
      "  onClick: () => void;",
      "  icon: React.ReactNode;",
      "};",
      "",
      "export function AccessibleIconButton({ label, onClick, icon }: AccessibleIconButtonProps) {",
      "  return (",
      "    <button type=\"button\" aria-label={label} onClick={onClick}>",
      "      <span aria-hidden=\"true\">{icon}</span>",
      "    </button>",
      "  );",
      "}",
    ].join("\n");
  }

  if (framework === "shopify") {
    return [
      "<button type=\"button\" aria-label=\"Open cart\">",
      "  {% render 'icon-cart' %}",
      "</button>",
    ].join("\n");
  }

  if (framework === "wordpress") {
    return [
      "<button type=\"button\" aria-label=\"Open menu\">",
      "  <span aria-hidden=\"true\" class=\"icon-menu\"></span>",
      "</button>",
    ].join("\n");
  }

  return [
    "<button type=\"button\" aria-label=\"Open menu\">",
    "  <svg aria-hidden=\"true\" focusable=\"false\"></svg>",
    "</button>",
  ].join("\n");
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
