/**
 * F09: onboarding asked "what brings you here?" and threw the answer away —
 * the choice lived in React state, and Continue navigated without it.
 *
 * The acceptance criterion is that two personas produce a materially different
 * starting point, so these assert the handoff and the defaults rather than the
 * presence of the question.
 */
import { describe, expect, it } from "vitest";
import { PERSONAS, PERSONA_IDS, personaById } from "./personas";
import { scanSetupPath } from "@/lib/navigation/scan-handoff";

describe("persona definitions", () => {
  it("gives every persona a concrete default, not just a label", () => {
    for (const persona of PERSONAS) {
      expect(persona.defaultFramework, persona.id).toBeTruthy();
      expect(persona.setupHint.length, persona.id).toBeGreaterThan(20);
    }
  });

  it("produces a different starting framework for different personas", () => {
    // If every persona resolved to the same defaults the question would be
    // decoration, which is what the finding was about.
    const frameworks = new Set(PERSONAS.map((p) => p.defaultFramework));
    expect(frameworks.size).toBeGreaterThan(1);

    expect(personaById("ecommerce")?.defaultFramework).toBe("shopify");
    expect(personaById("developer")?.defaultFramework).toBe("next");
  });

  it("gives each persona its own setup guidance", () => {
    const hints = new Set(PERSONAS.map((p) => p.setupHint));
    expect(hints.size).toBe(PERSONAS.length);
  });
});

describe("personaById", () => {
  it.each(PERSONA_IDS)("resolves the known persona %s", (id) => {
    expect(personaById(id)?.id).toBe(id);
  });

  it("discards anything it does not define", () => {
    // The value arrives in a query string, so it is attacker-supplied.
    expect(personaById("made-up")).toBeNull();
    expect(personaById("<script>alert(1)</script>")).toBeNull();
    expect(personaById("")).toBeNull();
    expect(personaById(null)).toBeNull();
    expect(personaById(undefined)).toBeNull();
  });
});

describe("scanSetupPath", () => {
  it("carries the persona so it survives the sign-in redirect", () => {
    expect(scanSetupPath(null, "agency")).toBe("/workspace/setup?persona=agency");
  });

  it("carries both the scan url and the persona", () => {
    const path = scanSetupPath("https://example.com/", "developer");
    expect(path).toContain("url=https%3A%2F%2Fexample.com%2F");
    expect(path).toContain("persona=developer");
  });

  it("stays unchanged when nothing was chosen", () => {
    expect(scanSetupPath(null)).toBe("/workspace/setup");
    expect(scanSetupPath(null, null)).toBe("/workspace/setup");
  });

  it("encodes a persona value rather than interpolating it raw", () => {
    // personaById rejects this at the far end, but the path must not be a
    // vector on its own.
    expect(scanSetupPath(null, "a&b=c")).toBe("/workspace/setup?persona=a%26b%3Dc");
  });
});
