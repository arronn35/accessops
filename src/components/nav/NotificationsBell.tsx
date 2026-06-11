"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";

interface UiNotification {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: string;
}

interface NotifPayload {
  notifications: UiNotification[];
  unreadCount: number;
  lastSeenAt: string | null;
}

const POLL_INTERVAL_MS = 60_000;

function formatRel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotifPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) {
        setError("Could not load notifications.");
        return;
      }
      setError(null);
      setData(await res.json());
    } catch {
      setError("Network error.");
    }
  }

  useEffect(() => {
    const initialId = window.setTimeout(() => void refresh(), 0);
    const id = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialId);
      window.clearInterval(id);
    };
  }, []);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markRead() {
    try {
      await fetch("/api/notifications", { method: "POST" });
      setData((d) => (d ? { ...d, unreadCount: 0 } : d));
    } catch {
      // Non-fatal — the badge will resync on next poll.
    }
  }

  function onOpen() {
    const next = !open;
    setOpen(next);
    if (next && (data?.unreadCount ?? 0) > 0) {
      void markRead();
    }
  }

  const unread = data?.unreadCount ?? 0;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={
          unread > 0
            ? `Notifications (${unread} new)`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative size-10 inline-flex items-center justify-center rounded-md text-ink-700 hover:bg-canvas-2"
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && (
          <span
            className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-paper text-[10px] font-semibold inline-flex items-center justify-center ring-2 ring-paper"
            aria-hidden
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 rounded-md bg-paper ring-1 ring-line shadow-[var(--shadow-card)] overflow-hidden z-40"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-line/70">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
            {data && data.notifications.length > 0 && (
              <button
                type="button"
                onClick={markRead}
                className="text-[11px] text-ink-500 hover:text-ink-900"
              >
                Mark all read
              </button>
            )}
          </div>

          {error ? (
            <p className="px-4 py-6 text-xs text-rose-700">{error}</p>
          ) : !data ? (
            <p className="px-4 py-6 text-xs text-ink-500">Loading…</p>
          ) : data.notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <BellOff
                className="size-6 text-ink-400 mx-auto mb-2"
                aria-hidden
              />
              <p className="text-sm text-ink-700">You&apos;re all caught up.</p>
              <p className="text-xs text-ink-500 mt-1">
                Scan, report and team events will show up here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto divide-y divide-line/60">
              {data.notifications.map((n) => {
                const body = (
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-ink-900">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-ink-600 mt-0.5 leading-snug">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[11px] text-ink-500 mt-1">
                      {formatRel(n.createdAt)}
                    </p>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="block hover:bg-canvas-2"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
