"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label, Select, FieldHint } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { A11ySettingsPanel } from "@/components/accessibility/A11ySettingsPanel";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { Bell, Palette, User } from "lucide-react";
import { updateWorkspaceAction } from "@/lib/server/workspace-actions";

export interface SettingsWorkspace {
  name: string;
  companyName: string | null;
  region: string;
  framework: string | null;
  targetStandard: string;
}

export function SettingsClient({
  workspace,
  canEditWorkspace,
}: {
  workspace: SettingsWorkspace;
  canEditWorkspace: boolean;
}) {
  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1000px]">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">
          Settings
        </p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Workspace settings
        </h1>
      </header>

      <Tabs defaultValue="workspace">
        <TabsList className="flex-wrap">
          <TabsTrigger value="workspace"><User className="size-4 mr-1.5" aria-hidden />Workspace</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="size-4 mr-1.5" aria-hidden />Notifications</TabsTrigger>
          <TabsTrigger value="accessibility"><Palette className="size-4 mr-1.5" aria-hidden />Accessibility</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>Names and defaults for this workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              {!canEditWorkspace && (
                <AlertCallout tone="info" title="Read-only" className="mb-5">
                  Only workspace owners and admins can change these settings.
                </AlertCallout>
              )}
              <form action={updateWorkspaceAction} className="space-y-5">
                <div>
                  <Label htmlFor="ws-name">Workspace name</Label>
                  <Input
                    id="ws-name"
                    name="name"
                    defaultValue={workspace.name}
                    disabled={!canEditWorkspace}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ws-company">Website or company name</Label>
                  <Input
                    id="ws-company"
                    name="companyName"
                    defaultValue={workspace.companyName ?? ""}
                    disabled={!canEditWorkspace}
                    placeholder="e.g. example.com"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ws-region">Region</Label>
                    <Select
                      id="ws-region"
                      name="region"
                      defaultValue={workspace.region}
                      disabled={!canEditWorkspace}
                    >
                      <option value="eu">EU (Frankfurt)</option>
                      <option value="us">US (Virginia)</option>
                      <option value="uk">UK</option>
                      <option value="ca">Canada</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ws-fw">Primary framework</Label>
                    <Select
                      id="ws-fw"
                      name="framework"
                      defaultValue={workspace.framework ?? "next"}
                      disabled={!canEditWorkspace}
                    >
                      <option value="next">Next.js</option>
                      <option value="react">React</option>
                      <option value="html">HTML / CSS</option>
                      <option value="shopify">Shopify</option>
                      <option value="wp">WordPress</option>
                      <option value="webflow">Webflow</option>
                      <option value="framer">Framer</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ws-std">Target standard</Label>
                    <Select
                      id="ws-std"
                      name="targetStandard"
                      defaultValue={workspace.targetStandard}
                      disabled={!canEditWorkspace}
                    >
                      <option value="wcag22aa">WCAG 2.2 AA</option>
                      <option value="wcag21aa">WCAG 2.1 AA</option>
                      <option value="ada">ADA-oriented</option>
                      <option value="eaa">EAA-oriented</option>
                      <option value="508">Section 508</option>
                      <option value="en301">EN 301 549</option>
                      <option value="unsure">Unsure</option>
                    </Select>
                  </div>
                </div>
                <FieldHint>
                  These defaults pre-fill new scans. Individual scans can override them.
                  Privacy and AI-processing toggles live in the{" "}
                  <a href="/app/compliance" className="underline font-medium">
                    Privacy &amp; Compliance Center
                  </a>
                  .
                </FieldHint>
                {canEditWorkspace && (
                  <div>
                    <button
                      type="submit"
                      className="inline-flex items-center h-10 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
                    >
                      Save changes
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose when AccessOps AI emails you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 divide-y divide-line">
              <div className="pt-4 first:pt-0">
                <Switch
                  defaultChecked
                  label="Scan complete"
                  description="Email me when a scan I started finishes."
                />
              </div>
              <div className="pt-4">
                <Switch
                  defaultChecked
                  label="New critical findings"
                  description="Alert me if a scan introduces new critical issues."
                />
              </div>
              <div className="pt-4">
                <Switch
                  label="Weekly summary"
                  description="A Monday-morning roundup of workspace activity."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility">
          <Card>
            <CardContent className="pt-5">
              <A11ySettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
