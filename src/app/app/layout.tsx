import { ReactNode } from "react";
import { SideNav } from "@/components/nav/SideNav";
import { TopNav } from "@/components/nav/TopNav";
import { MobileBottomNav } from "@/components/nav/MobileBottomNav";
import { AppRoutePrefetcher } from "@/components/nav/AppRoutePrefetcher";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { isFirestoreQuotaError } from "@/lib/data/firestore-errors";
import { AppServiceUnavailable } from "@/components/app/AppServiceUnavailable";
import { AccountLocaleSync } from "@/components/i18n/AccountLocaleSync";

export default async function AppLayout({ children }: { children: ReactNode }) {
  let ctx: Awaited<ReturnType<typeof getCurrentWorkspaceOrRedirect>>;
  try {
    ctx = await getCurrentWorkspaceOrRedirect();
  } catch (err) {
    if (isFirestoreQuotaError(err)) return <AppServiceUnavailable />;
    throw err;
  }

  return (
    <div className="flex min-h-screen w-full">
      <AccountLocaleSync locale={ctx.user.locale} />
      <SideNav />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          workspaceName={ctx.workspace.name}
          userName={ctx.user.name}
          userEmail={ctx.user.email}
          plan={ctx.workspace.plan}
        />
        <AppRoutePrefetcher />
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 pb-20 lg:pb-10 focus:outline-none"
        >
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
