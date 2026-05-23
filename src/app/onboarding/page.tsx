"use client";

import Link from "next/link";
import { useState } from "react";
import { Briefcase, Code2, ShoppingBag, Layers, FolderSearch, ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Checkbox } from "@/components/ui/Checkbox";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { cn } from "@/lib/utils";

const ROLES = [
  { id: "agency", label: "I am an agency", icon: Briefcase, body: "I audit and manage accessibility across client websites." },
  { id: "developer", label: "I am a developer", icon: Code2, body: "I want code-aware fix suggestions for my own work." },
  { id: "ecommerce", label: "I own an e-commerce site", icon: ShoppingBag, body: "I run a store and want to catch issues before customers do." },
  { id: "saas", label: "I manage a SaaS product", icon: Layers, body: "I want accessibility as part of our release cycle." },
  { id: "client_check", label: "I am checking a client website", icon: FolderSearch, body: "I&apos;m doing a one-off check for someone else." },
];

export default function OnboardingPage() {
  const [role, setRole] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const canContinue = role && acknowledged;

  return (
    <div className="min-h-screen bg-canvas-2 flex flex-col">
      <header className="bg-paper border-b border-line">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo variant="wordmark" /></Link>
          <p className="text-xs text-ink-500">Step 1 of 3</p>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 max-w-3xl w-full mx-auto px-4 lg:px-8 py-10 lg:py-16 focus:outline-none">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">Welcome</p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          What brings you to AccessOps AI?
        </h1>
        <p className="text-sm text-ink-600 mt-2 max-w-xl">
          Pick the option that fits best. We&apos;ll tailor the workspace, scans, and report templates
          to your context.
        </p>

        <fieldset className="mt-8">
          <legend className="sr-only">Your role</legend>
          <ul className="space-y-2.5">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <li key={r.id}>
                  <label
                    className={cn(
                      "block rounded-lg p-4 cursor-pointer ring-1 transition-colors bg-paper",
                      active
                        ? "ring-2 ring-navy-900 shadow-[var(--shadow-soft)]"
                        : "ring-line hover:bg-canvas-2"
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.id}
                      className="sr-only"
                      onChange={() => setRole(r.id)}
                      checked={active}
                    />
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "size-10 rounded-md inline-flex items-center justify-center shrink-0",
                          active ? "bg-navy-900 text-paper" : "bg-canvas-2 text-ink-700"
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink-900">{r.label}</p>
                        <p className="text-xs text-ink-600 mt-1 leading-relaxed">{r.body}</p>
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="mt-8">
          <AlertCallout tone="info" icon={ShieldCheck} title="Product boundary">
            {COMPLIANCE_COPY.ONBOARDING_BOUNDARY}
          </AlertCallout>
        </div>

        <div className="mt-6 rounded-lg bg-paper ring-1 ring-line p-4">
          <Checkbox
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            label={<span className="font-medium">{COMPLIANCE_COPY.ONBOARDING_ACK}</span>}
            description="You can revisit this acknowledgement anytime in the Privacy & Compliance Center."
          />
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-ink-600 hover:text-ink-900">
            ← Back
          </Link>
          <Link
            href={canContinue ? "/workspace/setup" : "#"}
            aria-disabled={!canContinue}
            className={cn(
              "inline-flex items-center gap-2 h-11 px-5 rounded-md text-sm font-medium transition-colors",
              canContinue
                ? "bg-navy-900 text-paper hover:bg-navy-800"
                : "bg-canvas-2 text-ink-400 cursor-not-allowed pointer-events-none"
            )}
          >
            Continue <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </main>
    </div>
  );
}
