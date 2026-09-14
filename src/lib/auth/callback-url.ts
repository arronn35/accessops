/**
 * Post-sign-in redirect targets.
 *
 * A callbackUrl is attacker-controllable (it arrives in the query string), so
 * it is only ever allowed to name a path on this origin. Anything else is an
 * open redirect: the user sees our sign-in page, authenticates, and lands
 * somewhere else entirely.
 *
 * The three sign-in surfaces each carried their own copy of this check, which
 * accepted "/\evil.com" -- a lone leading slash followed by a backslash, which
 * several browsers normalise to the protocol-relative "//evil.com". Parsing
 * against a throwaway origin and requiring that origin to survive is stricter,
 * and far harder to get subtly wrong, than string prefix tests.
 */
export const DEFAULT_CALLBACK = "/app";

const PLACEHOLDER_ORIGIN = "https://callback.invalid";

/** Control characters that browsers strip before parsing a URL. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function sanitizeCallback(value: string | null | undefined): string {
  if (!value) return DEFAULT_CALLBACK;
  // Stripped characters can smuggle a different target past a prefix check.
  if (CONTROL_CHARS.test(value)) return DEFAULT_CALLBACK;
  if (!value.startsWith("/")) return DEFAULT_CALLBACK;
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_CALLBACK;

  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return DEFAULT_CALLBACK;
  }
  // A value that escapes the placeholder origin was never a same-origin path.
  if (url.origin !== PLACEHOLDER_ORIGIN) return DEFAULT_CALLBACK;

  return `${url.pathname}${url.search}`;
}

/**
 * Sign-in URL that returns the user to where they were headed. Without the
 * callback, a session expiring mid-task drops the user on the dashboard and
 * silently loses their destination.
 */
export function signInUrlFor(pathname: string | null | undefined): string {
  const target = sanitizeCallback(pathname);
  if (target === DEFAULT_CALLBACK) return "/auth/sign-in";
  return `/auth/sign-in?callbackUrl=${encodeURIComponent(target)}`;
}
