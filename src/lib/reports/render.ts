import type { ComparisonProfile } from "@/lib/scanner/comparison-profile";
/**
 * Render a report from DB content.
 *
 * Four flavors:
 *   - HTML: produced inline; returned as a download and used to drive PDF
 *     generation and the dashboard preview iframe.
 *   - PDF: the HTML printed server-side (`lib/reports/pdf` — full Playwright
 *     Chromium where browsers are installed, serverless Chromium on
 *     Vercel/λ), plus a "browser print" path on the preview page.
 *   - CSV: flat issues table, no headers in the body.
 *   - JSON: machine-readable normalized + grouped payload (API export only).
 *
 * The disclaimer is always the last block of the HTML and is also
 * embedded as a trailing CSV row so exports can't be stripped of the
 * non-legal notice.
 */
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { MANUAL_CHECKS } from "@/lib/compliance/manual-checks";

export interface ReportEvidence {
  /** base64 PNG data URI — durable in HTML + PDF, no signed-URL expiry. */
  dataUri: string;
  selector: string | null;
  redactionApplied: boolean;
}

export interface ReportInputIssue {
  id: string;
  ruleId: string;
  severity: string;
  impact: string;
  description: string;
  help: string;
  helpUrl?: string | null;
  wcagTags: string[];
  pageUrl: string | null;
  pageTitle: string | null;
  htmlSnippet?: string | null;
  evidence?: ReportEvidence | null;
  groupId?: string | null;
}

export interface ReportGroup {
  id: string;
  ruleId: string;
  title: string;
  severity: string;
  affectedCount: number;
  primaryWcagTag: string | null;
  recommendedFix: string | null;
  priority: number;
}

/** A recorded human verdict, as cited by the report. */
export interface ReportManualReview {
  checkId: string;
  title: string;
  status: "pending" | "passed" | "failed";
  notes: string | null;
  wcagCriteria: string[];
  reviewerName: string | null;
  reviewedAt: Date;
  revision: number;
}

export interface ReportInput {
  comparisonProfile?: ComparisonProfile | null;
  comparisonEvidence?: { comparable: boolean; reasons: string[]; againstScanId?: string; verificationStatus?: string; result?: unknown };
  title: string;
  workspaceName: string;
  scanId: string;
  baseUrl: string;
  pagesScanned: number;
  /** Pages that produced no accessibility analysis and were excluded from scoring. */
  pagesFailedToScan?: number;
  failedPageUrls?: string[];
  scanDate: Date;
  issues: ReportInputIssue[];
  counts: { critical: number; moderate: number; minor: number; passed: number; review: number };
  groups?: ReportGroup[];
  /**
   * Agency / white-label branding. When `agencyBranding` is true the
   * footer presents the workspace as the author; otherwise the report
   * carries Percevia AI attribution.
   */
  agencyBranding?: boolean;
  /** Builder-selected section ids; empty/null renders every section. */
  sections?: string[] | null;
  /** Executive reports collapse to summary + roadmap unless sections are explicit. */
  reportType?: "full" | "executive" | "csv";
  /**
   * Recorded manual reviews. The checklist section reports these as evidence
   * of what a person actually checked; without them it can only list what
   * still needs doing.
   */
  manualReviews?: ReportManualReview[];
}

export type ReportSectionId =
  | "exec"
  | "tech"
  | "pages"
  | "wcag"
  | "roadmap"
  | "checklist"
  | "disclaimer";

const ALL_SECTIONS: ReportSectionId[] = [
  "exec",
  "tech",
  "pages",
  "wcag",
  "roadmap",
  "checklist",
  "disclaimer",
];

/** Disclaimer is always included; unknown ids from older docs are dropped. */
function resolveSections(input: ReportInput): Set<string> {
  const explicit = (input.sections ?? []).filter((s) =>
    (ALL_SECTIONS as string[]).includes(s)
  );
  if (explicit.length > 0) return new Set([...explicit, "disclaimer"]);
  if (input.reportType === "executive") {
    return new Set(["exec", "roadmap", "checklist", "disclaimer"]);
  }
  return new Set(ALL_SECTIONS);
}

const DISCLAIMER = COMPLIANCE_COPY.REPORT_NOT_LEGAL;

