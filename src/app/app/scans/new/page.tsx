"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Globe, Loader2, Sparkles, AlertCircle, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Checkbox } from "@/components/ui/Checkbox";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { cn } from "@/lib/utils";

const SCAN_TYPES = [
  { id: "single", label: "Single page", description: "Scan one URL." },
  { id: "multi", label: "Multi-page crawl", description: "Follow same-domain links up to the page limit." },
  { id: "sitemap", label: "Sitemap scan", description: "Crawl URLs listed in /sitemap.xml or a sitemap URL." },
  { id: "manual", label: "Manual URL list", description: "Scan a specific same-origin URL list." },
] as const;

export default function NewScanPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [manualUrls, setManualUrls] = useState("");
  const [type, setType] = useState<"single" | "multi" | "sitemap" | "manual">("single");
  const [maxPages, setMaxPages] = useState(3);
  const [permission, setPermission] = useState(false);
  const [aiExplain, setAiExplain] = useState(false);
  const [screenshots, setScreenshots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedManualUrls = manualUrls
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const canSubmit =
    url.trim().length > 0 &&
    permission &&
    !submitting &&
    (type !== "manual" || parsedManualUrls.length > 0);

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
          storeScreenshots: false,
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
    <div className="px-4 lg:px-8 py-8 max-w-3xl">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">New scan</p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">Start a scan</h1>
        <p className="text-sm text-ink-600 mt-1 max-w-xl">
          We&apos;ll run automated accessibility checks and capture findings. Screenshots are off by
          default. AI explanations require workspace consent.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>What to scan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="url" required>Website URL</Label>
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
                Public URL with https:// scheme. We block private and internal addresses.
              </FieldHint>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-ink-700 mb-2">Scan type</legend>
              <div className="grid grid-cols-2 gap-2">
                {SCAN_TYPES.map((t) => {
                  const active = type === t.id;
                  return (
                    <label
                      key={t.id}
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
                        onChange={() => setType(t.id)}
                      />
                      <p className="font-medium text-ink-900">{t.label}</p>
                      <p className="text-xs text-ink-600 mt-1 leading-snug">{t.description}</p>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {type === "sitemap" && (
              <div>
                <Label htmlFor="sitemap-url">Sitemap URL</Label>
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
                  Optional. Leave blank to use /sitemap.xml on the website URL origin.
                </FieldHint>
              </div>
            )}

            {type === "manual" && (
              <div>
                <Label htmlFor="manual-urls" required>Manual URLs</Label>
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
                  One URL per line. URLs must be public and on the same origin as the website URL.
                </FieldHint>
              </div>
            )}

            <div>
              <Label htmlFor="max-pages">Max pages</Label>
              <Input
                id="max-pages"
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                min={1}
                max={1000}
              />
              <FieldHint>
                Free plan: up to 3 pages. Starter and above raise the cap.
              </FieldHint>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" aria-hidden /> AI &amp; capture options
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-line">
            <div className="pb-4">
              <Switch
                checked={aiExplain}
                onChange={(e) => setAiExplain(e.target.checked)}
                label="AI explanations &amp; remediation"
                description="Generate plain-language explanations and code fixes for each finding. Requires workspace AI consent."
              />
            </div>
            <div className="pt-4">
              <Switch
                checked={screenshots}
                onChange={(e) => setScreenshots(e.target.checked)}
                label={
                  <span className="flex items-center gap-2">
                    Capture screenshots
                    <span className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
                      Off by default
                    </span>
                  </span>
                }
                description={COMPLIANCE_COPY.SCREENSHOT_NOTICE}
              />
            </div>
          </CardContent>
        </Card>

        <AlertCallout tone="warning" title="Privacy notice">
          {COMPLIANCE_COPY.SCAN_PRIVACY}
        </AlertCallout>

        <Card>
          <CardContent className="pt-5">
            <Checkbox
              checked={permission}
              onChange={(e) => setPermission(e.target.checked)}
              label={<span className="font-medium">{COMPLIANCE_COPY.SCAN_PERMISSION}</span>}
              description="By starting this scan you confirm you have authorization from the site owner."
            />
          </CardContent>
        </Card>

        <NoGuaranteeBanner variant="compact" />

        {error && (
          <AlertCallout tone="danger" icon={AlertCircle} title="Couldn't start scan">
            {error}
          </AlertCallout>
        )}

        <div className="flex items-center justify-between pt-2">
          <Link href="/app" className="text-sm text-ink-600 hover:text-ink-900">
            ← Cancel
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
                <Loader2 className="size-4 animate-spin" aria-hidden /> Starting scan…
              </>
            ) : (
              <>
                Start scan <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </form>
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
    case "scan_concurrency_limit":
      return "A scan is already running. Wait for it to finish.";
    case "queue_unavailable":
      return "The scan service is temporarily unavailable. Try again shortly.";
    case "manual_urls_required":
      return "Add at least one manual URL.";
    case "manual_url_origin_mismatch":
      return "Manual URLs must stay on the same domain as the website URL.";
    case "sitemap_origin_mismatch":
      return "The sitemap URL must stay on the same domain as the website URL.";
    case "unauthorized":
      return "Please sign in to start a scan.";
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
