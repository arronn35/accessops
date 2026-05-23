"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download, FileBarChart2, FileText, Eye, Loader2, AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { Input, Label } from "@/components/ui/Input";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";

interface ScanSummary {
  id: string;
  baseUrl: string;
  pagesScanned: number;
  status: string;
  completedAt: string | null;
}

const SECTIONS = [
  { id: "exec", label: "Executive summary", description: "Plain-language overview." },
  { id: "tech", label: "Technical findings", description: "Detailed issue list with WCAG mapping." },
  { id: "pages", label: "Page-level findings", description: "Breakdown per page." },
  { id: "wcag", label: "WCAG mapping", description: "Grouped by success criterion." },
  { id: "roadmap", label: "Remediation roadmap", description: "Phased plan." },
  { id: "checklist", label: "Human review checklist", description: "Manual tests reviewers should perform." },
  { id: "disclaimer", label: "Risk disclaimer", description: "Non-legal scope notice.", required: true },
] as const;

const FORMATS = [
  { id: "html", label: "HTML", icon: FileBarChart2 },
  { id: "pdf", label: "PDF (browser print)", icon: FileText },
  { id: "csv", label: "CSV (issues only)", icon: Download },
] as const;

export default function ReportBuilderPage() {
  const router = useRouter();
  const search = useSearchParams();
  const presetScanId = search.get("scanId");
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [scanId, setScanId] = useState<string>(presetScanId ?? "");
  const [title, setTitle] = useState<string>("");
  const [selected, setSelected] = useState<string[]>(SECTIONS.map((s) => s.id));
  const [format, setFormat] = useState<"html" | "pdf" | "csv">("html");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scans?limit=20")
      .then((r) => r.json())
      .then((j) => {
        const completed = (j.scans ?? []).filter(
          (s: { status: string }) => s.status === "completed"
        );
        setScans(completed);
        if (!scanId && completed[0]) setScanId(completed[0].id);
        if (!title && completed[0])
          setTitle(`Accessibility assessment — ${hostFromUrl(completed[0].baseUrl)}`);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAndExport() {
    if (!scanId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scanJobId: scanId,
          title: title || "Accessibility assessment",
          reportType: format === "csv" ? "csv" : "full",
          sections: selected,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Could not create report.");
        return;
      }
      const { report } = await res.json();
      // Jump straight to export endpoint, which streams the requested format.
      window.location.href = `/api/reports/${report.id}/export?format=${format}`;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1400px]">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">Reports</p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Build an audit-ready report
        </h1>
        <p className="text-sm text-ink-600 mt-1 max-w-2xl">
          Pick a completed scan, choose sections and format, and we&apos;ll render a self-contained
          report with a non-legal disclaimer baked in.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Source scan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scans.length === 0 ? (
                <AlertCallout tone="info">
                  No completed scans yet. Start one from the dashboard to build a report.
                </AlertCallout>
              ) : (
                <>
                  <div>
                    <Label htmlFor="scan-select">Scan</Label>
                    <select
                      id="scan-select"
                      value={scanId}
                      onChange={(e) => setScanId(e.target.value)}
                      className="w-full rounded-md ring-1 ring-line bg-paper px-3 py-2.5 text-sm"
                    >
                      {scans.map((s) => (
                        <option key={s.id} value={s.id}>
                          {hostFromUrl(s.baseUrl)} · {s.pagesScanned} pages · {s.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="title">Report title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Accessibility assessment — example.com"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sections to include</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <Checkbox
                      id={`sec-${s.id}`}
                      checked={selected.includes(s.id) || (s as { required?: boolean }).required === true}
                      disabled={(s as { required?: boolean }).required}
                      onChange={(e) => {
                        if ((s as { required?: boolean }).required) return;
                        setSelected((cur) =>
                          e.target.checked ? [...cur, s.id] : cur.filter((id) => id !== s.id)
                        );
                      }}
                      label={
                        <span className="flex items-center gap-2">
                          {s.label}
                          {(s as { required?: boolean }).required && (
                            <span className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold">
                              Required
                            </span>
                          )}
                        </span>
                      }
                      description={s.description}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export format</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => {
                  const Icon = f.icon;
                  const active = format === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-md text-sm font-medium ring-1 transition-colors ${
                        active
                          ? "bg-navy-900 text-paper ring-navy-900"
                          : "bg-paper text-ink-700 ring-line hover:bg-canvas-2"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden />
                      {f.label}
                    </button>
                  );
                })}
              </div>
              {format === "pdf" && (
                <p className="text-xs text-ink-500 mt-3 leading-relaxed">
                  We render an HTML report and trigger the browser&apos;s print-to-PDF dialog —
                  no server-side PDF binary, no file storage costs. Click <em>Print</em> in the new tab.
                </p>
              )}
            </CardContent>
          </Card>

          <NoGuaranteeBanner />

          {error && (
            <AlertCallout tone="danger" icon={AlertCircle}>
              {error}
            </AlertCallout>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={createAndExport}
              disabled={!scanId || loading}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Generating…
                </>
              ) : (
                <>
                  <Download className="size-4" aria-hidden /> Generate &amp; download
                </>
              )}
            </button>
            <button
              onClick={() =>
                router.push(
                  scanId
                    ? `/app/reports/preview?scanId=${scanId}`
                    : "/app/reports/preview"
                )
              }
              disabled={!scanId}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-700 hover:bg-canvas-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="size-4" aria-hidden /> Preview report
            </button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Live preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md ring-1 ring-line p-4 bg-paper">
                <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">
                  Accessibility assessment
                </p>
                <h3 className="text-base font-semibold text-ink-900 line-clamp-2">
                  {title || "Untitled report"}
                </h3>

                <ul className="mt-4 space-y-1.5 text-xs text-ink-700 border-t border-line pt-3">
                  {SECTIONS.filter((s) => selected.includes(s.id) || (s as { required?: boolean }).required).map((s, i) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="font-mono text-ink-500 w-4 tabular-nums">{i + 1}.</span>
                      <span>{s.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-3 border-t border-line">
                  <p className="text-[10px] text-ink-500 leading-relaxed">
                    {COMPLIANCE_COPY.REPORT_NOT_LEGAL}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
