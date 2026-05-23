"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { AiSuggestionBlock } from "@/components/ai/AiSuggestionBlock";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { Checkbox } from "@/components/ui/Checkbox";

interface InitialAi {
  explanationPlain: string;
  framework: string | null;
  modelProvider: string;
  createdAt: string;
}

export function AiExplanationPanel({
  issueId,
  initial,
  aiEnabled,
}: {
  issueId: string;
  initial: InitialAi | null;
  aiEnabled: boolean;
}) {
  const [current, setCurrent] = useState(initial);
  const [framework, setFramework] = useState<string>("react");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!consent || !aiEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueId}/ai-explanation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ framework, consentChecked: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "ai_disabled") {
          setError(
            "AI processing is disabled. Enable it in Privacy & Compliance Center."
          );
        } else if (body.error === "ai_unavailable") {
          setError(
            "AI integration is not configured for this deployment. Contact your workspace administrator."
          );
        } else {
          setError(body.message ?? "Could not generate explanation.");
        }
        return;
      }
      const { aiExplanation } = await res.json();
      setCurrent({
        explanationPlain: aiExplanation.explanationPlain,
        framework: aiExplanation.framework,
        modelProvider: aiExplanation.modelProvider,
        createdAt: aiExplanation.createdAt,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (current) {
    return (
      <AiSuggestionBlock title={`AI explanation · ${current.modelProvider}`}>
        <p className="whitespace-pre-wrap">{current.explanationPlain}</p>
      </AiSuggestionBlock>
    );
  }

  if (!aiEnabled) {
    return (
      <AlertCallout
        tone="info"
        icon={Sparkles}
        title="AI processing is disabled"
      >
        Enable AI in{" "}
        <Link href="/app/compliance" className="underline font-medium">
          Privacy &amp; Compliance Center
        </Link>{" "}
        to get plain-language explanations and remediation drafts for each finding.
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
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          label="I understand AI output may be incorrect and will be reviewed before use."
        />
      </div>

      {error && (
        <AlertCallout tone="danger" className="mb-3">
          {error}
        </AlertCallout>
      )}

      <button
        onClick={generate}
        disabled={!consent || loading}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-purple-500 text-paper text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
        {loading ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
