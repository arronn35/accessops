"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
}
const Ctx = createContext<TabsCtx | null>(null);

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const baseId = useId();
  const value = controlledValue ?? internal;
  const setValue = (v: string) => {
    if (onValueChange) onValueChange(v);
    if (controlledValue === undefined) setInternal(v);
  };
  return (
    <Ctx.Provider value={{ value, setValue, baseId }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-canvas-2 p-1 ring-1 ring-line",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(Ctx)!;
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      aria-controls={`${ctx.baseId}-${value}-panel`}
      id={`${ctx.baseId}-${value}-tab`}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded transition-colors min-h-[36px]",
        active
          ? "bg-paper text-ink-900 shadow-[var(--shadow-soft)]"
          : "text-ink-600 hover:text-ink-900",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(Ctx)!;
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-${value}-panel`}
      aria-labelledby={`${ctx.baseId}-${value}-tab`}
      className={cn("mt-5 focus:outline-none", className)}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
