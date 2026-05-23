import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Input, Label, Select, FieldHint } from "@/components/ui/Input";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { updateWorkspaceAction } from "@/lib/server/workspace-actions";

export const metadata = { title: "Workspace setup — AccessOps AI" };
export const dynamic = "force-dynamic";

export default async function WorkspaceSetupPage() {
  const { workspace } = await getCurrentWorkspaceOrRedirect();

  return (
    <div className="min-h-screen bg-canvas-2 flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo variant="wordmark" /></Link>
          <p className="text-xs text-ink-500">Step 2 of 3</p>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 max-w-3xl w-full mx-auto px-4 lg:px-8 py-10 lg:py-16 focus:outline-none">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
          Workspace setup
        </p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Set up your workspace
        </h1>
        <p className="text-sm text-ink-600 mt-2 max-w-xl">
          These defaults shape new scans and reports. You can change them later in Settings.
        </p>

        <form action={updateWorkspaceAction} className="mt-8 space-y-6">
          <input type="hidden" name="redirectTo" value="/app" />

          <div className="space-y-6 bg-paper rounded-lg ring-1 ring-line p-6">
            <div>
              <Label htmlFor="ws-name" required>Workspace name</Label>
              <Input
                id="ws-name"
                name="name"
                defaultValue={workspace.name}
                placeholder="e.g. Northwind Studios"
                required
              />
              <FieldHint>Visible to your team and on report headers.</FieldHint>
            </div>

            <div>
              <Label htmlFor="ws-site">Website or company name</Label>
              <Input
                id="ws-site"
                name="companyName"
                defaultValue={workspace.companyName ?? ""}
                placeholder="e.g. example.com"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ws-region">Region</Label>
                <Select id="ws-region" name="region" defaultValue={workspace.region}>
                  <option value="eu">EU</option>
                  <option value="us">US</option>
                  <option value="uk">UK</option>
                  <option value="ca">Canada</option>
                  <option value="other">Other</option>
                </Select>
                <FieldHint>Determines data residency for scans.</FieldHint>
              </div>
              <div>
                <Label htmlFor="ws-fw">Primary framework</Label>
                <Select id="ws-fw" name="framework" defaultValue={workspace.framework ?? "next"}>
                  <option value="html">HTML / CSS</option>
                  <option value="react">React</option>
                  <option value="next">Next.js</option>
                  <option value="shopify">Shopify</option>
                  <option value="wp">WordPress</option>
                  <option value="webflow">Webflow</option>
                  <option value="framer">Framer</option>
                  <option value="other">Other</option>
                </Select>
                <FieldHint>AI fix suggestions are tailored to this stack.</FieldHint>
              </div>
              <div>
                <Label htmlFor="ws-std">Target standard</Label>
                <Select id="ws-std" name="targetStandard" defaultValue={workspace.targetStandard}>
                  <option value="wcag22aa">WCAG 2.2 AA</option>
                  <option value="wcag21aa">WCAG 2.1 AA</option>
                  <option value="ada">ADA-oriented</option>
                  <option value="eaa">EAA-oriented</option>
                  <option value="508">Section 508</option>
                  <option value="en301">EN 301 549</option>
                  <option value="unsure">Unsure</option>
                </Select>
                <FieldHint className="flex items-center gap-1">
                  <HelpCircle className="size-3" aria-hidden />
                  Not sure? Pick &quot;Unsure&quot; — we&apos;ll explain options after your first scan.
                </FieldHint>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link href="/onboarding" className="text-sm text-ink-600 hover:text-ink-900">
              ← Back
            </Link>
            <button
              type="submit"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
            >
              Save &amp; continue <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
