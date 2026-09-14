"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { trackClientEvent } from "@/lib/analytics/client";
import { useLanguage } from "@/components/i18n/LanguageProvider";

interface PublicCheckResult {
  url: string;
  title: string | null;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  issueCounts: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    review: number;
  };
  wcagIssueCount: number;
  topFindings: Array<{
    ruleId: string;
    impact: "critical" | "serious" | "moderate" | "minor";
    help: string;
  }>;
  limitations: string[];
}

type CheckState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: PublicCheckResult }
  | { status: "error"; message: string };

export function PublicCheckForm() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<CheckState>({ status: "idle" });
  // All copy goes through React state (never the DOM-mutating i18n
  // observer): every keystroke and status change re-renders this form, and
  // provider-mutated text nodes diverge from React's virtual DOM and throw
  // hydration #418. data-i18n-skip keeps the observer off this subtree.
  const { t } = useLanguage();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim() || state.status === "loading") return;
    setState({ status: "loading" });
    trackClientEvent({ event: "public_scan_started", properties: { source: "landing" } });

    try {
      const response = await fetch("/api/public-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = (await response.json().catch(() => ({}))) as
        | PublicCheckResult
        | { message?: string };

      if (!response.ok) {
        setState({
          status: "error",
          message:
            "message" in body && body.message
              ? body.message
              : "We couldn't check that page. Try a different public URL.",
        });
        return;
      }

      setState({ status: "success", result: body as PublicCheckResult });
    } catch {
      setState({
        status: "error",
        message: "The instant checker is unreachable. Please try again.",
      });
    }
  }

  return (
    <div className="mt-9 max-w-[680px] border border-rule bg-canvas-2" data-i18n-skip>
      <form onSubmit={submit} className="p-4 sm:p-5">
        <label htmlFor="public-check-url" className="block text-sm font-bold text-navy-900">
          {t("Check one public page — no account required")}
        </label>
        <p id="public-check-hint" className="mt-1 text-xs leading-relaxed text-ink-600">
          {t("Fast initial-HTML preview. No screenshots, no stored result.")}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            id="public-check-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-describedby="public-check-hint public-check-status"
            disabled={state.status === "loading"}
            required
            className="min-h-12 w-full border border-rule bg-paper px-4 text-sm text-ink-900 placeholder:text-ink-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!url.trim() || state.status === "loading"}
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-navy-900 px-6 text-sm font-bold text-paper hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.status === "loading" ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> {t("Checking…")}
              </>
            ) : (
              <>
                {t("Check page")} <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </form>

      <div id="public-check-status" aria-live="polite" aria-atomic="true">
        {state.status === "error" && (
          <p className="border-t border-rule bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 sm:px-5">
            {t(state.message)}
          </p>
        )}
        {state.status === "success" && <CheckResult result={state.result} />}
      </div>
    </div>
  );
}

function CheckResult({ result }: { result: PublicCheckResult }) {
  const { t, locale } = useLanguage();
  const findingCount =
    result.issueCounts.critical +
    result.issueCounts.serious +
    result.issueCounts.moderate +
    result.issueCounts.minor +
    result.issueCounts.review;

  return (
    <section className="border-t border-rule bg-paper" aria-label={t("Instant check result")}>
      <div className="grid grid-cols-[104px_1fr] sm:grid-cols-[128px_1fr]">
        <div className="flex flex-col items-center justify-center border-r border-rule bg-navy-900 px-3 py-6 text-paper">
          <span className="text-4xl font-extrabold leading-none tabular-nums">{result.score}</span>
          <span className="mt-2 text-center font-mono text-[10px] uppercase leading-tight tracking-wider">
            {t("Automated")}
            <br />
            {t("score")}
          </span>
          {/* Scope belongs next to the number. A bare 100 reads as "your site
              is fine" when it means "nothing was found in one HTML response". */}
          <span className="mt-1.5 text-center font-mono text-[9px] uppercase leading-tight tracking-wider text-paper/70">
            {t("initial")}
            <br />
            {t("HTML only")}
          </span>
        </div>
        <div className="min-w-0 px-4 py-5 sm:px-5">
          <p className="truncate font-mono text-xs text-ink-600">{result.url}</p>
          <p className="mt-2 text-lg font-bold text-navy-900">
            {findingCount === 0
              ? t("No issues found in the first HTML response")
              : <>{findingCount} {t("preliminary")} {locale === "en"
                  // English pluralizes the noun; Turkish keeps the singular
                  // after numerals ("6 ön bulgu", never "bulgular").
                  ? (findingCount === 1 ? "finding" : "findings")
                  : t("finding")}</>}
          </p>
          {findingCount === 0 ? (
            <p className="mt-1 text-xs leading-relaxed text-ink-600">
              {t("That is not the same as an accessible site: the checks this preview could not run are listed below.")}
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-ink-600">
              {result.issueCounts.critical} {t("critical")} · {result.issueCounts.serious} {t("serious")} ·{" "}
              {result.issueCounts.review} {t("review")}
            </p>
          )}
        </div>
      </div>

      {result.topFindings.length > 0 && (
        <ul className="border-t border-rule divide-y divide-rule">
          {result.topFindings.slice(0, 3).map((finding) => (
            <li key={`${finding.ruleId}-${finding.help}`} className="flex gap-3 px-4 py-3 text-sm sm:px-5">
              <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase text-rose-700">
                {finding.impact}
              </span>
              <span className="text-ink-700">{finding.help}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-rule bg-canvas-2 px-4 py-4 sm:px-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
          {t("What this check did not cover")}
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-600">
          {result.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
        <Link
          href={`/onboarding?url=${encodeURIComponent(result.url)}`}
          className="mt-3 inline-flex min-h-11 items-center gap-2 bg-blue-600 px-5 text-sm font-bold text-paper hover:bg-blue-700"
        >
          {t("Run the full scan")} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
