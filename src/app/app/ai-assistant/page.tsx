"use client";

import { useState } from "react";
import { Send, Sparkles, ShieldAlert, Code2, FileText, FlaskConical, MessageCircle, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AiSuggestionBlock } from "@/components/ai/AiSuggestionBlock";
import { CodeDiffBlock } from "@/components/ai/CodeDiffBlock";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { cn } from "@/lib/utils";

const PRESETS = [
  { id: "explain", label: "Explain issue in plain language", icon: MessageCircle },
  { id: "react", label: "Generate React fix", icon: Code2 },
  { id: "html", label: "Generate HTML / CSS fix", icon: Code2 },
  { id: "shopify", label: "Generate Shopify Liquid fix", icon: Code2 },
  { id: "wordpress", label: "WordPress guidance", icon: FileText },
  { id: "test", label: "Generate test checklist", icon: FlaskConical },
  { id: "client", label: "Draft client-friendly explanation", icon: MessageCircle },
];

const FRAMEWORKS = [
  { id: "react", label: "React / Next.js" },
  { id: "html", label: "HTML / CSS" },
  { id: "shopify", label: "Shopify Liquid" },
  { id: "wordpress", label: "WordPress" },
  { id: "webflow", label: "Webflow" },
  { id: "framer", label: "Framer" },
];

export default function AiAssistantPage() {
  const [framework, setFramework] = useState("react");
  const [prompt, setPrompt] = useState("");

  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1400px]">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="size-3.5 text-purple-600" aria-hidden /> AI Fix Assistant
        </p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Generate, explain, and review accessibility fixes
        </h1>
        <p className="text-sm text-ink-600 mt-1 max-w-2xl">
          Pick a preset action and a framework. The assistant produces an explanation and a code
          suggestion that you must review before applying.
        </p>
      </header>

      <AlertCallout
        tone="warning"
        icon={ShieldAlert}
        title="What this assistant will not do"
        className="mb-6"
      >
        <ul className="mt-2 space-y-1 list-disc list-inside marker:text-amber-500">
          <li>It will not claim your site is compliant with any law or standard.</li>
          <li>It will not issue or imply certification.</li>
          <li>It will not recommend accessibility overlays as a substitute for real fixes.</li>
        </ul>
      </AlertCallout>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Conversation column */}
        <div className="space-y-5 min-w-0">
          {/* Mock conversation */}
          <Card className="bg-canvas-2/40">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <span className="size-8 rounded-full bg-navy-900 text-paper inline-flex items-center justify-center text-xs font-semibold shrink-0">
                  EM
                </span>
                <div className="bg-paper rounded-lg ring-1 ring-line p-4 text-sm text-ink-900">
                  <p className="text-[11px] text-ink-500 mb-1.5">You · 2 min ago</p>
                  Explain the &quot;Add to cart&quot; button issue in plain language for our client,
                  Northwind Shop. Then generate a React fix.
                </div>
              </div>
            </CardContent>
          </Card>

          <AiSuggestionBlock title="Client-friendly explanation">
            <p>
              On the Copper French Press product page, your &ldquo;Add to cart&rdquo; button shows only an icon —
              no text label. People who use screen readers (software that reads pages aloud for blind
              and low-vision users) hear nothing but the word &ldquo;button&rdquo; when they reach it. They
              cannot tell what the button does, so many will give up before completing a purchase.
            </p>
            <p className="mt-3">
              The fix is small: give the button an accessible name. Either show text alongside the
              icon, or add a hidden label that screen readers can read. This change is invisible to
              sighted shoppers but transforms the page for assistive-tech users.
            </p>
          </AiSuggestionBlock>

          <AiSuggestionBlock title="React fix (Next.js compatible)">
            <CodeDiffBlock
              before={{
                label: "Before",
                language: "tsx",
                code: `<button className="btn-cart-icon" onClick={addToCart}>
  <CartIcon />
</button>`,
              }}
              after={{
                label: "After",
                language: "tsx",
                code: `<button
  className="btn-cart-icon"
  aria-label={\`Add \${product.name} to cart\`}
  onClick={addToCart}
>
  <CartIcon aria-hidden />
</button>`,
              }}
            />
            <p className="mt-3 text-xs text-ink-600 leading-relaxed">
              The product name is interpolated into the label so each instance is unique — important
              for users navigating by a list of buttons.
            </p>
          </AiSuggestionBlock>

          {/* Prompt area */}
          <Card>
            <CardContent className="pt-5">
              <label htmlFor="ai-prompt" className="block text-sm font-medium text-ink-700 mb-2">
                Ask the assistant
              </label>
              <textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Generate a Shopify Liquid fix for the icon-only search button"
                className="w-full rounded-md bg-paper px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-line shadow-[var(--shadow-soft)] placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="flex flex-wrap gap-1.5">
                  {FRAMEWORKS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFramework(f.id)}
                      aria-pressed={framework === f.id}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium ring-1 transition-colors",
                        framework === f.id
                          ? "bg-navy-900 text-paper ring-navy-900"
                          : "bg-paper text-ink-700 ring-line hover:bg-canvas-2"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-purple-500 text-paper text-sm font-medium hover:bg-purple-600"
                >
                  <Send className="size-4" aria-hidden /> Generate
                </button>
              </div>
              <p className="text-[11px] text-ink-500 mt-3 leading-relaxed">
                {COMPLIANCE_COPY.AI_DISCLOSURE}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — presets */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preset actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {PRESETS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-md hover:bg-canvas-2 text-sm text-ink-700 min-h-[40px]"
                      >
                        <Icon className="size-4 text-purple-600 shrink-0" aria-hidden />
                        <span>{p.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="size-4 text-ink-500" aria-hidden /> Scope
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-ink-700">
                Scan{" "}
                <span className="font-mono font-medium text-ink-900">sc_2025_05_12</span>
              </p>
              <p className="text-xs text-ink-500 mt-1">northwind-shop.example</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="ai" size="sm">AI on</Badge>
                <Badge tone="success" size="sm">Privacy mode</Badge>
                <Badge tone="neutral" size="sm">Screenshots off</Badge>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
