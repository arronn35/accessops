"use client";

import { useState } from "react";
import Link from "next/link";
import { Braces, Check, Copy, FileBarChart2, FileText, Loader2, Share2 } from "lucide-react";

/**
 * Quick-action buttons on the scan results page: view the report as
 * HTML in the dashboard or download it as a PDF. Creates a report on
 * demand if one doesn't exist yet, then routes to the appropriate
 * export endpoint.
 */
export function ScanReportActions({ scanId }: { scanId: string }) {
  const [busy, setBusy] = useState<null | "pdf" | "json" | "share">(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createReport(): Promise<string | null> {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scanJobId: scanId,
        title: "Accessibility assessment",
        reportType: "full",
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Could not create report.");
      return null;
    }
    const { report } = await res.json();
    return report.id as string;
  }

  async function downloadPdf() {
    setBusy("pdf");
    setError(null);
    try {
      const reportId = await createReport();
      if (!reportId) return;
      const exportRes = await fetch(
        `/api/reports/${reportId}/export?format=pdf`,
        { redirect: "follow" }
      );
      if (!exportRes.ok) {
        setError("Could not generate PDF.");
        return;
      }
      const ct = exportRes.headers.get("content-type") ?? "";
      if (!ct.includes("application/pdf")) {
        setError("Could not generate a PDF file.");
        return;
      }
      const blob = await exportRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `percevia-report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setBusy(null);
    }
  }

  async function downloadJson() {
    setBusy("json");
    setError(null);
    try {
      const reportId = await createReport();
      if (!reportId) return;
      const res = await fetch(`/api/reports/${reportId}/export?format=json`);
      if (!res.ok) {
        setError("Could not generate JSON export.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `percevia-report-${reportId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    setBusy("share");
    setError(null);
    try {
      const reportId = await createReport();
      if (!reportId) return;
      const res = await fetch(`/api/reports/${reportId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ public: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Could not create share link.");
        return;
      }
      const { shareUrl: url } = await res.json();
      setShareUrl(url as string);
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setBusy(null);
    }
  }

  async function copyShare() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be unavailable; the URL is still shown */
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Link
        href={`/app/reports/preview?scanId=${scanId}`}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm text-ink-700 hover:bg-canvas-2"
      >
        <FileBarChart2 className="size-4" aria-hidden /> View HTML
      </Link>
      <button
        type="button"
        onClick={downloadJson}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm text-ink-700 hover:bg-canvas-2 disabled:opacity-60"
      >
        {busy === "json" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Braces className="size-4" aria-hidden />
        )}
        JSON
      </button>
      <button
        type="button"
        onClick={share}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm text-ink-700 hover:bg-canvas-2 disabled:opacity-60"
      >
        {busy === "share" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Share2 className="size-4" aria-hidden />
        )}
        Share
      </button>
      <button
        type="button"
        onClick={downloadPdf}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800 disabled:opacity-60"
      >
        {busy === "pdf" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <FileText className="size-4" aria-hidden />
        )}
        {busy === "pdf" ? "Generating…" : "Download PDF"}
      </button>
      {error && (
        <span className="text-xs text-rose-700 ml-2">{error}</span>
      )}
      {shareUrl && (
        <div className="basis-full mt-1 flex items-center gap-2 rounded-md ring-1 ring-line bg-canvas-2 px-3 py-2">
          <span className="text-xs text-ink-500 shrink-0">Public link:</span>
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 bg-transparent text-xs font-mono text-ink-800 focus:outline-none"
          />
          <button
            type="button"
            onClick={copyShare}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline shrink-0"
          >
            {copied ? (
              <>
                <Check className="size-3.5" aria-hidden /> Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" aria-hidden /> Copy
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
