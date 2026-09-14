"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRight, Globe, Loader2, Sparkles, AlertCircle, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Checkbox } from "@/components/ui/Checkbox";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import {
  estimateScanPlan,
  ANALYSIS_PASSES_PER_VIEWPORT,
} from "@/lib/scanner/estimate";
import { SCAN_INTERACTIVE_STATES } from "@/lib/scanner/types";
import { cn } from "@/lib/utils";
import { safePublicScanUrl } from "@/lib/navigation/scan-handoff";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const SCAN_TYPES = [
  { id: "single", label: "Single page", description: "Scan one URL." },
  { id: "multi", label: "Multi-page crawl", description: "Follow same-domain links up to the page limit." },
  { id: "sitemap", label: "Sitemap scan", description: "Crawl URLs listed in /sitemap.xml or a sitemap URL." },
  { id: "manual", label: "Manual URL list", description: "Scan a specific same-origin URL list." },
] as const;

export default function NewScanPage() {
  // Rendered copy goes through React state (never the DOM-mutating i18n
  // observer): this component re-renders on navigation state changes, and
  // provider-mutated text nodes diverge from React's virtual DOM and throw
  // hydration #418. data-i18n-skip keeps the observer off this subtree entirely.
  const { t } = useLanguage();
  return (
    <span data-i18n-skip className="contents">
      <Suspense fallback={<div className="px-4 py-8 text-sm text-ink-600 lg:px-8">{t("Preparing scan…")}</div>}>
        <NewScanForm />
      </Suspense>
    </span>
  );
}

function NewScanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState(() => safePublicScanUrl(searchParams.get("url")) ?? "");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [manualUrls, setManualUrls] = useState("");
  const [type, setType] = useState<"single" | "multi" | "sitemap" | "manual">("single");
  const [maxPages, setMaxPages] = useState(3);
  const [permission, setPermission] = useState(false);
  const [aiExplain, setAiExplain] = useState(false);
  const [screenshots, setScreenshots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Rendered copy goes through React state (never the DOM-mutating i18n
  // observer): this form re-renders on every keystroke, and provider-mutated
  // text nodes diverge from React's virtual DOM and throw hydration #418.
  // data-i18n-skip keeps the observer off this subtree entirely.
  const { t } = useLanguage();

  const parsedManualUrls = manualUrls
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const canSubmit =
    url.trim().length > 0 &&
    permission &&
    !submitting &&
    (type !== "manual" || parsedManualUrls.length > 0);

  // Estimated scope shown before the user commits, so the cost of a
  // multi-page + screenshots run is never a surprise. Derived from the SAME
  // shared plan the worker executes (no 18-vs-33 drift).
  const plan = estimateScanPlan({
    scanType: type,
    maxPages,
    manualUrlCount: parsedManualUrls.length,
    includeScreenshots: screenshots,
  });
  const {
    pages: estimatedPages,
    viewports: VIEWPORT_COUNT,
    passesPerPage,
    totalPasses,
    estLabel,
  } = plan;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          scanType: type,
          urls: type === "manual" ? parsedManualUrls : undefined,
          sitemapUrl: type === "sitemap" && sitemapUrl.trim() ? sitemapUrl.trim() : undefined,
          maxPages,
          includeScreenshots: screenshots,
          storeScreenshots: screenshots,
          aiExplanationsEnabled: aiExplain,
          aiRemediationEnabled: aiExplain,
          permissionConfirmed: true,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        setError(
          body.message ??
            errorMessage(body.error) ??
            "We couldn't start the scan. Try again."
        );
        return;
      }
      const { scanJobId } = (await res.json()) as { scanJobId: string };
      router.push(`/app/scans/${scanJobId}/progress`);
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 lg:px-8 py-8 max-w-3xl" data-i18n-skip>
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">{t("New scan")}</p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">{t("Start a scan")}</h1>
        <p className="text-sm text-ink-600 mt-1 max-w-xl">
          {t("We'll run automated accessibility checks and capture findings. Visual evidence screenshots are off by default. AI explanations require workspace consent.")}
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("What to scan")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="url" required>{t("Website URL")}</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-500" aria-hidden />
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-9"
                  autoComplete="url"
                  required
                />
              </div>
              <FieldHint>
                {t("Public URL with https:// scheme. We block private and internal addresses.")}
              </FieldHint>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-ink-700 mb-2">{t("Scan type")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {SCAN_TYPES.map((scanType) => {
                  const active = type === scanType.id;
                  return (
                    <label
                      key={scanType.id}
                      className={cn(
                        "rounded-md p-3 ring-1 bg-paper transition-colors text-sm",
                        "cursor-pointer",
                        active ? "ring-2 ring-navy-900" : "ring-line hover:bg-canvas-2",
                      )}
                    >
                      <input
                        type="radio"
                        name="scan-type"
                        className="sr-only"
                        checked={active}
                        onChange={() => setType(scanType.id)}
                      />
                      <p className="font-medium text-ink-900">{t(scanType.label)}</p>
                      <p className="text-xs text-ink-600 mt-1 leading-snug">{t(scanType.description)}</p>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {type === "sitemap" && (
              <div>
                <Label htmlFor="sitemap-url">{t("Sitemap URL")}</Label>
                <div className="relative">
                  <ListChecks className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-500" aria-hidden />
                  <Input
                    id="sitemap-url"
                    type="url"
                    placeholder={`${safeOrigin(url)}/sitemap.xml`}
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <FieldHint>
                  {t("Optional. Leave blank to use /sitemap.xml on the website URL origin.")}
                </FieldHint>
              </div>
            )}

            {type === "manual" && (
              <div>
                <Label htmlFor="manual-urls" required>{t("Manual URLs")}</Label>
                <textarea
                  id="manual-urls"
                  value={manualUrls}
                  onChange={(e) => setManualUrls(e.target.value)}
                  rows={6}
                  placeholder={`${safeOrigin(url)}/\n${safeOrigin(url)}/pricing\n${safeOrigin(url)}/contact`}
                  className="w-full rounded-md bg-paper px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-line shadow-[var(--shadow-soft)] placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition font-mono"
                  required
                />
                <FieldHint>
                  {t("One URL per line. URLs must be public and on the same origin as the website URL.")}
                </FieldHint>
              </div>
            )}

            <div>
              <Label htmlFor="max-pages">{t("Max pages")}</Label>
              <Input
                id="max-pages"
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                min={1}
                max={1000}
              />
              <FieldHint>
                {t("Free plan: up to 3 pages. Starter and above raise the cap.")}
              </FieldHint>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" aria-hidden /> {t("AI & capture options")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-line">
            <div className="pb-4">
              <Switch
                checked={aiExplain}
                onChange={(e) => setAiExplain(e.target.checked)}
                label={t("AI explanations & remediation")}
                description={t("Generate plain-language explanations and code fixes for each finding. Requires workspace AI consent.")}
              />
            </div>
            <div className="pt-4">
              <Switch
                checked={screenshots}
                onChange={(e) => setScreenshots(e.target.checked)}
                label={
                  <span className="flex items-center gap-2">
                    {t("Capture visual evidence screenshots")}
                    <span className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
                      {t("Off by default")}
                    </span>
                  </span>
                }
                description={t("Screenshots help identify where accessibility issues appear. They may contain visible page content, so enable this only for websites you are authorized to audit.")}
              />
              <p className="text-xs text-ink-500 mt-3 leading-relaxed">
                {t(COMPLIANCE_COPY.SCREENSHOT_NOTICE)}
              </p>
            </div>
          </CardContent>
        </Card>

        <AlertCallout tone="warning" title={t("Privacy notice")}>
          {t(COMPLIANCE_COPY.SCAN_PRIVACY)}
        </AlertCallout>

        <Card>
          <CardContent className="pt-5">
            <Checkbox
              checked={permission}
              onChange={(e) => setPermission(e.target.checked)}
              label={<span className="font-medium">{t(COMPLIANCE_COPY.SCAN_PERMISSION)}</span>}
              description={t("By starting this scan you confirm you have authorization from the site owner.")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-4 text-ink-500" aria-hidden /> {t("Estimated scope")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ScopeStat t={t} label="Pages" value={`${estimatedPages}`} />
              <ScopeStat t={t} label="Viewports" value={`${VIEWPORT_COUNT}`} hint={t("Desktop · Tablet · Mobile")} />
              <ScopeStat t={t} label="Analysis passes" value={`${totalPasses}`} hint={t("{count}/page", { count: passesPerPage })} />
              <ScopeStat t={t} label="Est. time" value={`~${estLabel}`} hint={screenshots ? t("incl. screenshots") : undefined} />
            </div>
            <p className="text-xs text-ink-500 mt-3 leading-relaxed">
              {t("Each page is analysed across")} {VIEWPORT_COUNT} {t("viewports and")} {SCAN_INTERACTIVE_STATES.length} {t("interactive states")} ({ANALYSIS_PASSES_PER_VIEWPORT} {t("passes per viewport")}). {t("Page count may be lower if the crawler finds fewer same-domain links. Time is a rough estimate, not a guarantee.")}
            </p>
          </CardContent>
        </Card>

        <NoGuaranteeBanner variant="compact" />

        {error && (
          <AlertCallout tone="danger" icon={AlertCircle} title={t("Couldn't start scan")}>
            {t(error)}
          </AlertCallout>
        )}

        <div className="flex items-center justify-between pt-2">
          <Link href="/app" className="text-sm text-ink-600 hover:text-ink-900">
            {t("← Cancel")}
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "inline-flex items-center gap-2 h-11 px-5 rounded-md text-sm font-medium transition-colors",
              canSubmit
                ? "bg-navy-900 text-paper hover:bg-navy-800"
                : "bg-canvas-2 text-ink-400 cursor-not-allowed"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> {t("Starting scan…")}
              </>
            ) : (
              <>
                {t("Start scan")} <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ScopeStat({
  label,
  value,
  hint,
  t,
}: {
  label: string;
  value: string;
  hint?: string;
  t: (message: string) => string;
}) {
  return (
    <div className="rounded-md ring-1 ring-line bg-canvas-2 p-3" data-i18n-skip>
      <p className="text-lg font-semibold text-ink-900 tabular-nums leading-none">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mt-1.5">{t(label)}</p>
      {hint && <p className="text-[11px] text-ink-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function errorMessage(code?: string) {
  switch (code) {
    case "invalid_url":
      return "That URL is not valid.";
    case "scheme_blocked":
      return "Only http:// and https:// URLs are supported.";
    case "private_ip":
    case "loopback":
    case "link_local":
    case "metadata_address":
    case "reserved_tld":
      return "That URL points to a private or internal address and can't be scanned.";
    case "rate_limited":
      return "You're starting scans too quickly. Try again in a minute.";
    case "daily_scan_limit":
      return "You've reached your daily scan limit on the free plan.";
    case "daily_free_capacity_reached":
      return "Daily free scan capacity has been reached. Please try again tomorrow.";
    case "scan_concurrency_limit":
      return "A scan is already running. Wait for it to finish.";
    case "queue_unavailable":
    case "scan_dispatch_not_configured":
      return "The scan service is temporarily unavailable. Try again shortly.";
    case "firestore_index_unavailable":
      return "Scan data is temporarily unavailable while the database prepares an index. Try again shortly.";
    case "firestore_quota_exceeded":
      return "Scan data is temporarily unavailable because the database capacity limit was reached.";
    case "manual_urls_required":
      return "Add at least one manual URL.";
    case "manual_url_origin_mismatch":
      return "Manual URLs must stay on the same domain as the website URL.";
    case "sitemap_origin_mismatch":
      return "The sitemap URL must stay on the same domain as the website URL.";
    case "unauthorized":
      return "Please sign in to start a scan.";
    case "forbidden":
      return "Your workspace role doesn't allow starting scans.";
    case "workspace_not_found":
    case "no_workspace":
      return "Set up a workspace before starting a scan.";
    default:
      return null;
  }
}

function safeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "https://example.com";
  }
}
