/**
 * Onboarding personas.
 *
 * The first onboarding step asks who the visitor is and promises to tailor the
 * workspace to the answer. That promise only holds if the answer survives the
 * step: the choice is made before sign-in, so it has to travel through the
 * auth redirect and land on the workspace the user ends up in.
 *
 * Each persona names the concrete defaults it implies. If a persona cannot
 * change anything, it does not belong in the question.
 */
export interface PersonaDefinition {
  id: string;
  label: string;
  body: string;
  /** Framework preselected on the workspace setup form. */
  defaultFramework: string;
  /** One line shown at setup, so the tailoring is visible rather than implied. */
  setupHint: string;
}

export const PERSONAS: PersonaDefinition[] = [
  {
    id: "agency",
    label: "I am an agency",
    body: "I audit and manage accessibility across client websites.",
    defaultFramework: "other",
    setupHint:
      "Set up for agency work: name the workspace after your agency, and add a client workspace per site you audit.",
  },
  {
    id: "developer",
    label: "I am a developer",
    body: "I want code-aware fix suggestions for my own work.",
    defaultFramework: "next",
    setupHint:
      "Set up for development work: the framework below drives how code-level fix suggestions are phrased.",
  },
  {
    id: "ecommerce",
    label: "I own an e-commerce site",
    body: "I run a store and want to catch issues before customers do.",
    defaultFramework: "shopify",
    setupHint:
      "Set up for a store: checkout and product pages are usually where accessibility failures cost the most.",
  },
  {
    id: "saas",
    label: "I manage a SaaS product",
    body: "I want accessibility as part of our release cycle.",
    defaultFramework: "react",
    setupHint:
      "Set up for a product team: scans are most useful pointed at a staging URL on each release.",
  },
  {
    id: "client_check",
    label: "I am checking a client website",
    body: "I am doing a one-off check for someone else.",
    defaultFramework: "html",
    setupHint:
      "Set up for a one-off check: name the workspace after the site you are reviewing.",
  },
];

export const PERSONA_IDS = PERSONAS.map((p) => p.id);

/**
 * Personas arrive from a query string, so an unknown value is discarded rather
 * than stored or echoed back into the page.
 */
export function personaById(id: string | null | undefined): PersonaDefinition | null {
  if (!id) return null;
  return PERSONAS.find((p) => p.id === id) ?? null;
}
