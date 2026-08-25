import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { mapIssueTags } from "@/lib/compliance/frameworks";

/**
 * Which standards and laws reference the criterion a finding failed.
 *
 * Reference information, not a verdict: a criterion being in scope for a
 * framework says nothing about whether the site as a whole conforms, and
 * automated testing only reaches part of any of these standards.
 */
export function StandardsCard({ wcagTags }: { wcagTags: readonly string[] }) {
  const mapping = mapIssueTags(wcagTags);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-sm">Standards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs text-ink-700">
        {mapping.bestPracticeOnly ? (
          <p className="leading-relaxed">
            This is a best-practice check. It maps to no WCAG success criterion,
            so no law below requires it — fixing it still improves the
            experience.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {mapping.criteria.map(({ criterion, en301549Clause }) => (
                <li key={criterion.num} className="border-l-2 border-rule pl-2.5">
                  <p className="font-semibold text-ink-900">
                    {criterion.num} {criterion.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-600">
                    Level {criterion.level} · WCAG {criterion.since}
                    {en301549Clause ? ` · EN 301 549 ${en301549Clause}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <div>
              <p className="eyebrow text-ink-600">Referenced by</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {mapping.frameworks.map((id) => (
                  <li key={id}>
                    <Badge tone="neutral" size="sm">
                      {FRAMEWORK_LABELS[id]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
        <p className="border-t border-line-soft pt-3 leading-relaxed text-ink-600">
          Mapping is informational. It does not certify conformance with any
          law or standard.
        </p>
      </CardContent>
    </Card>
  );
}

const FRAMEWORK_LABELS: Record<string, string> = {
  wcag21aa: "WCAG 2.1 AA",
  wcag22aa: "WCAG 2.2 AA",
  en301549: "EN 301 549",
  eaa: "EAA",
  section508: "Section 508",
  "ada-title-ii": "ADA Title II",
};
