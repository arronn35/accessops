import type { ScanJob } from "@/lib/data/types";

export interface ProjectFolderMeta {
  projectKey: string;
  projectLabel: string;
}

export function projectFolderForScan(
  scan: Pick<ScanJob, "projectId" | "baseUrl">
): ProjectFolderMeta {
  const explicitProject = scan.projectId?.trim();
  if (explicitProject) {
    return {
      projectKey: slugifyProjectKey(explicitProject),
      projectLabel: explicitProject,
    };
  }

  const host = hostFromUrl(scan.baseUrl);
  return {
    projectKey: slugifyProjectKey(host),
    projectLabel: host,
  };
}

export function fallbackProjectFolder(input: {
  projectKey?: string | null;
  projectLabel?: string | null;
  sourceUrl?: string | null;
  scanJobId?: string | null;
}): ProjectFolderMeta {
  const label = input.projectLabel?.trim() || hostFromUrl(input.sourceUrl ?? "") || "Manual tasks";
  return {
    projectKey: input.projectKey?.trim() || slugifyProjectKey(input.scanJobId || label),
    projectLabel: label,
  };
}

function slugifyProjectKey(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}

function hostFromUrl(url: string): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
