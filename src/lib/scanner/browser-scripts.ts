/**
 * Code that runs INSIDE the scanned page, kept as strings on purpose.
 *
 * Why strings and not functions
 * -----------------------------
 * `page.evaluate(fn)` ships `fn.toString()` to the browser. The worker runs
 * through tsx/esbuild (`npx tsx worker/serve.ts`), and esbuild's `keepNames`
 * rewrites every named arrow inside that body to `__name(() => …, "name")`.
 * The `__name` helper only exists in the Node module scope, so the browser
 * throws `ReferenceError: __name is not defined` the moment the callback runs.
 *
 * The old runner swallowed that error as "state not available", which is why
 * every interactive-state pass (menu, dialog, accordion, tab, form focus)
 * silently did nothing in production while the scan still reported success.
 *
 * Playwright evaluates a string argument as an expression and, when it
 * produces a function, calls it with the serialized `arg`. Strings are opaque
 * to the bundler, so this class of failure cannot come back.
 *
 * Keep these bodies dependency-free, synchronous, and side-effect-light.
 */

/** Attribute stamped on the element a state was applied to. */
export const STATE_MARKER_ATTR = "data-percevia-state-target";

/**
 * Drives the page into an interactive state.
 * arg: { state, candidateIndex, marker } → boolean (state applied)
 */
export const APPLY_STATE_SCRIPT = `(arg) => {
  var state = arg.state, candidateIndex = arg.candidateIndex, marker = arg.marker;
  var danger = /(checkout|payment|pay|purchase|buy|order|cart|delete|remove|destroy|subscribe|sign\\s?out|log\\s?out)/i;

  function visible(el) {
    var rect = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }
  function label(el) {
    return [
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("data-testid"),
      el.getAttribute("id"),
      el.textContent,
    ].filter(Boolean).join(" ").trim();
  }
  function safe(el) {
    if (!visible(el) || danger.test(label(el))) return false;
    if (el instanceof HTMLButtonElement) {
      if (el.disabled) return false;
      // A bare <button> reports type "submit" even outside a form. Only a
      // button that would really submit something is unsafe to click.
      if (el.form && el.type !== "button" && el.type !== "reset") return false;
    }
    if (el instanceof HTMLAnchorElement) {
      var href = el.getAttribute("href") || "";
      if (href && href !== "#" && href.charAt(0) !== "#" && href.indexOf("javascript:") !== 0) return false;
    }
    return true;
  }
  function mark(el) { el.setAttribute(marker, "1"); }
  function activate(el) {
    mark(el);
    el.scrollIntoView({ block: "center", inline: "center" });
    el.click();
    return true;
  }

  var buttonish = Array.prototype.slice
    .call(document.querySelectorAll("button,[role='button'],summary"))
    .filter(safe);
  var candidates = [];

  if (state === "menu-open") {
    candidates = buttonish.filter(function (el) {
      var text = label(el);
      return el.getAttribute("aria-expanded") === "false" &&
        (/menu|navigation|nav|hamburger/i.test(text) ||
          el.getAttribute("aria-haspopup") === "menu" ||
          /menu|nav/i.test(el.getAttribute("aria-controls") || ""));
    });
  } else if (state === "dialog-open") {
    candidates = buttonish.filter(function (el) {
      var text = label(el);
      return el.getAttribute("aria-haspopup") === "dialog" ||
        /modal|dialog/i.test(text) ||
        /modal|dialog/i.test(el.getAttribute("aria-controls") || "");
    });
  } else if (state === "accordion-open") {
    candidates = buttonish.filter(function (el) {
      if (el.tagName.toLowerCase() === "summary") return true;
      var text = label(el);
      return el.getAttribute("aria-expanded") === "false" &&
        !/menu|navigation|nav|modal|dialog/i.test(text) &&
        el.getAttribute("aria-haspopup") !== "menu" &&
        el.getAttribute("aria-haspopup") !== "dialog";
    });
  } else if (state === "tab-open") {
    candidates = Array.prototype.slice
      .call(document.querySelectorAll("[role='tab'][aria-selected='false']"))
      .filter(safe);
  } else if (state === "form-focus") {
    candidates = Array.prototype.slice
      .call(document.querySelectorAll(
        "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']),textarea,select,[contenteditable='true']"
      ))
      .filter(function (el) { return visible(el) && !el.disabled; });
    var field = candidates[candidateIndex];
    if (!field) return false;
    mark(field);
    field.scrollIntoView({ block: "center", inline: "center" });
    field.focus({ preventScroll: true });
    return document.activeElement === field;
  }

  var target = candidates[candidateIndex];
  return target ? activate(target) : false;
}`;

