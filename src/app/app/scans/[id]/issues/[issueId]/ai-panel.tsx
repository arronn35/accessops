"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { AiSuggestionBlock } from "@/components/ai/AiSuggestionBlock";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { Checkbox } from "@/components/ui/Checkbox";
import { CodeDiffBlock } from "@/components/ai/CodeDiffBlock";
import { aiErrorToView, type AiErrorView } from "@/lib/ai/error-messages";

interface InitialAi {
  explanationPlain: string;
  remediationSummary: string | null;
  codeFixExample: string | null;
  verification: string | null;
  framework: string | null;
  modelProvider: string;
  createdAt: string;
}

export function AiExplanationPanel({
  scanId,
  issueId,
  initial,
  aiEnabled,
  htmlSnippet,
}: {
  scanId: string;
  issueId: string;
  initial: InitialAi | null;
  aiEnabled: boolean;
  htmlSnippet: string | null;
}) {
  const [current, setCurrent] = useState(initial);
  const [framework, setFramework] = useState<string>(initial?.framework || "react");
  const [outputAcknowledged, setOutputAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AiErrorView | null>(null);

  async function generate() {
    if (!outputAcknowledged || !aiEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueId}/ai-explanation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanJobId: scanId, framework, consentChecked: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          aiErrorToView(
            typeof body.error === "string" ? body.error : "",
            typeof body.retryAfterSeconds === "number" ? body.retryAfterSeconds : undefined
          )
        );
        return;
      }
      const { aiExplanation } = body;
      setCurrent({
        explanationPlain: aiExplanation.explanationPlain,
        remediationSummary: aiExplanation.remediationSummary ?? null,
        codeFixExample: aiExplanation.codeFixExample ?? null,
        verification: aiExplanation.verification ?? null,
        framework: aiExplanation.framework,
        modelProvider: aiExplanation.modelProvider,
        createdAt: aiExplanation.createdAt,
      });
    } catch {
      setError(aiErrorToView("network_error"));
    } finally {
      setLoading(false);
    }
  }

  if (current) {
    return (
      <AiFixCard
        ai={current}
        htmlSnippet={htmlSnippet}
        onRegenerate={aiEnabled ? () => setCurrent(null) : undefined}
      />
    );
  }

  if (!aiEnabled) {
    return (
      <AlertCallout
        tone="info"
        icon={Sparkles}
        title="AI explanations are unavailable"
      >
        Enable AI in{" "}
        <Link href="/app/compliance" className="underline font-medium">
          Privacy &amp; Compliance Center
        </Link>{" "}
        and start a scan with AI explanations turned on to get plain-language
        explanations and remediation drafts for each finding.
      </AlertCallout>
    );
  }

  return (
    <div className="rounded-lg ring-1 ring-purple-100 bg-purple-50/30 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-purple-600" aria-hidden />
        <h3 className="text-sm font-semibold text-purple-700">Generate AI explanation</h3>
      </div>
      <p className="text-sm text-ink-700 leading-relaxed mb-4">
        Get a plain-language explanation and a framework-aware code fix. AI suggestions must be
        reviewed before implementation.
      </p>

      <label htmlFor="ai-fw" className="block text-xs font-medium text-ink-700 mb-1.5">
        Target framework
      </label>
      <select
        id="ai-fw"
        value={framework}
        onChange={(e) => setFramework(e.target.value)}
        className="w-full max-w-xs rounded-md bg-paper px-3 py-2 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
      >
        <option value="react">React / Next.js</option>
        <option value="html">HTML / CSS</option>
        <option value="shopify">Shopify Liquid</option>
        <option value="wordpress">WordPress</option>
        <option value="webflow">Webflow</option>
        <option value="framer">Framer</option>
      </select>

      <div className="my-3">
        <Checkbox
          checked={outputAcknowledged}
          onChange={(e) => setOutputAcknowledged(e.target.checked)}
          label="I understand AI output may be incorrect and will be reviewed before use."
        />
      </div>

      {error && (
        <AlertCallout tone="danger" title={error.title} className="mb-3">
          {error.message}
          {typeof error.action === "object" && (
            <>
              {" "}
              <Link href={error.action.href} className="underline font-medium">
                {error.action.label}
              </Link>
            </>
          )}
        </AlertCallout>
      )}

      <button
        onClick={generate}
        disabled={!outputAcknowledged || loading}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-purple-500 text-paper text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
        {loading ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}

function AiFixCard({
  ai,
  htmlSnippet,
  onRegenerate,
}: {
  ai: InitialAi;
  htmlSnippet: string | null;
  onRegenerate?: () => void;
}) {
  const [mode, setMode] = useState<"plain" | "technical">("plain");
  const hasTechnical = Boolean(ai.codeFixExample || ai.remediationSummary || ai.verification);

  return (
    <AiSuggestionBlock title={`AI fix card · ${ai.modelProvider}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        {hasTechnical ? (
          <div
            role="tablist"
            aria-label="Explanation detail level"
            className="inline-flex rounded-md ring-1 ring-line bg-paper p-0.5 text-xs"
          >
            <button
              role="tab"
              aria-selected={mode === "plain"}
              onClick={() => setMode("plain")}
              className={`px-2.5 py-1 rounded ${mode === "plain" ? "bg-purple-500 text-paper font-medium" : "text-ink-600 hover:text-ink-900"}`}
            >
              Plain language
            </button>
            <button
              role="tab"
              aria-selected={mode === "technical"}
              onClick={() => setMode("technical")}
              className={`px-2.5 py-1 rounded ${mode === "technical" ? "bg-purple-500 text-paper font-medium" : "text-ink-600 hover:text-ink-900"}`}
            >
              Developer
            </button>
          </div>
        ) : (
          <span />
        )}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="text-xs font-medium text-purple-700 hover:underline"
          >
            Regenerate
          </button>
        )}
      </div>

      {mode === "plain" || !hasTechnical ? (
        <p className="whitespace-pre-wrap">{ai.explanationPlain}</p>
      ) : (
        <div className="space-y-4">
          {ai.remediationSummary && (
            <FixSection label="Recommended fix">
              <p className="whitespace-pre-wrap">{ai.remediationSummary}</p>
            </FixSection>
          )}
          {ai.codeFixExample && (
            <FixSection label="Remediation patch draft">
              <CodeDiffBlock
                before={
                  htmlSnippet
                    ? {
                        label: "Failing HTML snippet",
                        language: ai.framework === "react" ? "tsx" : "html",
                        code: htmlSnippet,
                      }
                    : undefined
                }
                after={{
                  label: `Suggested Fix${ai.framework ? ` (${ai.framework})` : ""}`,
                  language: ai.framework === "react" ? "tsx" : "html",
                  code: ai.codeFixExample,
                }}
              />
            </FixSection>
          )}
          {ai.verification && (
            <FixSection label="How to verify">
              <p className="whitespace-pre-wrap">{ai.verification}</p>
            </FixSection>
          )}
        </div>
      )}
    </AiSuggestionBlock>
  );
}

function FixSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-1.5">
        {label}
      </h5>
      {children}
    </div>
  );
}
