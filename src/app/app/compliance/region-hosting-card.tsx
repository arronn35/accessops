import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

const REGION_PREFERENCE_LABELS: Record<string, string> = {
  eu: "EU (Frankfurt)",
  us: "US (Virginia)",
  uk: "UK",
  ca: "Canada",
  other: "Other",
};

const HOSTING_OPTIONS = [
  {
    id: "eu",
    label: "EU (Belgium / europe-west1)",
    description:
      "Recommended deployment target; actual location follows the deployment configuration.",
    badge: "Default target",
    tone: "info" as const,
  },
  {
    id: "us",
    label: "US (Virginia)",
    description: "Available through an Enterprise infrastructure migration.",
    badge: "Enterprise",
    tone: "neutral" as const,
  },
  {
    id: "other",
    label: "Other (AU, UK, CA)",
    description: "Handled as a scoped Enterprise infrastructure migration.",
    badge: "Enterprise",
    tone: "neutral" as const,
  },
] as const;

export function RegionHostingCard({
  workspaceRegion,
}: {
  workspaceRegion: string;
}) {
  const preference =
    REGION_PREFERENCE_LABELS[workspaceRegion] ?? workspaceRegion;

  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="sr-only">Data residency</h3>
        <dl className="grid gap-4 sm:grid-cols-3">
          {HOSTING_OPTIONS.map((region) => (
            <div
              key={region.id}
              className="min-h-[88px] rounded-md bg-paper p-4 ring-1 ring-line"
            >
              <dt className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                {region.label}
                <Badge tone={region.tone} size="sm">
                  {region.badge}
                </Badge>
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-ink-600">
                {region.description}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-ink-600">
          Data residency is an infrastructure setting, not a toggle. Workspace
          storage follows the Firebase project configuration and scan processing
          follows the worker deployment configuration. Your saved workspace
          region preference is{" "}
          <strong className="font-semibold text-ink-900">{preference}</strong>;
          changing that preference does not move stored data or running
          workloads.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-600">
          To request a coordinated region migration,{" "}
          <a
            href="mailto:maitritechco@gmail.com?subject=Percevia%20data%20residency%20migration"
            className="font-medium text-blue-600 underline underline-offset-2"
          >
            contact us
          </a>
          . We confirm the target region and migration scope in writing before
          anything moves.
        </p>
      </CardContent>
    </Card>
  );
}
