/**
 * Server-side PDF rendering for reports.
 *
 * Takes the same `ReportInput` as `renderHtml()` / `renderCsv()` so all
 * three export formats stay derived from one data shape — no second
 * content model to drift.
 *
 * Implemented with `pdf-lib` (pure JS, no native binary, no Chromium),
 * so a PDF export works in a serverless request the same way CSV does:
 * synchronously, with no queue, object storage, or worker required.
 *
 * Layout mirrors the HTML report's section order:
 *   1. Executive summary (+ severity counters)
 *   2. Scan scope & limitations
 *   3. Findings by severity
 *   4. Remediation roadmap
 *   5. Human review checklist
 *   + the non-legal disclaimer, always last.
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import type { ReportInput, ReportInputIssue } from "@/lib/reports/render";

const DISCLAIMER = COMPLIANCE_COPY.REPORT_NOT_LEGAL;

// A4 in PostScript points.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const INK_900 = rgb(0.055, 0.078, 0.133);
const INK_600 = rgb(0.294, 0.333, 0.439);
const INK_400 = rgb(0.42, 0.46, 0.56);
const LINE = rgb(0.894, 0.909, 0.941);

const SEVERITY_COLORS: Record<string, RGB> = {
  critical: rgb(0.541, 0.184, 0.251),
  moderate: rgb(0.549, 0.384, 0.09),
  minor: rgb(0.165, 0.314, 0.749),
  review: rgb(0.369, 0.31, 0.851),
};

const SEVERITY_ORDER = ["critical", "moderate", "minor", "review"] as const;

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
}

/**
 * Cursor over a growing set of pages. Every write goes through here so
 * pagination is handled in exactly one place: `space()` reports whether
 * the requested block fits, and `break()` starts a fresh page.
 */
class Layout {
  page: PDFPage;
  y: number;
  private pageNumber = 1;

  constructor(private readonly doc: PDFDocument, private readonly fonts: Fonts) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
    this.stampFooter();
  }

  /** Vertical room left on the current page. */
  get remaining(): number {
    return this.y - MARGIN_BOTTOM;
  }

  newPage(): void {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pageNumber += 1;
    this.y = PAGE_HEIGHT - MARGIN_TOP;
    this.stampFooter();
  }

  /** Start a new page unless `height` still fits on the current one. */
  ensure(height: number): void {
    if (this.remaining < height) this.newPage();
  }

  move(dy: number): void {
    this.y -= dy;
  }

  private stampFooter(): void {
    const label = `Page ${this.pageNumber}`;
    this.page.drawText(label, {
      x: PAGE_WIDTH - MARGIN_X - this.fonts.regular.widthOfTextAtSize(label, 9),
      y: MARGIN_BOTTOM - 24,
      size: 9,
      font: this.fonts.regular,
      color: INK_400,
    });
    this.page.drawText("Prepared with maitrico AccessOps AI", {
      x: MARGIN_X,
      y: MARGIN_BOTTOM - 24,
      size: 9,
      font: this.fonts.regular,
      color: INK_400,
    });
  }
}

/**
 * `pdf-lib`'s standard fonts are WinAnsi-encoded and throw on characters
 * outside that range. Scanned pages routinely carry emoji, CJK, or
 * Turkish glyphs in their titles and issue text, so everything is folded
 * to a safe subset before it reaches the font.
 */