export function renderHtml(input: ReportInput): string {
  const sevCount = input.counts;
  const pagesFailedToScan = input.pagesFailedToScan ?? 0;
  const failedPageUrls = input.failedPageUrls ?? [];
  const evidenceCount = input.issues.filter((i) => i.evidence).length;
  const issuesBySeverity = ["critical", "moderate", "minor", "review"].map((sev) => ({
    sev,
    items: input.issues.filter((i) => i.severity === sev),
  }));
  const groups = input.groups ?? [];
  const useGroups = groups.length > 0;
  const issuesByGroup = new Map<string, ReportInputIssue[]>();
  for (const issue of input.issues) {
    if (!issue.groupId) continue;
    const bucket = issuesByGroup.get(issue.groupId);
    if (bucket) bucket.push(issue);
    else issuesByGroup.set(issue.groupId, [issue]);
  }
  const topFixes = groups.filter((g) => g.severity !== "review").slice(0, 5);
  const roadmapStages = buildRoadmapStages(groups, input.issues);
  const reviewTargets = scannedPageUrls(input.issues);

  const enabled = resolveSections(input);
  const has = (id: ReportSectionId) => enabled.has(id);
  const hasTech = has("tech");
  let sectionNo = 0;
  const num = () => ++sectionNo;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root { color-scheme: light; }
  body { font: 14px/1.55 -apple-system, "Segoe UI", Inter, system-ui, sans-serif;
         color:#0E1422; background:#fff; margin:0; padding:0; }
  .report { max-width: 760px; margin: 0 auto; padding: 48px 40px 64px; }
  h1 { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 4px; }
  h2 { font-size: 18px; font-weight: 600; margin: 32px 0 12px; }
  h3 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; }
  h2, h3 { break-after: avoid; }
  .meta { color: #4B5570; font-size: 13px; margin-bottom: 24px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0 0; }
  .stat { border: 1px solid #E4E8F0; border-radius: 8px; padding: 12px; }
  .stat .n { font-weight: 600; font-size: 22px; tabular-nums: true; }
  .stat .l { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #4B5570; }
  .crit .n { color: #8A2F40; } .mod .n { color: #8C6217; } .min .n { color: #2A50BF; } .rev .n { color: #5E4FD9; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { padding: 8px 6px; border-bottom: 1px solid #E4E8F0; text-align: left; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #4B5570; }
  /* Explicit color, not inherited: <code> sits on a #F7F8FB chip, and the
     secondary #6B7590 its parent uses only reaches 4.32:1 against that tint
     (it clears 4.5:1 on plain white, which is why this hid for so long).
     #4B5570 is the existing darker token and gives 6.9:1. Applies to the PDF
     too — both render from this stylesheet. */
  code { font: 12px/1.4 ui-monospace, "SF Mono", Menlo, monospace; color: #4B5570; background: #F7F8FB; padding: 1px 4px; border-radius: 3px; }
  .pill { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .pill-critical { background: #F8E5E9; color: #8A2F40; }
  .pill-moderate { background: #FBF1DE; color: #8C6217; }
  .pill-minor    { background: #EEF3FF; color: #2A50BF; }
  .pill-review   { background: #EFEDFE; color: #5E4FD9; }
  .evidence { margin-top: 8px; }
  .evidence img { max-width: 100%; border: 1px solid #E4E8F0; border-radius: 6px; display: block; }
  .evidence-meta { font-size: 11px; color: #4B5570; margin-top: 4px; }
  .redacted { display: inline-block; background: #F8E5E9; color: #8A2F40; border-radius: 4px; padding: 0 6px; font-size: 10px; font-weight: 600; }
  .warning { margin: 14px 0; padding: 12px; border: 1px solid #E6C66A; border-radius: 6px; background: #FFF9E8; color: #664D03; }
  .disclaimer { margin-top: 48px; padding: 18px; border-top: 1px solid #E4E8F0; color: #4B5570; font-size: 12px; }
  @media print {
    body { background: #fff; }
    .report { padding: 24px 32px; }
  }
</style>
</head>
<body>
<div class="report">
  <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#4B5570;font-weight:600;margin:0 0 4px">
    Accessibility assessment
  </p>
  <h1>${escapeHtml(input.title)}</h1>
  ${input.comparisonEvidence ? `<div class="warning"><strong>Comparison confidence:</strong> ${input.comparisonEvidence.comparable ? "Equivalent completed scans" : escapeHtml(input.comparisonEvidence.reasons.join(", "))}</div>` : ""}
  ${input.comparisonProfile ? `<details><summary>Scan scope and engine profile</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(JSON.stringify(input.comparisonProfile, null, 2))}</pre></details>` : ""}
  <p class="meta">
    ${escapeHtml(input.workspaceName)} · ${escapeHtml(input.baseUrl)} · ${input.pagesScanned} scored pages ·
    scanned ${input.scanDate.toLocaleDateString()}
  </p>

  ${!has("exec") ? "" : `<h2>${num()}. Executive summary</h2>
  <p>
    Percevia AI scanned <strong>${input.pagesScanned}</strong> page(s) of
    <code>${escapeHtml(input.baseUrl)}</code> against WCAG 2.2 AA-oriented checks via axe-core.
    The scan surfaced ${sevCount.critical + sevCount.moderate + sevCount.minor + sevCount.review}
    automated findings, of which ${sevCount.critical} are critical and ${sevCount.moderate} are
    moderate. ${sevCount.review} finding(s) require human review because automated checks could
    not fully decide.
  </p>
  ${
    pagesFailedToScan > 0
      ? `<div class="warning"><strong>${pagesFailedToScan} page${pagesFailedToScan === 1 ? "" : "s"} could not be scanned.</strong>
      The score and findings are based only on the ${input.pagesScanned} page${input.pagesScanned === 1 ? "" : "s"} that completed analysis.</div>`
      : ""
  }
  <div class="stats">
    <div class="stat crit"><div class="n">${sevCount.critical}</div><div class="l">Critical</div></div>
    <div class="stat mod"><div class="n">${sevCount.moderate}</div><div class="l">Moderate</div></div>
    <div class="stat min"><div class="n">${sevCount.minor}</div><div class="l">Minor</div></div>
    <div class="stat rev"><div class="n">${sevCount.review}</div><div class="l">Needs review</div></div>
  </div>`}

  <h2>${num()}. Scan scope &amp; limitations</h2>
  <ul>
    <li>Pages successfully analyzed and included in scoring: ${input.pagesScanned}</li>
    ${pagesFailedToScan > 0 ? `<li>Pages that could not be analyzed: ${pagesFailedToScan}</li>` : ""}
    <li>Standard: WCAG 2.2 AA-oriented (axe-core ruleset)</li>
    <li>Automated tooling cannot detect every accessibility issue; human review remains required.</li>
    <li>Authenticated pages and visual issues that require manual inspection were not covered.</li>
    ${evidenceCount > 0 ? `<li>${evidenceCount} finding(s) include diagnostic visual evidence (screenshots); sensitive regions are redacted where detected.</li>` : ""}
  </ul>
  ${
    failedPageUrls.length > 0
      ? `<h3>Pages excluded from scoring</h3><ul>${failedPageUrls
          .map((url) => `<li><code>${escapeHtml(url)}</code></li>`)
          .join("")}</ul>`
      : ""
  }

  ${
    hasTech && useGroups && topFixes.length > 0
      ? `<h2>${num()}. Top priority fixes</h2>
  <p>Findings are grouped by root cause. Fixing these collapses the most instances at once.</p>
  <ol>
    ${topFixes
      .map(
        (g) =>
          `<li><strong>${escapeHtml(g.title)}</strong> — ${g.affectedCount} instance(s) · <code>${escapeHtml(g.ruleId)}</code></li>`
      )
      .join("")}
  </ol>`
      : ""
  }

  ${!hasTech ? "" : `<h2>${num()}. Findings ${useGroups ? "by root cause" : "by severity"}</h2>`}
  ${
    !hasTech
      ? ""
      : useGroups
      ? groups
          .map((g) => {
            const items = issuesByGroup.get(g.id) ?? [];
            if (!items.length) return "";
            const sev = g.severity;
            const pages = Array.from(
              new Set(items.map((i) => i.pageUrl).filter(Boolean))
            ) as string[];
            const evidenceItem = items.find((i) => i.evidence);
            return `
    <h3><span class="pill pill-${sev}">${capitalize(sev)}</span> ${escapeHtml(g.title)} <span style="color:#6B7590;font-weight:400">(${g.affectedCount} instance${g.affectedCount === 1 ? "" : "s"})</span></h3>
    <p style="color:#6B7590;font-size:13px;margin:4px 0">
      <code>${escapeHtml(g.ruleId)}</code> · ${escapeHtml(g.primaryWcagTag ?? "—")}${g.recommendedFix ? ` · ${escapeHtml(g.recommendedFix)}` : ""}
    </p>
    ${
      pages.length
        ? `<p style="font-size:12px;color:#4B5570">Affected pages: ${pages
            .slice(0, 8)
            .map((p) => `<code>${escapeHtml(p)}</code>`)
            .join(", ")}${pages.length > 8 ? ` +${pages.length - 8} more` : ""}</p>`
        : ""
    }
    ${evidenceItem ? renderEvidence(evidenceItem) : ""}`;
          })
          .join("")
      : issuesBySeverity
          .map(
            ({ sev, items }) => `
    <h3>${capitalize(sev)} (${items.length})</h3>
    ${
      items.length === 0
        ? `<p style="color:#6B7590">None.</p>`
        : `<table>
      <thead><tr><th>Rule</th><th>Page</th><th>WCAG</th><th>Description</th></tr></thead>
      <tbody>
        ${items
          .map(
            (i) => `
          <tr>
            <td><span class="pill pill-${sev}">${capitalize(sev)}</span><br/><code>${escapeHtml(i.ruleId)}</code></td>
            <td><code>${escapeHtml(i.pageUrl ?? "")}</code></td>
            <td><code>${escapeHtml(i.wcagTags.join(" ") || "—")}</code></td>
            <td>${escapeHtml(i.help)}<br/><span style="color:#6B7590;font-size:12px">${escapeHtml(i.description)}</span>${renderEvidence(i)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`
    }
  `
          )
          .join("")
  }

  ${has("pages") && input.issues.length > 0 ? pagesSection(input, num()) : ""}
  ${has("wcag") && input.issues.length > 0 ? wcagSection(input, num()) : ""}
  ${!has("roadmap") ? "" : `<h2>${num()}. Remediation roadmap</h2>
  ${
    roadmapStages.length === 0
      ? `<p>This scan produced no automated findings to sequence. Human review is still required — see the checklist below.</p>`
      : `<p style="color:#6B7590;font-size:13px;margin:4px 0">Sequenced from this scan's own findings, most-blocking first. Instance counts are what each fix collapses.</p>` +
        roadmapStages
          .map(
            (stage) => `
  <h3>${escapeHtml(stage.label)}</h3>
  <p style="color:#6B7590;font-size:13px;margin:4px 0">${escapeHtml(stage.rationale)}</p>
  <ol>
    ${stage.entries
      .map(
        (entry) =>
          `<li><strong>${escapeHtml(entry.title)}</strong> — ${entry.count} instance${entry.count === 1 ? "" : "s"} · <code>${escapeHtml(entry.ruleId)}</code>${entry.fix ? ` · ${escapeHtml(entry.fix)}` : ""}</li>`
      )
      .join("")}
  </ol>`
          )
          .join("")
  }`}

  ${!has("checklist") ? "" : `<h2>${num()}. Human review</h2>
  <p style="color:#6B7590;font-size:13px;margin:4px 0">
    These cannot be decided automatically. Run them against the pages this scan actually covered:
    ${reviewTargets.length > 0 ? renderPageList(reviewTargets) : `<code>${escapeHtml(input.baseUrl)}</code>`}.
  </p>
  ${renderManualReviews(input.manualReviews ?? [])}
  <ul>
    ${sevCount.review > 0 ? `<li>${sevCount.review} finding${sevCount.review === 1 ? "" : "s"} marked “needs review”: automated checks could not decide these, so a human must.</li>` : ""}
    ${failedPageUrls.length > 0 ? `<li>${failedPageUrls.length} page${failedPageUrls.length === 1 ? "" : "s"} could not be analyzed at all and carry no automated coverage.</li>` : ""}
  </ul>`}

  <div class="disclaimer">
    ${escapeHtml(DISCLAIMER)}
    <p style="margin-top:10px;color:#6B7590">${
      input.agencyBranding
        ? `Prepared by ${escapeHtml(input.workspaceName)}.`
        : `Prepared with Percevia AI by ${escapeHtml(input.workspaceName)}.`
    }</p>
  </div>
</div>
</body>
</html>`;
}

/**
 * Per-instance CSV — one row per affected element. Each row also carries
 * its root-cause group columns (id / title / affected count) so the flat
 * export can be pivoted back into the grouped view in a spreadsheet.
 */

/**
 * Neutralize spreadsheet formula interpretation. CSV quoting (doubled
 * double-quotes) only fixes CSV syntax — a parser still hands `=1+1` to the
 * spreadsheet as a formula. Prefix attacker-reachable text cells with a
 * single quote when the first meaningful character is a formula trigger.
 * Centralize here so every untrusted field shares the same gate; the JSON
 * export keeps raw values for machine consumers.
 */
export function spreadsheetSafe(value: unknown): string {
  const raw = String(value);
  const firstMeaningful = raw.replace(/^[\u0000-\u0020\u007f]+/, "");
  return /^[=+\-@]/.test(firstMeaningful) ? `'${raw}` : raw;
}

export function encodeCsvCell(value: unknown): string {
  return `"${spreadsheetSafe(value).replace(/"/g, '""')}"`;
}
export function renderCsv(input: ReportInput): string {
  const groupById = new Map((input.groups ?? []).map((g) => [g.id, g]));
  const header = [
    "issue_id",
    "rule_id",
    "severity",
    "impact",
    "wcag_tags",
    "page_url",
    "page_title",
    "description",
    "help",
    "help_url",
    "html_snippet",
    "has_screenshot",
    "screenshot_redacted",
    "group_id",
    "group_title",
    "group_affected_count",
  ];
  const rows = input.issues.map((i) => {
    const group = i.groupId ? groupById.get(i.groupId) : undefined;
    return [
      i.id,
      i.ruleId,
      i.severity,
      i.impact,
      i.wcagTags.join(";"),
      i.pageUrl ?? "",
      i.pageTitle ?? "",
      i.description.replace(/\s+/g, " ").trim(),
      i.help.replace(/\s+/g, " ").trim(),
      i.helpUrl ?? "",
      (i.htmlSnippet ?? "").replace(/\s+/g, " ").trim().slice(0, 500),
      i.evidence ? "yes" : "no",
      i.evidence?.redactionApplied ? "yes" : "no",
      i.groupId ?? "",
      group?.title ?? "",
      group ? String(group.affectedCount) : "",
    ];
  });
  const all = [header, ...rows,
    ["COMPARISON_PROFILE", JSON.stringify(input.comparisonProfile ?? null)],
    ["COMPARISON_EVIDENCE", JSON.stringify(input.comparisonEvidence ?? null)],
    ["DISCLAIMER", DISCLAIMER]];
  return all
    .map((row) => row.map((cell) => encodeCsvCell(cell)).join(","))
    .join("\n");
}

/**
 * Machine-readable JSON export: normalized + grouped issues with
 * screenshot metadata. Screenshot binaries are intentionally excluded
 * (only metadata is emitted) to keep the payload lean; the HTML/PDF
 * exports carry the embedded images.
 */
export function renderJson(input: ReportInput): string {
  const pagesFailedToScan = input.pagesFailedToScan ?? 0;
  const failedPageUrls = input.failedPageUrls ?? [];
  const instanceIdsByGroup = new Map<string, string[]>();
  for (const i of input.issues) {
    if (!i.groupId) continue;
    const arr = instanceIdsByGroup.get(i.groupId);
    if (arr) arr.push(i.id);
    else instanceIdsByGroup.set(i.groupId, [i.id]);
  }

  const payload = {
    schemaVersion: "percevia-report-v1",
    comparisonProfile: input.comparisonProfile ?? null,
    comparisonEvidence: input.comparisonEvidence ?? null,
    report: {
      title: input.title,
      workspaceName: input.workspaceName,
      generatedAt: new Date().toISOString(),
    },
    scan: {
      id: input.scanId,
      baseUrl: input.baseUrl,
      pagesScanned: input.pagesScanned,
      pagesFailedToScan,
      failedPageUrls,
      scanDate: input.scanDate.toISOString(),
    },
    summary: {
      counts: input.counts,
      total:
        input.counts.critical +
        input.counts.moderate +
        input.counts.minor +
        input.counts.review,
    },
    groups: (input.groups ?? []).map((g) => ({
      id: g.id,
      ruleId: g.ruleId,
      title: g.title,
      severity: g.severity,
      affectedCount: g.affectedCount,
      primaryWcagTag: g.primaryWcagTag,
      recommendedFix: g.recommendedFix,
      priority: g.priority,
      instanceIds: instanceIdsByGroup.get(g.id) ?? [],
    })),
    issues: input.issues.map((i) => ({
      id: i.id,
      groupId: i.groupId ?? null,
      ruleId: i.ruleId,
      severity: i.severity,
      impact: i.impact,
      wcagTags: i.wcagTags,
      pageUrl: i.pageUrl,
      pageTitle: i.pageTitle,
      description: i.description,
      help: i.help,
      helpUrl: i.helpUrl ?? null,
      htmlSnippet: i.htmlSnippet ?? null,
      screenshot: i.evidence
        ? {
            captured: true,
            selector: i.evidence.selector,
            redactionApplied: i.evidence.redactionApplied,
          }
        : { captured: false },
    })),
    disclaimer: DISCLAIMER,
  };
  return JSON.stringify(payload, null, 2);
}

function pagesSection(input: ReportInput, n: number): string {
  const byPage = new Map<
    string,
    { critical: number; moderate: number; minor: number; review: number }
  >();
  for (const issue of input.issues) {
    const key = issue.pageUrl ?? input.baseUrl;
    const row = byPage.get(key) ?? { critical: 0, moderate: 0, minor: 0, review: 0 };
    if (issue.severity in row) row[issue.severity as keyof typeof row] += 1;
    byPage.set(key, row);
  }
  if (byPage.size === 0) return "";
  return `
  <h2>${n}. Findings by page</h2>
  <table>
    <thead><tr><th>Page</th><th>Critical</th><th>Moderate</th><th>Minor</th><th>Review</th></tr></thead>
    <tbody>
      ${[...byPage.entries()]
        .map(
          ([url, c]) =>
            `<tr><td><code>${escapeHtml(url)}</code></td><td>${c.critical}</td><td>${c.moderate}</td><td>${c.minor}</td><td>${c.review}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function wcagSection(input: ReportInput, n: number): string {
  const byTag = new Map<string, number>();
  for (const issue of input.issues) {
    for (const tag of issue.wcagTags.filter((t) => /^wcag/.test(t))) {
      byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
    }
  }
  if (byTag.size === 0) return "";
  const rows = [...byTag.entries()].sort((a, b) => b[1] - a[1]);
  return `
  <h2>${n}. WCAG mapping</h2>
  <table>
    <thead><tr><th>WCAG tag</th><th>Findings</th></tr></thead>
    <tbody>
      ${rows
        .map(
          ([tag, count]) =>
            `<tr><td><code>${escapeHtml(tag)}</code></td><td>${count}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function renderEvidence(i: ReportInputIssue): string {
  if (!i.evidence) return "";
  const selector = i.evidence.selector
    ? `<span class="evidence-meta">Selector: <code>${escapeHtml(i.evidence.selector)}</code></span>`
    : "";
  const redacted = i.evidence.redactionApplied
    ? `<span class="redacted">Sensitive regions redacted</span>`
    : "";
  return `<div class="evidence">
    <img src="${i.evidence.dataUri}" alt="Visual evidence for ${escapeHtml(i.ruleId)}" />
    <div class="evidence-meta">${selector} ${redacted}</div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** One roadmap stage: a severity band plus the fixes that belong in it. */
interface RoadmapEntry {
  title: string;
  ruleId: string;
  count: number;
  fix: string | null;
}

interface RoadmapStage {
  label: string;
  rationale: string;
  entries: RoadmapEntry[];
}

const ROADMAP_BANDS: Array<{ severity: string; label: string; rationale: string }> = [
  {
    severity: "critical",
    label: "Now — blocking",
    rationale: "These findings block people from completing the task at all.",
  },
  {
    severity: "moderate",
    label: "Next — degrading",
    rationale: "The task stays possible but materially harder for assistive-technology users.",
  },
  {
    severity: "minor",
    label: "Then — polish",
    rationale: "Lower-impact findings worth clearing once the bands above are done.",
  },
  {
    severity: "review",
    label: "Needs a human decision",
    rationale: "Automated checks could not decide these; they are not scheduled work until someone reviews them.",
  },
];

/**
 * Build the roadmap out of this scan's findings.
 *
 * Earlier versions printed a fixed "Week 1 / Week 2 / Week 3" plan naming
 * checkout and product-detail pages, which was wrong for every site that has
 * neither. Sequencing now comes from the grouped findings (or, when grouping is
 * unavailable, from rule-level counts) so the report only recommends work the
 * scan actually found.
 */
function buildRoadmapStages(
  groups: ReportGroup[],
  issues: ReportInputIssue[]
): RoadmapStage[] {
  const entriesBySeverity = new Map<string, RoadmapEntry[]>();

  if (groups.length > 0) {
    for (const group of groups) {
      const bucket = entriesBySeverity.get(group.severity) ?? [];
      bucket.push({
        title: group.title,
        ruleId: group.ruleId,
        count: group.affectedCount,
        fix: group.recommendedFix,
      });
      entriesBySeverity.set(group.severity, bucket);
    }
  } else {
    // No grouping available — fall back to counting instances per rule.
    const byRule = new Map<string, RoadmapEntry & { severity: string }>();
    for (const issue of issues) {
      const key = `${issue.severity}:${issue.ruleId}`;
      const existing = byRule.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }
      byRule.set(key, {
        severity: issue.severity,
        title: issue.help || issue.ruleId,
        ruleId: issue.ruleId,
        count: 1,
        fix: null,
      });
    }
    for (const { severity, ...entry } of byRule.values()) {
      const bucket = entriesBySeverity.get(severity) ?? [];
      bucket.push(entry);
      entriesBySeverity.set(severity, bucket);
    }
  }

  return ROADMAP_BANDS.flatMap((band) => {
    const entries = (entriesBySeverity.get(band.severity) ?? []).sort(
      (a, b) => b.count - a.count
    );
    if (entries.length === 0) return [];
    return [{ label: band.label, rationale: band.rationale, entries }];
  });
}

/** Distinct pages that produced findings, capped so the list stays readable. */
function scannedPageUrls(issues: ReportInputIssue[]): string[] {
  const seen = new Set<string>();
  for (const issue of issues) {
    if (issue.pageUrl) seen.add(issue.pageUrl);
  }
  return Array.from(seen).slice(0, 8);
}

/**
 * The recorded human verdicts, plus what is still outstanding.
 *
 * This is the difference between a report that says "someone should do a
 * keyboard pass" and one that says "Ada did the keyboard pass on 3 March and
 * it failed, here is the note". Only the second is audit evidence, which is
 * why the verdicts are stored per scan with a reviewer and a revision rather
 * than in the reviewer's browser.
 */
function renderManualReviews(reviews: ReportManualReview[]): string {
  const recorded = reviews.filter((r) => r.status !== "pending");
  const outstanding = MANUAL_CHECKS.filter(
    (c) => !recorded.some((r) => r.checkId === c.id)
  );

  const recordedHtml = recorded.length
    ? `<table>
    <thead><tr><th>Check</th><th>Result</th><th>WCAG</th><th>Reviewer</th><th>Recorded</th></tr></thead>
    <tbody>
      ${recorded
        .map(
          (r) => `<tr>
        <td>${escapeHtml(r.title)}${r.notes ? `<br/><span style="color:#6B7590;font-size:12px">${escapeHtml(r.notes)}</span>` : ""}</td>
        <td><span class="pill pill-${r.status === "passed" ? "minor" : "critical"}">${r.status === "passed" ? "Passed" : "Failed"}</span></td>
        <td>${r.wcagCriteria.map((c) => `<code>${escapeHtml(c)}</code>`).join(" ")}</td>
        <td>${escapeHtml(r.reviewerName ?? "Unattributed")}</td>
        <td>${escapeHtml(r.reviewedAt.toLocaleDateString())}${r.revision > 1 ? ` (rev ${r.revision})` : ""}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>`
    : `<p style="color:#6B7590;font-size:13px">No manual review has been recorded for this scan yet, so nothing below has been checked by a person.</p>`;

  const outstandingHtml = outstanding.length
    ? `<p style="color:#6B7590;font-size:13px;margin-top:10px">Still outstanding:</p>
  <ul>${outstanding.map((c) => `<li>${escapeHtml(c.title)} (${c.wcagCriteria.join(", ")})</li>`).join("")}</ul>`
    : `<p style="color:#6B7590;font-size:13px;margin-top:10px">Every guided check has a recorded result.</p>`;

  return recordedHtml + outstandingHtml;
}

function renderPageList(urls: string[]): string {
  return urls.map((url) => `<code>${escapeHtml(url)}</code>`).join(", ");
}
