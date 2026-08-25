import { describe, expect, it } from "vitest";
import {
  APPLY_STATE_SCRIPT,
  BROWSER_SCRIPTS,
  DOM_FINGERPRINT_SCRIPT,
  REVERT_STATE_SCRIPT,
  STATE_MARKER_ATTR,
  inlineScript,
} from "./browser-scripts";

/**
 * Regression guard for a bug that silently disabled every interactive-state
 * pass in production: the worker runs through tsx/esbuild, which rewrites
 * named arrows inside a `page.evaluate` callback into `__name(…)` calls. The
 * helper does not exist in the browser, so the callback threw
 * `ReferenceError: __name is not defined` and the scan reported "no menu on
 * this page" instead of an error.
 */
describe("browser scripts", () => {
  it("are plain strings, so no bundler can rewrite them", () => {
    for (const [name, script] of Object.entries(BROWSER_SCRIPTS)) {
      expect(typeof script, name).toBe("string");
    }
  });

  it("never reference bundler-injected helpers", () => {
    for (const [name, script] of Object.entries(BROWSER_SCRIPTS)) {
      expect(script, name).not.toMatch(/__name|__publicField|__decorateClass/);
    }
  });

  it("parse as JavaScript expressions", () => {
    for (const [name, script] of Object.entries(BROWSER_SCRIPTS)) {
      expect(() => new Function(`return (${script})`), name).not.toThrow();
    }
  });
});

describe("inlineScript", () => {
  it("wraps a script into a self-calling expression", () => {
    // page.evaluate(string) evaluates an expression and does NOT call a
    // function it produces — the call has to be part of the expression.
    expect(inlineScript("() => 42")).toBe("(() => 42)()");
    expect(new Function(`return ${inlineScript("() => 42")}`)()).toBe(42);
  });

  it("inlines the argument as JSON", () => {
    const expr = inlineScript("(arg) => arg.state", { state: "menu-open" });
    expect(expr).toContain('{"state":"menu-open"}');
    expect(new Function(`return ${expr}`)()).toBe("menu-open");
  });

  it("escapes line separators that are legal in JSON but not in JS", () => {
    const raw = "a\u2028b\u2029c";
    const expr = inlineScript("(arg) => arg.text", { text: raw });
    expect(expr).not.toMatch(/[\u2028\u2029]/);
    expect(new Function(`return ${expr}`)()).toBe(raw);
  });
});

/**
 * Executes the real page scripts against a hand-rolled DOM. Not a browser, but
 * enough to prove the control-flow the runner depends on: candidate selection,
 * the marker attribute, and reversion.
 */
describe("apply/revert against a minimal DOM", () => {
  function makeDom() {
    const attrs = new Map<string, Map<string, string>>();
    const clicked: string[] = [];
    const el = (id: string, tag: string, initial: Record<string, string> = {}) => {
      const map = new Map(Object.entries(initial));
      attrs.set(id, map);
      return {
        id,
        tagName: tag.toUpperCase(),
        textContent: initial["text"] ?? id,
        disabled: false,
        form: null,
        className: "",
        getAttribute: (k: string) => map.get(k) ?? null,
        setAttribute: (k: string, v: string) => void map.set(k, v),
        removeAttribute: (k: string) => void map.delete(k),
        hasAttribute: (k: string) => map.has(k),
        getBoundingClientRect: () => ({ width: 100, height: 20 }),
        scrollIntoView: () => undefined,
        click: () => clicked.push(id),
        focus: () => undefined,
        blur: () => undefined,
        closest: () => null,
      };
    };
    const menu = el("menu", "button", {
      "aria-expanded": "false",
      "aria-haspopup": "menu",
      text: "Menu",
    });
    const elements = [menu];
    const document = {
      querySelectorAll: (selector: string) =>
        selector.includes("button") ? elements : [],
      querySelector: (selector: string) => {
        const marker = selector.replace(/[[\]]/g, "");
        return elements.find((e) => e.hasAttribute(marker)) ?? null;
      },
      activeElement: null,
      body: { childElementCount: 1, innerText: "x", focus: () => undefined },
      dispatchEvent: () => true,
    };
    return { document, menu, clicked };
  }

  function run(script: string, arg: unknown, dom: ReturnType<typeof makeDom>) {
    const fn = new Function(
      "document",
      "window",
      "HTMLButtonElement",
      "HTMLAnchorElement",
      "HTMLDetailsElement",
      "KeyboardEvent",
      `return ${inlineScript(script, arg)}`
    );
    class Stub {}
    return fn(
      dom.document,
      { getComputedStyle: () => ({ visibility: "visible", display: "block" }) },
      Stub,
      Stub,
      Stub,
      class {
        constructor() {}
      }
    );
  }

  it("opens a menu, marks the element, and reverts it", () => {
    const dom = makeDom();
    const applied = run(
      APPLY_STATE_SCRIPT,
      { state: "menu-open", candidateIndex: 0, marker: STATE_MARKER_ATTR },
      dom
    );
    expect(applied).toBe(true);
    expect(dom.clicked).toEqual(["menu"]);
    expect(dom.menu.getAttribute(STATE_MARKER_ATTR)).toBe("1");

    const reverted = run(
      REVERT_STATE_SCRIPT,
      { state: "menu-open", marker: STATE_MARKER_ATTR },
      dom
    );
    expect(reverted).toBe(true);
    // Toggled back and the marker cleaned up, so the next candidate starts fresh.
    expect(dom.clicked).toEqual(["menu", "menu"]);
    expect(dom.menu.getAttribute(STATE_MARKER_ATTR)).toBeNull();
  });

  it("reports unavailable when the requested candidate does not exist", () => {
    const dom = makeDom();
    expect(
      run(
        APPLY_STATE_SCRIPT,
        { state: "menu-open", candidateIndex: 5, marker: STATE_MARKER_ATTR },
        dom
      )
    ).toBe(false);
  });

  it("treats a bare <button> outside a form as clickable", () => {
    // `button.type` is "submit" by default even with no form; the old guard
    // rejected every such button, which disabled menu/dialog/accordion states
    // on virtually every real site.
    expect(APPLY_STATE_SCRIPT).toContain("el.form");
  });

  it("fingerprints the DOM as a stable string", () => {
    const dom = makeDom();
    const fp = run(DOM_FINGERPRINT_SCRIPT, undefined, dom);
    expect(typeof fp).toBe("string");
    expect(fp.split("|")).toHaveLength(7);
  });
});
