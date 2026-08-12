export const FINDING_STATES = [
  "initial",
  "menu-open",
  "dialog-open",
  "accordion-open",
  "tab-open",
  "form-focus",
] as const;

const SEVERITIES = ["critical", "serious", "moderate", "minor", "review"] as const;
const VIEWPORTS = ["desktop", "tablet", "mobile", "multiple"] as const;

export type SeverityFilter = "all" | (typeof SEVERITIES)[number];
export type ViewportFilter = "all" | (typeof VIEWPORTS)[number];
export type FindingState = (typeof FINDING_STATES)[number];

export type FindingContext = {
  viewport: "desktop" | "tablet" | "mobile";
  state: FindingState;
};

export type FindingFilters = {
  severity: SeverityFilter;
  viewport: ViewportFilter;
  state: FindingState | null;
};

type SearchParamValue = string | string[] | undefined;

type FilterableFinding = {
  impact?: string | null;
  severity?: string | null;
  contextsJson?: readonly FindingContext[] | null;
};

export function parseFindingFilters(searchParams: {
  sev?: SearchParamValue;
  vp?: SearchParamValue;
  state?: SearchParamValue;
}): FindingFilters {
  const severity = isOneOf(searchParams.sev, SEVERITIES)
    ? searchParams.sev
    : "all";
  const viewport = isOneOf(searchParams.vp, VIEWPORTS)
    ? searchParams.vp
    : "all";
  const state = isOneOf(searchParams.state, FINDING_STATES)
    ? searchParams.state
    : null;

  return { severity, viewport, state };
}

export function filterFindings<T extends FilterableFinding>(
  findings: readonly T[],
  filters: FindingFilters
): T[] {
  return findings.filter(
    (finding) =>
      matchesSeverity(finding, filters.severity) &&
      matchesViewport(finding, filters.viewport) &&
      matchesState(finding, filters.state)
  );
}

export function buildFindingsFilterHref(
  scanId: string,
  current: FindingFilters,
  patch: {
    severity?: SeverityFilter | null;
    viewport?: ViewportFilter | null;
    state?: FindingState | null;
  }
): string {
  const nextFilters: FindingFilters = {
    severity:
      patch.severity === undefined ? current.severity : patch.severity ?? "all",
    viewport:
      patch.viewport === undefined ? current.viewport : patch.viewport ?? "all",
    state: patch.state === undefined ? current.state : patch.state,
  };
  const query = new URLSearchParams();

  if (nextFilters.severity !== "all") {
    query.set("sev", nextFilters.severity);
  }
  if (nextFilters.viewport !== "all") {
    query.set("vp", nextFilters.viewport);
  }
  if (nextFilters.state) {
    query.set("state", nextFilters.state);
  }

  const pathname = `/app/scans/${encodeURIComponent(scanId)}`;
  const queryString = query.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function summarizeFindingContexts(
  findings: ArrayLike<{ contextsJson?: readonly FindingContext[] | null }>
): {
  desktop: number;
  tablet: number;
  mobile: number;
  multiple: number;
  states: Record<FindingState, number>;
} {
  const summary = {
    desktop: 0,
    tablet: 0,
    mobile: 0,
    multiple: 0,
    states: {
      initial: 0,
      "menu-open": 0,
      "dialog-open": 0,
      "accordion-open": 0,
      "tab-open": 0,
      "form-focus": 0,
    },
  };

  for (let index = 0; index < findings.length; index++) {
    const contexts = findings[index].contextsJson ?? [];
    const viewports = new Set(contexts.map((context) => context.viewport));
    if (viewports.has("desktop")) summary.desktop++;
    if (viewports.has("tablet")) summary.tablet++;
    if (viewports.has("mobile")) summary.mobile++;
    if (viewports.size > 1) summary.multiple++;

    for (const state of new Set(contexts.map((context) => context.state))) {
      summary.states[state]++;
    }
  }

  return summary;
}

export function formatFindingState(state: FindingState): string {
  return state
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function matchesSeverity(
  finding: FilterableFinding,
  severity: SeverityFilter
): boolean {
  if (severity === "all") return true;
  if (severity === "review") return finding.severity === "review";
  return finding.impact === severity || finding.severity === severity;
}

function matchesViewport(
  finding: FilterableFinding,
  viewport: ViewportFilter
): boolean {
  if (viewport === "all") return true;
  const viewports = new Set(
    (finding.contextsJson ?? []).map((context) => context.viewport)
  );
  if (viewport === "multiple") return viewports.size > 1;
  return viewports.has(viewport);
}

function matchesState(
  finding: FilterableFinding,
  state: FindingState | null
): boolean {
  if (!state) return true;
  return (finding.contextsJson ?? []).some((context) => context.state === state);
}

function isOneOf<const T extends readonly string[]>(
  value: SearchParamValue,
  allowed: T
): value is T[number] {
  return typeof value === "string" && allowed.some((item) => item === value);
}
