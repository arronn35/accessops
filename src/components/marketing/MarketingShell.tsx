import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/**
 * The public site is one fluid framed surface: ink rules remain welded to
 * the viewport edges at every width instead of stopping at a desktop cap.
 * Every marketing route uses this so chrome and section seams stay aligned.
 */
export function MarketingShell({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="safe-area-x min-h-dvh w-full bg-canvas-2">
      <div
        data-marketing-shell
        className="min-h-dvh w-full border-x border-rule bg-canvas text-ink-900"
      >
        <SiteHeader signedIn={signedIn} />
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
