import { verifySessionCookie } from "@/lib/auth/session";
import { OnboardingClient } from "./onboarding-client";

export const metadata = { title: "Onboarding — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));
  const nextHref = signedIn
    ? "/workspace/setup"
    : "/auth/sign-in?callbackUrl=%2Fworkspace%2Fsetup";

  return <OnboardingClient nextHref={nextHref} />;
}
