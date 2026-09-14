import { describe, expect, it } from "vitest";
import { isLocale, normalizeLocale } from "./config";
import { hasTurkishTranslation, translateMessage } from "./translate";

describe("locale configuration", () => {
  it("accepts only supported locale values", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("tr")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  it("normalizes Turkish browser locale values and defaults to English", () => {
    expect(normalizeLocale("tr-TR")).toBe("tr");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
  });
});

describe("translateMessage", () => {
  it("translates catalogued UI copy and preserves surrounding whitespace", () => {
    expect(translateMessage("  Workspace settings\n", "tr")).toBe(
      "  Çalışma alanı ayarları\n"
    );
  });

  it("keeps English and unknown user content unchanged", () => {
    expect(translateMessage("Workspace settings", "en")).toBe("Workspace settings");
    expect(translateMessage("A user-provided project name", "tr")).toBe(
      "A user-provided project name"
    );
  });

  it("preserves official technical terms", () => {
    expect(translateMessage("WCAG 2.2 AA", "tr")).toBe("WCAG 2.2 AA");
    expect(translateMessage("Next.js", "tr")).toBe("Next.js");
    expect(hasTurkishTranslation("Save changes")).toBe(true);
  });

  it("substitutes {vars} after translation", () => {
    expect(
      translateMessage("{count} scans per day", "tr", { count: 50 })
    ).toBe("Günde 50 tarama");
    expect(
      translateMessage("Up to {count} pages per scan", "tr", { count: 3 })
    ).toBe("Tarama başına en fazla 3 sayfa");
  });

  it("substitutes vars in English fallback without a catalog entry", () => {
    expect(
      translateMessage("{count} widgets", "en", { count: 2 })
    ).toBe("2 widgets");
    expect(
      translateMessage("An untranslated {thing}", "tr", { thing: "sprocket" })
    ).toBe("An untranslated sprocket");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(translateMessage("{count} scans per day", "tr")).toBe(
      "Günde {count} tarama"
    );
  });
});
