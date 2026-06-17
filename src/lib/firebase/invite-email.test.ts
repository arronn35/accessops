import { describe, expect, it } from "vitest";
import { signInUrlForInvite } from "./invite-email";

describe("signInUrlForInvite", () => {
  it("routes the invite through the sign-in page with a callback", () => {
    expect(signInUrlForInvite("https://percevia-chi.vercel.app/invite/abc123")).toBe(
      "https://percevia-chi.vercel.app/auth/sign-in?callbackUrl=%2Finvite%2Fabc123"
    );
  });

  it("preserves the origin of the deployment that created the invite", () => {
    expect(signInUrlForInvite("http://localhost:3100/invite/t0k3n")).toBe(
      "http://localhost:3100/auth/sign-in?callbackUrl=%2Finvite%2Ft0k3n"
    );
  });

  it("keeps query strings on the invite path", () => {
    expect(signInUrlForInvite("https://app.example.com/invite/abc?src=email")).toBe(
      "https://app.example.com/auth/sign-in?callbackUrl=%2Finvite%2Fabc%3Fsrc%3Demail"
    );
  });
});
