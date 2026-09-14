import { verifySessionCookie } from "@/lib/auth/session";
import { OnboardingClient } from "./onboarding-client";
import { safePublicScanUrl } from "@/lib/navigation/scan-handoff";
import { canonical } from "@/lib/seo/canonical";

export const metadata = {
  ...canonical("/onboarding"), title: "Onboarding — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));
  const url = safePublicScanUrl((await searchParams).url);

  // The destination depends on the persona the visitor has not chosen yet, so
  // the client builds it on Continue rather than receiving a fixed href.
  return <OnboardingClient scanUrl={url} signedIn={signedIn} />;
}
