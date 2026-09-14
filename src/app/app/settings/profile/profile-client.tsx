"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldHint, Input, Label } from "@/components/ui/Input";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export function ProfileClient({
  name,
  fullName,
  email,
}: {
  name: string | null;
  fullName: string | null;
  email: string | null;
}) {
  const [displayName, setDisplayName] = useState(name ?? "");
  const [legalName, setLegalName] = useState(fullName ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Rendered copy goes through React state (never the DOM-mutating i18n
  // observer): this form re-renders on every keystroke/save, and
  // provider-mutated text nodes diverge from React's virtual DOM and throw
  // hydration #418. data-i18n-skip keeps the observer off this subtree
  // entirely.
  const { t } = useLanguage();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          fullName: legalName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Could not update profile.");
        return;
      }
      setMessage("Profile updated.");
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-lg ring-1 ring-line bg-paper p-6 space-y-5" data-i18n-skip>
      {email && (
        <div>
          <Label>{t("Email")}</Label>
          <Input value={email} disabled />
          <FieldHint>{t("Email changes require a new magic-link identity.")}</FieldHint>
        </div>
      )}

      <div>
        <Label htmlFor="display-name" required>{t("Display name")}</Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={120}
          required
        />
      </div>

      <div>
        <Label htmlFor="full-name">{t("Full name")}</Label>
        <Input
          id="full-name"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          maxLength={160}
        />
      </div>

      {error && <p className="text-sm text-rose-700">{t(error)}</p>}
      {message && <p className="text-sm text-green-700">{t(message)}</p>}

      <Button type="submit" disabled={busy}>
        {busy ? t("Saving...") : t("Save profile")}
      </Button>
    </form>
  );
}
