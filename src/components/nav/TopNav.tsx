"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { signOut as firebaseSignOut } from "firebase/auth";
import {
  Search,
  ChevronDown,
  UserRound,
  Settings,
  CreditCard,
  ShieldCheck,
  LogOut,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NotificationsBell } from "@/components/nav/NotificationsBell";
import { PrefetchLink } from "@/components/nav/PrefetchLink";
import { firebaseClientAuth } from "@/lib/firebase/client";

export function TopNav({
  workspaceName,
  userName,
  userEmail,
  plan,
}: {
  workspaceName: string;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  plan: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] = useState(workspaceName);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const displayName = userName || userEmail?.split("@")[0] || "Account";
  const initials = initialsFor(displayName, userEmail);
  const workspaceInitial = (workspaceName || "W").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (editingWorkspace) editInputRef.current?.focus();
  }, [editingWorkspace]);

  async function saveWorkspaceName() {
    const next = workspaceDraft.trim();
    if (!next || next === workspaceName) {
      setEditingWorkspace(false);
      setWorkspaceDraft(workspaceName);
      return;
    }
    setSavingWorkspace(true);
    setWorkspaceError(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWorkspaceError(data.message || "Could not rename workspace.");
        return;
      }
      setEditingWorkspace(false);
      setWorkspaceDraft(next);
      router.refresh();
    } catch (err) {
      setWorkspaceError((err as Error).message ?? "Network error");
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    await firebaseSignOut(firebaseClientAuth()).catch(() => {});
    router.replace("/auth/sign-in");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-paper/85 backdrop-blur border-b border-line">
      <div className="flex items-center justify-between gap-4 px-4 lg:px-8 h-16">
        <div className="flex items-center gap-3 lg:hidden">
          <PrefetchLink href="/app" aria-label="accessops home">
            <Logo variant="mark" className="size-10" />
          </PrefetchLink>
        </div>

        <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none">
          {editingWorkspace ? (
            <div className="hidden lg:inline-flex items-center gap-1.5 px-2 py-1 rounded-md ring-1 ring-line bg-canvas">
              <span className="size-5 rounded bg-navy-900 text-paper inline-flex items-center justify-center text-[10px] font-bold">
                {workspaceInitial}
              </span>
              <input
                ref={editInputRef}
                type="text"
                value={workspaceDraft}
                maxLength={120}
                onChange={(e) => setWorkspaceDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveWorkspaceName();
                  if (e.key === "Escape") {
                    setEditingWorkspace(false);
                    setWorkspaceDraft(workspaceName);
                  }
                }}
                disabled={savingWorkspace}
                aria-label="Workspace name"
                className="text-sm bg-paper rounded px-1.5 h-7 ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
              />
              <button
                type="button"
                onClick={() => void saveWorkspaceName()}
                disabled={savingWorkspace}
                aria-label="Save workspace name"
                className="size-7 inline-flex items-center justify-center text-green-700 hover:bg-canvas-2 rounded"
              >
                <Check className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingWorkspace(false);
                  setWorkspaceDraft(workspaceName);
                  setWorkspaceError(null);
                }}
                aria-label="Cancel"
                className="size-7 inline-flex items-center justify-center text-ink-500 hover:bg-canvas-2 rounded"
              >
                <X className="size-4" aria-hidden />
              </button>
              {workspaceError && (
                <span className="text-[11px] text-rose-700 ml-1">
                  {workspaceError}
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingWorkspace(true)}
              className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-md ring-1 ring-line bg-canvas text-sm text-ink-700 hover:bg-canvas-2 min-h-[36px] group"
              aria-label={`Workspace: ${workspaceName}. Click to rename.`}
            >
              <span className="size-5 rounded bg-navy-900 text-paper inline-flex items-center justify-center text-[10px] font-bold">
                {workspaceInitial}
              </span>
              <span className="truncate max-w-[160px]">{workspaceName}</span>
              <Pencil
                className="size-3 text-ink-500 opacity-0 group-hover:opacity-100"
                aria-hidden
              />
            </button>
          )}
        </div>

        <div className="flex-1 max-w-md hidden md:block">
          <label className="relative block">
            <span className="sr-only">Search scans, issues, pages</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-500" aria-hidden />
            <input
              type="search"
              placeholder="Search scans, issues, pages…"
              className="w-full h-10 pl-9 pr-3 rounded-md bg-canvas ring-1 ring-line text-sm placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <NotificationsBell />

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-canvas-2 min-h-[40px]"
              aria-label="Account menu"
              aria-expanded={open}
            >
              <span className="size-8 rounded-full bg-purple-100 text-purple-600 inline-flex items-center justify-center text-xs font-semibold">
                {initials}
              </span>
              <span className="hidden md:inline text-sm font-medium text-ink-900 max-w-[140px] truncate">
                {displayName}
              </span>
              <ChevronDown className="size-3.5 text-ink-500 hidden md:inline" aria-hidden />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-72 rounded-md bg-paper ring-1 ring-line shadow-[var(--shadow-card)] p-2">
                <div className="px-3 py-2 border-b border-line/70 mb-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">{displayName}</p>
                  {userEmail && <p className="text-xs text-ink-500 truncate">{userEmail}</p>}
                  <p className="text-[10px] uppercase tracking-wider text-purple-700 font-semibold mt-2">
                    {plan} plan
                  </p>
                </div>
                <MenuLink href="/app/settings/profile" icon={UserRound} label="Profile" />
                <MenuLink href="/app/settings" icon={Settings} label="Workspace settings" />
                <MenuLink href="/app/settings/billing" icon={CreditCard} label="Billing & plan" />
                <MenuLink href="/app/compliance" icon={ShieldCheck} label="Privacy & compliance" />
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-700 hover:bg-rose-50"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <PrefetchLink
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-ink-700 hover:bg-canvas-2"
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </PrefetchLink>
  );
}

function initialsFor(name: string, email?: string | null): string {
  const source = name || email || "Account";
  const parts = source
    .replace(/@.*/, "")
    .split(/\s+|[._-]+/)
    .filter(Boolean);
  return (parts[0]?.[0] ?? "A").concat(parts[1]?.[0] ?? "").toUpperCase();
}
