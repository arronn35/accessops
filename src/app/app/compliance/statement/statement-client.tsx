"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Clipboard,
  Check,
  Mail,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertCallout } from "@/components/feedback/AlertCallout";

import type { Workspace, PrivacySettings, ScanJob } from "@/lib/data/types";

const DEFAULT_ORIGIN = "https://percevia-chi.vercel.app";
const MANUAL_AUDIT_EVENT = "percevia:manual-audit";

function subscribeToBrowserLocation() {
  return () => undefined;
}

function subscribeToManualAudit(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(MANUAL_AUDIT_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(MANUAL_AUDIT_EVENT, onStoreChange);
  };
}

function countCompletedManualChecks(raw: string | null): number {
  if (!raw) return 0;

  try {
    const data = JSON.parse(raw) as Record<string, { status?: unknown }>;
    return Object.values(data).filter(
      (item) => item.status === "passed" || item.status === "failed"
    ).length;
  } catch {
    return 0;
  }
}

export function StatementClient({
  workspace,
  privacy,
  latestScan,
}: {
  workspace: Workspace;
  privacy: PrivacySettings;
  latestScan: ScanJob | null;
}) {
  const [email, setEmail] = useState(privacy.statementContactEmail ?? "");
  const [limitations, setLimitations] = useState(privacy.statementLimitations ?? "");
  const [published, setPublished] = useState(privacy.statementPublished ?? false);
  const [lang, setLang] = useState<"tr" | "en">("tr");

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const origin = useSyncExternalStore(
    subscribeToBrowserLocation,
    () => window.location.origin,
    () => DEFAULT_ORIGIN
  );
  const manualAuditStorageKey = latestScan?.id
    ? `percevia_manual_audit_${latestScan.id}`
    : null;
  const serializedManualAudit = useSyncExternalStore(
    subscribeToManualAudit,
    () =>
      manualAuditStorageKey
        ? localStorage.getItem(manualAuditStorageKey)
        : null,
    () => null
  );
  const manualCompleted = useMemo(
    () => countCompletedManualChecks(serializedManualAudit),
    [serializedManualAudit]
  );

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/privacy/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          statementContactEmail: email || null,
          statementLimitations: limitations || null,
          statementPublished: published,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not save settings.");
      }
      setSuccess("Accessibility Statement configuration saved successfully.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const publicUrl = `${origin}/statement/${workspace.id}`;

  const badgeHtml = `<a href="${publicUrl}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;font-family:sans-serif;font-size:12px;color:#0B1220;text-decoration:none;border:1px solid #E4E8F0;padding:6px 10px;border-radius:6px;background:#FFF;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
  <span style="width:6px;height:6px;border-radius:50%;background:#3FA67A;display:inline-block;"></span>
  Verified Accessibility Audit by Percevia AI
</a>`;

  const copyBadge = () => {
    navigator.clipboard.writeText(badgeHtml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const formattedDate = latestScan?.completedAt
    ? new Date(latestScan.completedAt).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6 max-w-[1400px]">
      <div className="flex items-center gap-2">
        <Link
          href="/app/compliance"
          className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Privacy & Compliance
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
            Accessibility Statement Generator
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Build, publish, and link your official digital accessibility statement.
          </p>
        </div>
      </div>

      {error && <AlertCallout tone="danger">{error}</AlertCallout>}
      {success && <AlertCallout tone="success">{success}</AlertCallout>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settings Form */}
        <div className="lg:col-span-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Statement settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Email / link */}
              <div className="space-y-1.5">
                <label htmlFor="stmt-email" className="block text-xs font-semibold text-ink-700">
                  Feedback Contact Email or Link
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 size-4 text-ink-400" />
                  <input
                    id="stmt-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E.g., accessibility@company.com"
                    className="w-full rounded-md bg-paper pl-9 pr-3 py-2.5 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-ink-500 leading-snug">
                  Provide an email address or link where visitors can report accessibility barriers.
                </p>
              </div>

              {/* Known Limitations */}
              <div className="space-y-1.5">
                <label htmlFor="stmt-limit" className="block text-xs font-semibold text-ink-700">
                  Known Accessibility Limitations
                </label>
                <textarea
                  id="stmt-limit"
                  value={limitations}
                  onChange={(e) => setLimitations(e.target.value)}
                  placeholder="E.g., Video subtitles are missing on older archives. We are actively working to remediate this by Q4 2026."
                  className="w-full min-h-[90px] rounded-md bg-paper p-3 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed"
                />
                <p className="text-[10px] text-ink-500 leading-snug">
                  Mention parts of the site that are not fully accessible yet. Being honest protects you legally.
                </p>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center justify-between p-3 rounded-md bg-canvas-2/50 border border-line">
                <div>
                  <span className="block text-xs font-semibold text-ink-900">Publish Statement</span>
                  <span className="block text-[10px] text-ink-500 mt-0.5">
                    Make the statement public at a dedicated Percevia URL.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-ink-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-paper after:border-ink-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-navy-900"></div>
                </label>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Save configurations
              </button>
            </CardContent>
          </Card>

          {/* Badge Copy Block */}
          {published && (
            <Card className="ring-1 ring-purple-100 bg-purple-50/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-purple-800">
                  <ShieldCheck className="size-4 text-purple-600" /> Copy verified badge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-ink-600 leading-relaxed">
                  Paste this accessible HTML badge in your website footer. It links users to your official hosted Accessibility Statement.
                </p>

                {/* Badge preview */}
                <div className="p-4 rounded-md bg-paper border border-line flex items-center justify-center">
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line bg-paper text-ink-900 text-xs font-sans font-medium shadow-sm cursor-pointer"
                  >
                    <span className="size-1.5 rounded-full bg-green-500" />
                    Verified Accessibility Audit by Percevia AI
                  </a>
                </div>

                <div className="relative">
                  <pre className="p-3 rounded bg-canvas-2 border border-line font-mono text-[10px] leading-relaxed text-ink-800 overflow-x-auto whitespace-pre-wrap select-all">
                    <code>{badgeHtml}</code>
                  </pre>
                  <button
                    type="button"
                    onClick={copyBadge}
                    className="absolute right-2 top-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-paper/80 border border-line text-xs font-semibold hover:bg-paper"
                  >
                    {copied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <p className="text-[10px] text-ink-500 leading-normal">
                  Public hosted URL:{" "}
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline break-all font-mono"
                  >
                    {publicUrl}
                  </a>
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Statement Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-1.5">
              <FileText className="size-4 text-ink-500" /> Statement Live Preview
            </h3>
            <div className="flex rounded-md ring-1 ring-line bg-paper p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLang("tr")}
                className={`px-2.5 py-1 rounded ${
                  lang === "tr" ? "bg-navy-900 text-paper font-medium" : "text-ink-600"
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded ${
                  lang === "en" ? "bg-navy-900 text-paper font-medium" : "text-ink-600"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 rounded-lg border border-line bg-paper shadow-sm prose max-w-none text-ink-900 leading-relaxed font-sans">
            {lang === "tr" ? (
              <div className="space-y-6 text-sm">
                <div>
                  <h1 className="text-xl font-bold text-ink-900 border-b border-line pb-2">
                    Erişilebilirlik Beyanı
                  </h1>
                  <p className="mt-3 text-ink-700">
                    <strong>{workspace.companyName || workspace.name}</strong>, bu web sitesinin
                    engelli bireyler için erişilebilir olmasını sağlamayı taahhüt eder. Dijital
                    hizmetlerimizin erişilebilirlik standartlarını iyileştirmek için sürekli olarak
                    çalışıyor ve kullanıcı deneyimini herkes için geliştiriyoruz.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-ink-900">Uyum Durumu</h3>
                  <p className="mt-2 text-ink-700">
                    Bu web sitesi, gerçekleştirilen otomatik tarama testleri ve kılavuz denetim
                    adımları sonucunda{" "}
                    <strong>{workspace.targetStandard.replace(/_/g, " ").toUpperCase()}</strong>{" "}
                    standartlarına göre <strong>kısmen uyumludur</strong>. Kısmi uyumsuzluklar veya
                    kısıtlamalar aşağıda listelenmiştir.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-ink-900">Erişilebilirlik Denetim Detayları</h3>
                  <ul className="list-disc pl-5 mt-2 space-y-1.5 text-ink-700">
                    <li>
                      <strong>Son Otomatik Denetim Tarihi:</strong> {formattedDate}
                    </li>
                    <li>
                      <strong>Kılavuz (Manuel) Denetim İlerlemesi:</strong> {manualCompleted} / 7
                      adım tamamlandı.
                    </li>
                    <li>
                      <strong>Beyan Sürümü:</strong> Percevia-Statement-V1
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-ink-900">Bilinen Kısıtlamalar ve Uyumsuzluklar</h3>
                  <p className="mt-2 text-ink-700 whitespace-pre-wrap">
                    {limitations.trim() ||
                      "Şu an için bilinen herhangi bir erişilebilirlik kısıtlaması bulunmamaktadır."}
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-ink-900">Geri Bildirim ve İletişim</h3>
                  <p className="mt-2 text-ink-700">
                    Erişilebilirlik konusunda bir sorunla karşılaşırsanız veya sitemizin
                    erişilebilirliğini geliştirmeye yönelik önerileriniz varsa lütfen bizimle
                    iletişime geçin:
                  </p>
                  <p className="mt-3 font-semibold text-ink-900">
                    {email ? (
                      <span className="inline-flex items-center gap-1.5">
                        İletişim Kanalı:{" "}
                        <a href={email.includes("@") ? `mailto:${email}` : email} className="text-blue-600 hover:underline">
                          {email}
                        </a>
                      </span>
                    ) : (
                      <span className="text-amber-600 inline-flex items-center gap-1">
                        <AlertTriangle className="size-4 shrink-0" /> Lütfen sol panelden bir iletişim e-postası veya linki tanımlayın.
                      </span>
                    )}
                  </p>
                </div>

                <div className="border-t border-line pt-4 text-xs text-ink-500 flex items-center justify-between">
                  <span>Bu beyan Percevia AI denetim verileriyle üretilmiştir.</span>
                  <span>© {new Date().getFullYear()}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-sm">
                <div>
                  <h1 className="text-xl font-bold text-ink-900 border-b border-line pb-2">
                    Accessibility Statement
                  </h1>
                  <p className="mt-3 text-ink-700">
                    <strong>{workspace.companyName || workspace.name}</strong> is committed to
                    ensuring digital accessibility for people with disabilities. We are continually
                    improving the user experience for everyone and applying the relevant
                    accessibility standards.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-ink-900">Conformance Status</h3>
                  <p className="mt-2 text-ink-700">
                    This website is <strong>partially conformant</strong> with the{" "}
                    <strong>{workspace.targetStandard.replace(/_/g, " ").toUpperCase()}</strong>{" "}
                    standards, due to automated scans and guided auditing. Limitations and
                    non-conformances are documented below.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-ink-900">Audit & Scan Details</h3>
                  <ul className="list-disc pl-5 mt-2 space-y-1.5 text-ink-700">
                    <li>
                      <strong>Last Automated Scan:</strong> {formattedDate}
                    </li>
                    <li>
                      <strong>Guided Manual Audit Progress:</strong> {manualCompleted} / 7 checks
                      completed.
                    </li>
                    <li>
                      <strong>Audit Engine:</strong> Percevia-Statement-V1
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-ink-900">Technical Limitations</h3>
                  <p className="mt-2 text-ink-700 whitespace-pre-wrap">
                    {limitations.trim() ||
                      "No known accessibility limitations at this time."}
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-ink-900">Feedback & Contact</h3>
                  <p className="mt-2 text-ink-700">
                    We welcome your feedback on the accessibility of our website. Please let us know
                    if you encounter accessibility barriers:
                  </p>
                  <p className="mt-3 font-semibold text-ink-900">
                    {email ? (
                      <span className="inline-flex items-center gap-1.5">
                        Contact Info:{" "}
                        <a href={email.includes("@") ? `mailto:${email}` : email} className="text-blue-600 hover:underline">
                          {email}
                        </a>
                      </span>
                    ) : (
                      <span className="text-amber-600 inline-flex items-center gap-1">
                        <AlertTriangle className="size-4 shrink-0" /> Please define a contact email or link in the settings panel.
                      </span>
                    )}
                  </p>
                </div>

                <div className="border-t border-line pt-4 text-xs text-ink-500 flex items-center justify-between">
                  <span>Verified Accessibility Audit powered by Percevia AI.</span>
                  <span>© {new Date().getFullYear()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
