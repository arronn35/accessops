"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Briefcase, Code2, ShoppingBag, Layers, FolderSearch, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Checkbox } from "@/components/ui/Checkbox";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { PERSONAS } from "@/lib/onboarding/personas";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { scanSetupPath } from "@/lib/navigation/scan-handoff";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  agency: Briefcase,
  developer: Code2,
  ecommerce: ShoppingBag,
  saas: Layers,
  client_check: FolderSearch,
};

export function OnboardingClient({
  scanUrl,
  signedIn,
}: {
  scanUrl: string | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [attemptedContinue, setAttemptedContinue] = useState(false);
  // Copy renders through React state (never the DOM-mutating i18n observer):
  // role/ack toggles re-render this form and mutated text nodes throw
  // hydration #418. data-i18n-skip keeps the observer off this subtree.
  const { t } = useLanguage();

  const canContinue = Boolean(role && acknowledged);

  function continueNext() {
    setAttemptedContinue(true);
    if (!canContinue) return;
    // Carry the persona to setup. Signing in sits between the two, so it rides
    // in the callbackUrl rather than being dropped at the auth boundary.
    const setupPath = scanSetupPath(scanUrl, role);
    router.push(
      signedIn
        ? setupPath
        : `/auth/sign-in?callbackUrl=${encodeURIComponent(setupPath)}`
    );
  }

  return (
    <div className="min-h-screen bg-canvas-2 flex flex-col" data-i18n-skip>
      <header className="bg-paper border-b border-rule">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo variant="site" /></Link>
          <p className="text-xs text-ink-500">{t("Step 1 of 3")}</p>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 max-w-3xl w-full mx-auto px-4 lg:px-8 py-10 lg:py-16 focus:outline-none">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">{t("Welcome")}</p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          {t("What brings you to Percevia AI?")}
        </h1>
        <p className="text-sm text-ink-600 mt-2 max-w-xl">
          {t("Pick the option that fits best. We'll tailor the workspace, scans, and report templates to your context.")}
        </p>

        <fieldset className="mt-8">
          <legend className="sr-only">{t("Your role")}</legend>
          <ul className="space-y-2.5">
            {PERSONAS.map((r) => {
              const Icon = ICONS[r.id];
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
                        <p className="text-sm font-semibold text-ink-900">{t(r.label)}</p>
                        <p className="text-xs text-ink-600 mt-1 leading-relaxed">{t(r.body)}</p>
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="mt-8">
          <AlertCallout tone="info" icon={ShieldCheck} title={t("Product boundary")}>
            {t(COMPLIANCE_COPY.ONBOARDING_BOUNDARY)}
          </AlertCallout>
        </div>

        <div className="mt-6 rounded-lg bg-paper border border-rule p-4">
          <Checkbox
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            label={<span className="font-medium">{t(COMPLIANCE_COPY.ONBOARDING_ACK)}</span>}
            description={t("Percevia AI reports findings; it does not certify compliance.")}
          />
        </div>

        {attemptedContinue && !canContinue && (
          <AlertCallout tone="warning" icon={AlertCircle} title={t("Finish this step")} className="mt-5">
            {t("Choose a role and acknowledge the product boundary before continuing.")}
          </AlertCallout>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-ink-600 hover:text-ink-900">
            {t("← Back")}
          </Link>
          <button
            type="button"
            onClick={continueNext}
            aria-disabled={!canContinue}
            className={cn(
              "inline-flex items-center gap-2 h-11 px-5 rounded-md text-sm font-medium transition-colors",
              canContinue
                ? "bg-navy-900 text-paper hover:bg-navy-800"
                : "bg-canvas-2 text-ink-500 hover:bg-canvas-2"
            )}
          >
            {t("Continue")} <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </main>
    </div>
  );
}
