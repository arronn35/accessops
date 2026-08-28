/**
 * AI Fix Assistant preset catalogue.
 *
 * Deliberately free of server-only imports so the assistant page can
 * render the picker without pulling the Anthropic SDK into the client
 * bundle. The prompt text each preset maps to lives server-side in
 * `assistant.ts`.
 */
export const ASSISTANT_PRESETS = [
  {
    id: "plan",
    label: "Remediation plan & sprint program",
    description: "Findings grouped into sequenced work items with acceptance checks.",
  },
  {
    id: "research",
    label: "Coding research on the failing rules",
    description: "Why each rule fails, the accepted fix pattern, and the trade-offs.",
  },
  {
    id: "code-fix",
    label: "Concrete code fixes",
    description: "Before/after code for each failing rule in your stack.",
  },
  {
    id: "explain",
    label: "Plain-language explanation",
    description: "What is wrong and who it affects, without jargon.",
  },
  {
    id: "test",
    label: "Test & QA checklist",
    description: "Manual and automated checks to verify the fixes landed.",
  },
  {
    id: "client",
    label: "Client-friendly summary",
    description: "A non-technical write-up you can send on.",
  },
] as const;

export type AssistantPresetId = (typeof ASSISTANT_PRESETS)[number]["id"];

export const ASSISTANT_PRESET_IDS = ASSISTANT_PRESETS.map((p) => p.id) as [
  AssistantPresetId,
  ...AssistantPresetId[],
];

export function isAssistantPreset(value: string): value is AssistantPresetId {
  return ASSISTANT_PRESET_IDS.includes(value as AssistantPresetId);
}

export function assistantPresetLabel(id: AssistantPresetId): string {
  return ASSISTANT_PRESETS.find((p) => p.id === id)?.label ?? id;
}