function toWinAnsi(text: string): string {
  return text
    .normalize("NFKD")
    // Strip combining marks so Turkish and accented letters fold to ASCII.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    // Anything still outside printable Latin-1 is dropped rather than
    // crashing the export.
    .replace(/[^\x20-\x7e\xa1-\xff]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const safe = toWinAnsi(text).replace(/\s+/g, " ").trim();
  if (!safe) return [];

  const lines: string[] = [];
  let line = "";

  for (const word of safe.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    // A single word wider than the column (long URLs, selectors) is
    // hard-split so it can never overflow the page.
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let chunk = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(chunk + char, size) > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      line = chunk;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface TextOptions {
  font: PDFFont;
  size: number;
  color?: RGB;
  lineHeight?: number;
  x?: number;
  maxWidth?: number;
}

/** Draw wrapped text at the cursor, paginating as needed. */
function drawParagraph(layout: Layout, text: string, opts: TextOptions): void {
  const size = opts.size;
  const lineHeight = opts.lineHeight ?? size * 1.45;
  const x = opts.x ?? MARGIN_X;
  const maxWidth = opts.maxWidth ?? CONTENT_WIDTH;

  for (const line of wrap(text, opts.font, size, maxWidth)) {
    layout.ensure(lineHeight);
    layout.move(lineHeight);
    layout.page.drawText(line, {
      x,
      y: layout.y,
      size,
      font: opts.font,
      color: opts.color ?? INK_900,
    });
  }
}

function drawHeading(layout: Layout, text: string, fonts: Fonts): void {
  layout.ensure(40);
  layout.move(26);
  layout.page.drawText(toWinAnsi(text), {
    x: MARGIN_X,
    y: layout.y,
    size: 14,
    font: fonts.bold,
    color: INK_900,
  });
  layout.move(6);
}

function drawBullets(layout: Layout, items: string[], fonts: Fonts): void {
  for (const item of items) {
    layout.ensure(16);
    layout.move(14);
    layout.page.drawText("-", {
      x: MARGIN_X,
      y: layout.y,
      size: 10,
      font: fonts.regular,
      color: INK_600,
    });
    const lines = wrap(item, fonts.regular, 10, CONTENT_WIDTH - 14);
    lines.forEach((line, i) => {
      if (i > 0) {
        layout.ensure(14);
        layout.move(14);
      }
      layout.page.drawText(line, {
        x: MARGIN_X + 14,
        y: layout.y,
        size: 10,
        font: fonts.regular,
        color: INK_900,
      });
    });
  }
}

function drawStatCards(
  layout: Layout,
  counts: ReportInput["counts"],
  fonts: Fonts
): void {
  const cards: { label: string; value: number; severity: string }[] = [
    { label: "Critical", value: counts.critical, severity: "critical" },
    { label: "Moderate", value: counts.moderate, severity: "moderate" },
    { label: "Minor", value: counts.minor, severity: "minor" },
    { label: "Needs review", value: counts.review, severity: "review" },
  ];

  const gap = 10;
  const cardWidth = (CONTENT_WIDTH - gap * (cards.length - 1)) / cards.length;
  const cardHeight = 52;

  layout.ensure(cardHeight + 16);
  layout.move(cardHeight + 8);

  cards.forEach((card, i) => {
    const x = MARGIN_X + i * (cardWidth + gap);
    layout.page.drawRectangle({
      x,
      y: layout.y,
      width: cardWidth,
      height: cardHeight,
      borderColor: LINE,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    layout.page.drawText(String(card.value), {
      x: x + 10,
      y: layout.y + cardHeight - 24,
      size: 18,
      font: fonts.bold,
      color: SEVERITY_COLORS[card.severity] ?? INK_900,
    });
    layout.page.drawText(card.label.toUpperCase(), {
      x: x + 10,
      y: layout.y + 12,
      size: 7.5,
      font: fonts.bold,
      color: INK_600,
    });
  });
}

const TABLE_COLUMNS = [
  { key: "rule", label: "Rule", width: 0.22 },
  { key: "page", label: "Page", width: 0.24 },
  { key: "wcag", label: "WCAG", width: 0.14 },
  { key: "finding", label: "Finding", width: 0.4 },
] as const;

function columnWidths(): number[] {
  return TABLE_COLUMNS.map((c) => c.width * CONTENT_WIDTH);
}

function drawTableHeader(layout: Layout, fonts: Fonts): void {
  const widths = columnWidths();
  layout.ensure(24);
  layout.move(16);
  let x = MARGIN_X;
  TABLE_COLUMNS.forEach((col, i) => {
    layout.page.drawText(col.label.toUpperCase(), {
      x,
      y: layout.y,
      size: 7.5,
      font: fonts.bold,
      color: INK_600,
    });
    x += widths[i];
  });
  layout.move(5);
  layout.page.drawLine({
    start: { x: MARGIN_X, y: layout.y },
    end: { x: MARGIN_X + CONTENT_WIDTH, y: layout.y },
    thickness: 0.7,
    color: LINE,
  });
}

function drawIssueRow(
  layout: Layout,
  issue: ReportInputIssue,
  fonts: Fonts
): void {
  const widths = columnWidths();
  const pad = 6;
  const size = 8.5;
  const lineHeight = 11;

  const cells = [
    wrap(issue.ruleId, fonts.mono, size, widths[0] - pad),
    wrap(issue.pageUrl ?? "-", fonts.mono, size, widths[1] - pad),
    wrap(issue.wcagTags.join(" ") || "-", fonts.mono, size, widths[2] - pad),
    [
      ...wrap(issue.help, fonts.bold, size, widths[3] - pad),
      ...wrap(issue.description, fonts.regular, size, widths[3] - pad),
    ],
  ];

  const rowHeight = Math.max(...cells.map((c) => c.length)) * lineHeight + 10;

  // Repeat the header when a row pushes onto a new page, so a table
  // split across pages still reads as a table.
  if (layout.remaining < rowHeight + 12) {
    layout.newPage();
    drawTableHeader(layout, fonts);
  }

  layout.move(lineHeight);
  const rowTop = layout.y;

  cells.forEach((lines, colIndex) => {
    const x = MARGIN_X + widths.slice(0, colIndex).reduce((a, b) => a + b, 0);
    const helpLineCount =
      colIndex === 3 ? wrap(issue.help, fonts.bold, size, widths[3] - pad).length : 0;
    lines.forEach((line, lineIndex) => {
      const isMono = colIndex < 3;
      const isHelp = colIndex === 3 && lineIndex < helpLineCount;
      layout.page.drawText(line, {
        x,
        y: rowTop - lineIndex * lineHeight,
        size,
        font: isMono ? fonts.mono : isHelp ? fonts.bold : fonts.regular,
        color: colIndex === 3 && !isHelp ? INK_600 : INK_900,
      });
    });
  });

  layout.move(rowHeight - lineHeight);
  layout.page.drawLine({
    start: { x: MARGIN_X, y: layout.y + 4 },
    end: { x: MARGIN_X + CONTENT_WIDTH, y: layout.y + 4 },
    thickness: 0.5,
    color: LINE,
  });
}

export async function renderPdf(input: ReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(toWinAnsi(input.title));
  doc.setProducer("maitrico AccessOps AI");
  doc.setCreator("maitrico AccessOps AI");
  doc.setCreationDate(new Date());

  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  };

  const layout = new Layout(doc, fonts);
  const counts = input.counts;
  const totalFindings =
    counts.critical + counts.moderate + counts.minor + counts.review;

  // ----- Title block -----
  layout.move(12);
  layout.page.drawText("ACCESSIBILITY ASSESSMENT", {
    x: MARGIN_X,
    y: layout.y,
    size: 8,
    font: fonts.bold,
    color: INK_600,
  });
  layout.move(26);
  for (const line of wrap(input.title, fonts.bold, 22, CONTENT_WIDTH)) {
    layout.page.drawText(line, {
      x: MARGIN_X,
      y: layout.y,
      size: 22,
      font: fonts.bold,
      color: INK_900,
    });
    layout.move(26);
  }

  drawParagraph(
    layout,
    `${input.workspaceName} · ${input.baseUrl} · ${input.pagesScanned} pages · scanned ${input.scanDate.toLocaleDateString()}`,
    { font: fonts.regular, size: 10, color: INK_600 }
  );

  // ----- 1. Executive summary -----
  drawHeading(layout, "1. Executive summary", fonts);
  drawParagraph(
    layout,
    `AccessOps AI scanned ${input.pagesScanned} page(s) of ${input.baseUrl} against WCAG 2.2 ` +
      `AA-oriented checks via axe-core. The scan surfaced ${totalFindings} automated findings, of ` +
      `which ${counts.critical} are critical and ${counts.moderate} are moderate. ${counts.review} ` +
      `finding(s) require human review because automated checks could not fully decide.`,
    { font: fonts.regular, size: 10 }
  );
  drawStatCards(layout, counts, fonts);

  // ----- 2. Scope & limitations -----
  drawHeading(layout, "2. Scan scope & limitations", fonts);
  drawBullets(
    layout,
    [
      `Pages scanned: ${input.pagesScanned}`,
      "Standard: WCAG 2.2 AA-oriented (axe-core ruleset)",
      "Automated tools detect ~30-50% of accessibility issues; human review remains required.",
      "Authenticated pages and visual issues that require manual inspection were not covered.",
    ],
    fonts
  );

  // ----- 3. Findings by severity -----
  drawHeading(layout, "3. Findings by severity", fonts);
  for (const severity of SEVERITY_ORDER) {
    const items = input.issues.filter((i) => i.severity === severity);
    layout.ensure(30);
    layout.move(18);
    layout.page.drawText(
      `${severity.charAt(0).toUpperCase()}${severity.slice(1)} (${items.length})`,
      {
        x: MARGIN_X,
        y: layout.y,
        size: 11,
        font: fonts.bold,
        color: SEVERITY_COLORS[severity] ?? INK_900,
      }
    );

    if (items.length === 0) {
      drawParagraph(layout, "None.", {
        font: fonts.regular,
        size: 9.5,
        color: INK_600,
      });
      continue;
    }

    drawTableHeader(layout, fonts);
    for (const issue of items) drawIssueRow(layout, issue, fonts);
  }

  // ----- 4. Remediation roadmap -----
  drawHeading(layout, "4. Remediation roadmap", fonts);
  drawBullets(
    layout,
    [
      "Week 1 - Critical blockers. Address every critical finding before non-critical work.",
      "Week 2 - Forms & keyboard. Fix form labels, focus visibility, and keyboard traps.",
      "Week 3 - Structure. Headings, landmarks, page titles, language attributes.",
      "Ongoing. Manual screen-reader pass per release; quarterly multi-page scans.",
    ],
    fonts
  );

  // ----- 5. Human review checklist -----
  drawHeading(layout, "5. Human review checklist", fonts);
  drawBullets(
    layout,
    [
      "Keyboard-only walkthrough of primary user journeys",
      "Screen reader pass on home, product detail, checkout",
      "Mobile gesture and zoom test at 200% and 400%",
      "Reduced-motion preference verification",
      "Color/contrast manual sampling on hover, focus, and error states",
    ],
    fonts
  );

  // ----- Disclaimer (always last) -----
  layout.ensure(80);
  layout.move(30);
  layout.page.drawLine({
    start: { x: MARGIN_X, y: layout.y },
    end: { x: MARGIN_X + CONTENT_WIDTH, y: layout.y },
    thickness: 0.7,
    color: LINE,
  });
  layout.move(4);
  drawParagraph(layout, DISCLAIMER, {
    font: fonts.regular,
    size: 9,
    color: INK_600,
  });
  drawParagraph(layout, `Scan reference: ${input.scanId}`, {
    font: fonts.mono,
    size: 8,
    color: INK_400,
  });

  return doc.save();
}

/** Suggested download filename for a rendered report PDF. */
export function pdfFilename(reportId: string): string {
  return `accessops-report-${reportId}.pdf`;
}
