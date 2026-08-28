"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  Globe,
  Loader2,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { SeverityBadge, type Severity } from "@/components/scan/SeverityBadge";
import { AiSuggestionBlock } from "@/components/ai/AiSuggestionBlock";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { ASSISTANT_PRESETS } from "@/lib/ai/presets";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { cn } from "@/lib/utils";

const FRAMEWORKS = [
  { id: "React / Next.js", label: "React / Next.js" },
  { id: "HTML / CSS", label: "HTML / CSS" },
  { id: "Shopify Liquid", label: "Shopify Liquid" },
  { id: "WordPress", label: "WordPress" },
  { id: "Webflow", label: "Webflow" },
  { id: "Framer", label: "Framer" },
];

interface ScanSummary {
  id: string;
  baseUrl: string;
  pagesScanned: number;
  status: string;
  completedAt: string | null;
  createdAt: string;
}

interface IssueSummary {
  id: string;
  ruleId: string;
  severity: string;
  help: string;
}

/** All completed scans for one host, newest first. */
interface SiteProject {
  host: string;
  scans: ScanSummary[];
  latest: ScanSummary;
  totalPages: number;
}

interface BriefResult {
  title: string;
  filename: string;
  markdown: string;
  modelProvider: string;
  rulesAnalyzed: number;
}

