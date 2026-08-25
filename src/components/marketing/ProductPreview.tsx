import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Check,
  FileBarChart2,
  KanbanSquare,
  Layers3,
  Plus,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AiSuggestionBlock } from "@/components/ai/AiSuggestionBlock";
import { Logo } from "@/components/brand/Logo";
import { ScanScoreRing } from "@/components/scan/ScanScoreRing";
import { SeverityBadge } from "@/components/scan/SeverityBadge";

const PRODUCT_NAV = [
  { label: "Dashboard", icon: Layers3, active: true },
  { label: "Scans", icon: ScanLine },
  { label: "Monitors", icon: Activity },
  { label: "Remediation", icon: KanbanSquare },
  { label: "AI Assistant", icon: Sparkles },
  { label: "Reports", icon: FileBarChart2 },
  { label: "Compliance", icon: ShieldCheck },
];

const WORKFLOW = [
  { label: "Queued", note: "Job secured", done: true },
  { label: "Scan", note: "12 / 12 pages", done: true },
  { label: "Understand", note: "23 findings grouped", done: true },
  { label: "Remediate", note: "6 tasks assigned", done: false },
  { label: "Report", note: "Ready to export", done: false },
];

export function ProductPreview({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="border-t border-rule bg-navy-900 p-3 sm:p-6 lg:p-9">
      <div className="border border-paper/35 bg-canvas text-ink-900 shadow-[10px_10px_0_var(--color-purple-600)]">
        <div className="flex items-center justify-between gap-4 border-b border-rule bg-paper px-4 py-3 sm:px-5">
          <Logo variant="wordmark" className="[&_span]:font-extrabold" />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="eyebrow border border-rule px-3 py-2 text-[10px] text-ink-600">
              Northwind workspace
            </span>
            <Link
              href={signedIn ? "/app/scans/new" : "/onboarding"}
              className="inline-flex items-center gap-2 bg-navy-900 px-4 py-2.5 text-xs font-bold text-paper shadow-[4px_4px_0_var(--color-accent)]"
            >
              <Plus className="size-3.5" aria-hidden /> New scan
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="hidden border-r border-rule bg-paper p-3 lg:block" aria-label="Product preview navigation">
            <div className="eyebrow px-3 pb-3 pt-2 text-[10px] text-ink-500">Workspace</div>
            <ul className="space-y-1">
              {PRODUCT_NAV.map(({ label, icon: Icon, active }) => (
                <li key={label}>
                  <div
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold ${
                      active ? "bg-navy-900 text-paper" : "text-ink-600"
                    }`}
                  >
                    <Icon className="size-3.5" aria-hidden /> {label}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 border border-rule border-l-[5px] border-l-purple-600 bg-purple-50 p-3">
              <div className="eyebrow text-[9px] text-purple-700">System posture</div>
              <p className="mt-2 text-xs leading-relaxed text-ink-700">
                Continuous accessibility operations, with every automated result reviewable.
              </p>
            </div>
          </aside>

          <div className="min-w-0 bg-grid p-4 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="eyebrow text-[10px] text-purple-700">Workspace pulse · live product view</div>
                <h3 className="mt-2 text-[clamp(1.75rem,3.2vw,2.6rem)] font-extrabold leading-none tracking-[-0.04em]">
                  From signal to shipped fix.
                </h3>
                <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-ink-600">
                  One operating surface for scans, grouped findings, owner-ready tasks,
                  AI guidance, monitoring, and audit-ready reports.
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 border border-rule bg-paper px-3 py-2 font-mono text-[11px]">
                <span className="size-2 bg-green-500" aria-hidden /> Latest scan complete
              </div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.3fr)]">
              <article className="border border-rule bg-paper p-5 shadow-[5px_5px_0_var(--color-accent)]">
                <div className="eyebrow text-[10px] text-ink-500">Latest scan</div>
                <div className="mt-1 font-mono text-xs text-ink-700">northwind-shop.example</div>
                <div className="mt-5 flex items-center gap-5">
                  <ScanScoreRing score={78} size="lg" />
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <Metric icon={AlertOctagon} label="Critical" value="5" tone="rose" />
                    <Metric icon={AlertTriangle} label="Moderate" value="11" tone="amber" />
                    <Metric icon={ScanLine} label="Pages" value="12" tone="blue" />
                  </div>
                </div>
                <p className="mt-5 border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-600">
                  Risk score reflects automated findings only. It is a prioritization
                  signal, not a compliance certificate.
                </p>
              </article>

              <article className="border border-rule bg-paper">
                <div className="flex items-center justify-between border-b border-rule px-5 py-4">
                  <div>
                    <div className="text-sm font-bold">Open findings</div>
                    <div className="mt-0.5 text-xs text-ink-500">Grouped by user impact and rule</div>
                  </div>
                  <span className="eyebrow bg-navy-900 px-2.5 py-1.5 text-[9px] text-paper">23 total</span>
                </div>
                <ul>
                  <Finding severity="critical" title="Buttons do not have an accessible name" owner="Checkout" />
                  <Finding severity="moderate" title="Document language is not identified" owner="Platform" />
                  <Finding severity="review" title="Focus order needs a manual keyboard pass" owner="Design system" last />
                </ul>
              </article>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
              <article className="border border-rule bg-paper p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">Scan → remediation workflow</div>
                    <div className="mt-0.5 text-xs text-ink-500">Progress stays visible after the scan finishes.</div>
                  </div>
                  <Activity className="size-4 text-blue-600" aria-hidden />
                </div>
                <ol className="mt-5 grid gap-px border border-rule bg-rule sm:grid-cols-5">
                  {WORKFLOW.map((step, index) => (
                    <li key={step.label} className="bg-canvas p-3">
                      <div
                        className={`flex size-7 items-center justify-center font-mono text-[10px] font-bold ${
                          step.done ? "bg-navy-900 text-paper" : "border border-rule bg-paper"
                        }`}
                      >
                        {step.done ? <Check className="size-3.5" aria-hidden /> : index + 1}
                      </div>
                      <div className="mt-3 text-xs font-bold">{step.label}</div>
                      <div className="mt-1 text-[10px] leading-snug text-ink-500">{step.note}</div>
                    </li>
                  ))}
                </ol>
              </article>

              <AiSuggestionBlock title="AI remediation" className="rounded-none">
                <p>
                  Add an explicit accessible name that describes the button’s action,
                  then verify the final control with keyboard and screen-reader testing.
                </p>
                <div className="mt-3 border border-purple-100 bg-paper p-3 font-mono text-[11px] text-ink-700">
                  &lt;button aria-label=&quot;Open cart&quot;&gt;…&lt;/button&gt;
                </div>
              </AiSuggestionBlock>
            </div>

            <div className="mt-3 grid gap-px border border-rule bg-rule sm:grid-cols-4">
              <ProductOutcome icon={KanbanSquare} value="6" label="Assigned remediation tasks" />
              <ProductOutcome icon={Activity} value="3" label="Active regression monitors" />
              <ProductOutcome icon={FileBarChart2} value="PDF · HTML · CSV" label="Client-ready exports" />
              <ProductOutcome icon={ShieldCheck} value="Reviewable" label="AI and privacy controls" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AlertOctagon;
  label: string;
  value: string;
  tone: "rose" | "amber" | "blue";
}) {
  const color =
    tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-700" : "text-blue-600";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-xs text-ink-600">
        <Icon className={`size-3.5 ${color}`} aria-hidden /> {label}
      </span>
      <strong className="font-mono text-sm">{value}</strong>
    </div>
  );
}

function Finding({
  severity,
  title,
  owner,
  last = false,
}: {
  severity: "critical" | "moderate" | "review";
  title: string;
  owner: string;
  last?: boolean;
}) {
  return (
    <li className={`grid gap-3 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center ${last ? "" : "border-b border-line-soft"}`}>
      <SeverityBadge severity={severity} size="sm" />
      <span className="text-xs font-semibold leading-snug sm:text-sm">{title}</span>
      <span className="w-fit border border-line px-2 py-1 font-mono text-[9px] text-ink-500">{owner}</span>
    </li>
  );
}

function ProductOutcome({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof KanbanSquare;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-paper p-4">
      <Icon className="size-4 text-purple-600" aria-hidden />
      <div className="mt-3 text-lg font-extrabold tracking-[-0.03em]">{value}</div>
      <div className="mt-1 text-[11px] leading-snug text-ink-500">{label}</div>
    </div>
  );
}
