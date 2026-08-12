import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/**
 * The public site sits inside one framed column: ink rules on both edges,
 * header and footer welded to the same frame. Every marketing route uses
 * this so the chrome and the seams line up exactly.
 */
export function MarketingShell({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas-2">
      <div className="mx-auto max-w-[1440px] min-h-screen border-x border-rule bg-canvas text-ink-900">
        <SiteHeader signedIn={signedIn} />
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