export default function AiAssistantPage() {
  const [scansLoading, setScansLoading] = useState(true);
  const [projects, setProjects] = useState<SiteProject[]>([]);
  const [activeHost, setActiveHost] = useState<string | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);

  const [issues, setIssues] = useState<IssueSummary[] | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(false);

  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [preset, setPreset] = useState<string>(ASSISTANT_PRESETS[0].id);
  const [framework, setFramework] = useState(FRAMEWORKS[0].id);
  const [prompt, setPrompt] = useState("");
  const [consent, setConsent] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BriefResult | null>(null);

  // --- Load the workspace's scans and group them per site ------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/scans?limit=50");
        if (!res.ok) return;
        const data = await res.json();
        const completed: ScanSummary[] = (data.scans ?? []).filter(
          (s: ScanSummary) => s.status === "completed"
        );
        const grouped = groupByHost(completed);
        if (cancelled) return;
        setProjects(grouped);
        if (grouped[0]) {
          setActiveHost(grouped[0].host);
          setActiveScanId(grouped[0].latest.id);
        }
      } catch {
        // Network failures leave the empty state in place; the user can
        // reload. Nothing here is destructive.
      } finally {
        if (!cancelled) setScansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Workspace AI consent gate -------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/privacy/settings");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAiEnabled(Boolean(data.settings?.aiProcessingEnabled));
      } catch {
        if (!cancelled) setAiEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Compiled findings for the selected scan -----------------------
  useEffect(() => {
    // No scan selected yet — `issues` is already null, so there is
    // nothing to clear and nothing to fetch.
    if (!activeScanId) return;
    let cancelled = false;
    (async () => {
      setIssuesLoading(true);
      try {
        const res = await fetch(`/api/scans/${activeScanId}/issues`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setIssues(data.issues ?? []);
      } catch {
        if (!cancelled) setIssues([]);
      } finally {
        if (!cancelled) setIssuesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeScanId]);

  const activeProject = useMemo(
    () => projects.find((p) => p.host === activeHost) ?? null,
    [projects, activeHost]
  );

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {
      critical: 0,
      moderate: 0,
      minor: 0,
      review: 0,
    };
    for (const issue of issues ?? []) {
      if (issue.severity in counts) counts[issue.severity] += 1;
    }
    return counts;
  }, [issues]);

  /** Distinct failing rules — the unit of work the brief plans around. */
  const distinctRules = useMemo(
    () => new Set((issues ?? []).map((i) => i.ruleId)).size,
    [issues]
  );

  function selectProject(project: SiteProject) {
    setActiveHost(project.host);
    setActiveScanId(project.latest.id);
    setResult(null);
    setError(null);
  }

  async function generate() {
    if (!activeScanId || !consent || generating) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai-assistant/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scanId: activeScanId,
          preset,
          framework,
          prompt: prompt.trim() || undefined,
          consentChecked: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "ai_disabled") {
          setAiEnabled(false);
          setError(
            "AI processing is disabled for this workspace. Enable it in the Privacy & Compliance Center."
          );
        } else if (data.error === "ai_unavailable") {
          setError(
            "AI integration is not configured for this deployment. Contact your workspace administrator."
          );
        } else if (data.error === "rate_limited") {
          setError("Too many briefs generated recently. Try again shortly.");
        } else {
          setError(data.message ?? "Could not generate the brief.");
        }
        return;
      }
      setResult(data as BriefResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  /**
   * Hand the brief over as a real file. The markdown never needs to
   * round-trip through the server again, so this is a pure client-side
   * blob download.
   */
  const downloadMarkdown = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [result]);

  const canGenerate = Boolean(activeScanId) && consent && !generating && aiEnabled !== false;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1400px]">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="size-3.5 text-purple-600" aria-hidden /> AI Fix Assistant
        </p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Turn a site&apos;s findings into a build brief
        </h1>
        <p className="text-sm text-ink-600 mt-1 max-w-2xl">
          Pick one of your scanned sites, choose what you need, and the assistant compiles its
          findings into a Markdown brief you can download and hand to your editor, your coding
          agent, or your team.
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
          <li>
            It reports approximate figures — automated checks see only part of the picture.
          </li>
        </ul>
      </AlertCallout>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Projects — one entry per scanned site */}
        <aside className="space-y-4 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="size-4 text-ink-500" aria-hidden /> Your sites
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scansLoading ? (
                <p className="text-xs text-ink-500 flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> Loading scans…
                </p>
              ) : projects.length === 0 ? (
                <div className="text-xs text-ink-600 leading-relaxed">
                  <p>No completed scans yet.</p>
                  <Link
                    href="/app/scans/new"
                    className="inline-flex items-center gap-1.5 mt-3 h-9 px-3 rounded-md bg-navy-900 text-paper text-xs font-medium hover:bg-navy-800"
                  >
                    Start a scan
                  </Link>
                </div>
              ) : (
                <ul className="space-y-1.5" aria-label="Scanned sites">
                  {projects.map((project) => {
                    const active = project.host === activeHost;
                    return (
                      <li key={project.host}>
                        <button
                          type="button"
                          onClick={() => selectProject(project)}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-md ring-1 transition-colors min-h-[52px]",
                            active
                              ? "bg-navy-900 text-paper ring-navy-900"
                              : "bg-paper ring-line hover:bg-canvas-2"
                          )}
                        >
                          <span className="block text-sm font-medium truncate">
                            {project.host}
                          </span>
                          <span
                            className={cn(
                              "block text-[11px] mt-0.5",
                              active ? "text-paper/70" : "text-ink-500"
                            )}
                          >
                            {project.scans.length} scan(s) · {project.totalPages} pages
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {activeProject && activeProject.scans.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Scan to work from</CardTitle>
              </CardHeader>
              <CardContent>
                <label htmlFor="scan-pick" className="sr-only">
                  Scan for {activeProject.host}
                </label>
                <select
                  id="scan-pick"
                  value={activeScanId ?? ""}
                  onChange={(e) => {
                    setActiveScanId(e.target.value);
                    setResult(null);
                  }}
                  className="w-full rounded-md ring-1 ring-line bg-paper px-3 py-2 text-sm"
                >
                  {activeProject.scans.map((scan) => (
                    <option key={scan.id} value={scan.id}>
                      {formatScanDate(scan)} · {scan.pagesScanned} pages
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What do you need?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {ASSISTANT_PRESETS.map((p) => {
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
                            ? "bg-purple-50 text-purple-700 ring-1 ring-purple-100"
                            : "text-ink-700 hover:bg-canvas-2"
                        )}
                      >
                        <FileText
                          className={cn(
                            "size-4 shrink-0",
                            active ? "text-purple-600" : "text-ink-500"
                          )}
                          aria-hidden
                        />
                        <span>{p.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </aside>

        {/* Working column */}
        <div className="space-y-5 min-w-0">
          {aiEnabled === false && (
            <AlertCallout tone="info" icon={Sparkles} title="AI processing is disabled">
              Enable AI in the{" "}
              <Link href="/app/compliance" className="underline font-medium">
                Privacy &amp; Compliance Center
              </Link>{" "}
              to generate briefs from your scan findings.
            </AlertCallout>
          )}

          {/* Compiled findings for the selected site */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {activeProject
                  ? `Compiled findings — ${activeProject.host}`
                  : "Compiled findings"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!activeScanId ? (
                <p className="text-sm text-ink-600">
                  Select a site to load the findings the assistant will work from.
                </p>
              ) : issuesLoading ? (
                <p className="text-xs text-ink-500 flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> Compiling findings…
                </p>
              ) : (issues?.length ?? 0) === 0 ? (
                <p className="text-sm text-ink-600">
                  Automated checks did not record findings for this scan. Human review may still
                  uncover issues.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(["critical", "moderate", "minor", "review"] as const).map((sev) =>
                      severityCounts[sev] > 0 ? (
                        <span key={sev} className="inline-flex items-center gap-1.5">
                          <SeverityBadge severity={sev as Severity} size="sm" />
                          <span className="text-xs text-ink-600 tabular-nums">
                            {severityCounts[sev]}
                          </span>
                        </span>
                      ) : null
                    )}
                  </div>
                  <p className="text-xs text-ink-500 mt-3">
                    {issues?.length} finding(s) across {distinctRules} distinct rule(s). The
                    assistant groups them by rule, so a rule failing on many pages is planned as
                    one piece of work.
                  </p>
                  <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                    {topRules(issues ?? []).map((rule) => (
                      <li
                        key={rule.ruleId}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="font-mono text-ink-700 truncate">{rule.ruleId}</span>
                        <span className="text-ink-500 shrink-0 tabular-nums">
                          {rule.count}×
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          {/* Prompt bar */}
          <Card>
            <CardContent className="pt-5">
              <label htmlFor="ai-prompt" className="block text-sm font-medium text-ink-700 mb-2">
                Anything specific? (optional)
              </label>
              <textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="e.g. We ship the checkout first — plan around that, and skip the marketing pages."
                className="w-full rounded-md bg-paper px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-line shadow-[var(--shadow-soft)] placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
              />

              <fieldset className="mt-4">
                <legend className="text-xs font-medium text-ink-700 mb-1.5">
                  Target stack
                </legend>
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
              </fieldset>

              <div className="my-4">
                <Checkbox
                  id="ai-consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  label="I understand AI output may be incorrect and will be reviewed before use."
                />
              </div>

              {error && (
                <AlertCallout tone="danger" icon={AlertCircle} className="mb-3">
                  {error}
                </AlertCallout>
              )}

              <button
                type="button"
                onClick={generate}
                disabled={!canGenerate}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-purple-500 text-paper text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Researching &amp;
                    planning…
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden /> Generate brief
                  </>
                )}
              </button>

              <p className="text-[11px] text-ink-500 mt-3 leading-relaxed">
                {COMPLIANCE_COPY.AI_DISCLOSURE}
              </p>
            </CardContent>
          </Card>

          {/* Result */}
          {generating && (
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm text-ink-600 flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-purple-600" aria-hidden />
                  Reading the findings and drafting the brief. This can take a minute for a
                  large scan.
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="ai" size="sm">
                    {result.modelProvider === "mock" ? "Mock output" : "AI generated"}
                  </Badge>
                  <span className="text-xs text-ink-500">
                    {result.rulesAnalyzed} rule(s) analysed
                  </span>
                </div>
                <button
                  type="button"
                  onClick={downloadMarkdown}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
                >
                  <Download className="size-4" aria-hidden /> Download .md
                </button>
              </div>

              <AiSuggestionBlock title={result.title}>
                <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-ink-800">
                  {result.markdown}
                </pre>
              </AiSuggestionBlock>

              <p className="text-xs text-ink-500">
                Saved as{" "}
                <code className="font-mono text-ink-700">{result.filename}</code> when you
                download it.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Group completed scans by host so the page presents one project per
 * site rather than a flat list of scan runs.
 */
function groupByHost(scans: ScanSummary[]): SiteProject[] {
  const byHost = new Map<string, ScanSummary[]>();
  for (const scan of scans) {
    const host = hostFromUrl(scan.baseUrl);
    const list = byHost.get(host);
    if (list) list.push(scan);
    else byHost.set(host, [scan]);
  }

  return [...byHost.entries()]
    .map(([host, list]) => {
      const sorted = [...list].sort(
        (a, b) => scanTime(b) - scanTime(a)
      );
      return {
        host,
        scans: sorted,
        latest: sorted[0],
        totalPages: sorted.reduce((sum, s) => sum + (s.pagesScanned ?? 0), 0),
      };
    })
    .sort((a, b) => scanTime(b.latest) - scanTime(a.latest));
}

function scanTime(scan: ScanSummary): number {
  return new Date(scan.completedAt ?? scan.createdAt).getTime();
}

function formatScanDate(scan: ScanSummary): string {
  return new Date(scan.completedAt ?? scan.createdAt).toLocaleDateString();
}

/** The rules failing most often — the shortlist the brief opens with. */
function topRules(issues: IssueSummary[]): { ruleId: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    counts.set(issue.ruleId, (counts.get(issue.ruleId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([ruleId, count]) => ({ ruleId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
