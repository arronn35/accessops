/**
 * Callback URL handling. These are open-redirect tests: every rejected case is
 * a value that, if honoured, would send a freshly authenticated user to a host
 * we do not control.
 *
 * The five copies of this check that these replaced all used a prefix test
 * ("starts with / and not //"), which accepts the backslash and control-char
 * variants below.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_CALLBACK, sanitizeCallback, signInUrlFor } from "./callback-url";

describe("sanitizeCallback", () => {
  it.each([
    ["/app/scans/abc", "/app/scans/abc"],
    ["/app/scans/abc?tab=issues", "/app/scans/abc?tab=issues"],
    ["/", "/"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(sanitizeCallback(input)).toBe(expected);
  });

  it.each([
    ["//evil.com", "protocol-relative"],
    ["https://evil.com", "absolute URL"],
    ["http://evil.com/app", "absolute URL with a plausible path"],
    ["/\\evil.com", "backslash that browsers normalise to //"],
    ["/\\\\evil.com", "double backslash"],
    ["javascript:alert(1)", "script scheme"],
    ["app/scans", "relative path with no leading slash"],
    ["", "empty"],
  ])("rejects %s (%s)", (input) => {
    expect(sanitizeCallback(input)).toBe(DEFAULT_CALLBACK);
  });

  it("rejects a target hidden behind stripped control characters", () => {
    // Browsers remove \n and \t before parsing, so "/\n/evil.com" can become
    // protocol-relative after the prefix check has already passed.
    expect(sanitizeCallback("/\n/evil.com")).toBe(DEFAULT_CALLBACK);
    expect(sanitizeCallback("/\tapp")).toBe(DEFAULT_CALLBACK);
    expect(sanitizeCallback("javas\tcript:alert(1)")).toBe(DEFAULT_CALLBACK);
  });

  it("handles null and undefined", () => {
    expect(sanitizeCallback(null)).toBe(DEFAULT_CALLBACK);
    expect(sanitizeCallback(undefined)).toBe(DEFAULT_CALLBACK);
  });

  it("preserves a multi-parameter query", () => {
    // The onboarding persona handoff rides through sign-in in this query, so
    // dropping parameters here would silently undo it.
    expect(
      sanitizeCallback("/workspace/setup?url=https%3A%2F%2Fexample.com%2F&persona=ecommerce")
    ).toBe("/workspace/setup?url=https%3A%2F%2Fexample.com%2F&persona=ecommerce");
  });

  it("drops the fragment, which never reaches the server anyway", () => {
    expect(sanitizeCallback("/app/scans#section")).toBe("/app/scans");
  });
});

describe("signInUrlFor", () => {
  it("carries a deep link through sign-in", () => {
    expect(signInUrlFor("/app/scans/abc?tab=issues")).toBe(
      "/auth/sign-in?callbackUrl=%2Fapp%2Fscans%2Fabc%3Ftab%3Dissues"
    );
  });

  it("omits the parameter when the target is just the dashboard", () => {
    expect(signInUrlFor("/app")).toBe("/auth/sign-in");
  });

  it("falls back to a bare sign-in when the path header is absent", () => {
    // Prefetch requests skip the proxy, so x-pathname can be null.
    expect(signInUrlFor(null)).toBe("/auth/sign-in");
  });

  it("never emits an attacker-controlled callback", () => {
    expect(signInUrlFor("//evil.com")).toBe("/auth/sign-in");
    expect(signInUrlFor("https://evil.com")).toBe("/auth/sign-in");
  });
});
