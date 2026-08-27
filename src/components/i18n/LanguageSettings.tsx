"use client";

import { useState } from "react";
import { Check, Languages } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "./LanguageProvider";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

const choices: Array<{ locale: Locale; label: string; detail: string }> = [
  { locale: "en", label: "English", detail: "Use the interface in English." },
  { locale: "tr", label: "Türkçe", detail: "Arayüzü Türkçe kullanın." },
];

export function LanguageSettings() {
  const { locale, setLocale } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectLocale(nextLocale: Locale) {
    if (nextLocale === locale || busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    const previousLocale = locale;
    setLocale(nextLocale);

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (!response.ok) throw new Error("Account preference could not be updated.");
      setMessage("Language preference saved to your account.");
    } catch {
      setLocale(previousLocale);
      setError("Language preference could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Languages className="size-5 text-blue-700" aria-hidden />
          <CardTitle>Language</CardTitle>
        </div>
        <CardDescription>
          Choose the language used across Percevia AI. Technical terms and standards keep their official names.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Interface language">
          {choices.map((choice) => {
            const selected = locale === choice.locale;
            return (
              <button
                key={choice.locale}
                type="button"
                aria-pressed={selected}
                disabled={busy}
                onClick={() => void selectLocale(choice.locale)}
                className={cn(
                  "flex min-h-24 items-start justify-between rounded-lg border p-4 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                  selected
                    ? "border-blue-700 bg-blue-50 text-blue-950"
                    : "border-line bg-paper text-ink-900 hover:border-blue-300 hover:bg-blue-50/40",
                  busy && "cursor-wait opacity-70"
                )}
              >
                <span>
                  <span className="block text-base font-semibold">{choice.label}</span>
                  <span className="mt-1 block text-sm text-ink-600">{choice.detail}</span>
                </span>
                {selected && <Check className="size-5 shrink-0 text-blue-700" aria-label="Selected" />}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-ink-600">
          Your selection is saved on this device and synchronized with your account.
        </p>
        <div aria-live="polite" className="mt-2 min-h-5 text-sm">
          {message && <p className="text-green-700">{message}</p>}
          {error && <p className="text-rose-700">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