/**
 * Undoes exactly the element APPLY_STATE_SCRIPT touched.
 * arg: { state, marker } → boolean (reversion attempted successfully)
 */
export const REVERT_STATE_SCRIPT = `(arg) => {
  var state = arg.state, marker = arg.marker;
  var target = document.querySelector("[" + marker + "]");
  if (!target) return false;
  target.removeAttribute(marker);

  if (state === "form-focus") {
    if (typeof target.blur === "function") target.blur();
    if (document.activeElement === target && document.body) document.body.focus();
    return document.activeElement !== target;
  }

  // Toggling the same control closes menus, dialogs and accordions; Escape
  // covers dialogs that only listen for the keyboard.
  if (typeof target.click === "function") target.click();
  if (state === "dialog-open") {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
  }
  if (target instanceof HTMLDetailsElement) target.open = false;
  var details = target.closest ? target.closest("details") : null;
  if (details) details.open = false;
  return true;
}`;

/**
 * Cheap signature of the parts of the DOM an interactive state changes.
 * Used to skip no-op passes and to prove a state was fully reverted.
 * arg: none → string
 */
export const DOM_FINGERPRINT_SCRIPT = `() => {
  var expanded = document.querySelectorAll('[aria-expanded="true"]').length;
  var dialogs = document.querySelectorAll('dialog[open],[role="dialog"]:not([aria-hidden="true"]):not([hidden])').length;
  var openDetails = document.querySelectorAll("details[open]").length;
  var selectedTabs = Array.prototype.slice
    .call(document.querySelectorAll('[role="tab"][aria-selected="true"]'))
    .map(function (el) { return el.getAttribute("id") || (el.textContent || "").trim().slice(0, 24); })
    .join(",");
  var active = document.activeElement;
  var focus = active
    ? active.tagName + "#" + (active.id || "") + "." + String(active.className || "").slice(0, 32)
    : "none";
  var body = document.body;
  return [
    expanded,
    dialogs,
    openDetails,
    selectedTabs,
    focus,
    body ? body.childElementCount : 0,
    body && body.innerText ? body.innerText.length : 0,
  ].join("|");
}`;

/** Collects same-page anchor hrefs. arg: none → string[] */
export const COLLECT_LINKS_SCRIPT = `() => Array.prototype.slice
  .call(document.querySelectorAll("a[href]"))
  .map(function (a) { return a.href; })
  .filter(Boolean)`;

/**
 * Wrap a script into a self-calling expression with its argument inlined.
 *
 * `page.evaluate(string)` evaluates the string as an *expression* and does not
 * call the result, so a bare `(arg) => …` would just serialize to `undefined`.
 * Inlining the argument as JSON keeps the whole payload a plain expression —
 * still opaque to the bundler, no function serialization involved.
 */
export function inlineScript(script: string, arg?: unknown): string {
  if (arg === undefined) return `(${script})()`;
  // U+2028/U+2029 are valid in JSON but terminate a JS line.
  const json = JSON.stringify(arg)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `(${script})(${json})`;
}

/** Every script shipped to the page, for the guard test. */
export const BROWSER_SCRIPTS: Record<string, string> = {
  APPLY_STATE_SCRIPT,
  REVERT_STATE_SCRIPT,
  DOM_FINGERPRINT_SCRIPT,
  COLLECT_LINKS_SCRIPT,
};
