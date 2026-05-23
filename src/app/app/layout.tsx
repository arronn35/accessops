import { ReactNode } from "react";
import { SideNav } from "@/components/nav/SideNav";
import { TopNav } from "@/components/nav/TopNav";
import { MobileBottomNav } from "@/components/nav/MobileBottomNav";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getCurrentWorkspaceOrRedirect();

  return (
    <div className="flex min-h-screen w-full">
      <SideNav />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          workspaceName={ctx.workspace.name}
          userName={ctx.user.name}
          userEmail={ctx.user.email}
          plan={ctx.workspace.plan}
        />
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
