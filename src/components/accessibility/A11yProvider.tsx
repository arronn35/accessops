"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type TextSize = "sm" | "md" | "lg";
type Contrast = "default" | "high";
type Motion = "default" | "reduced";

interface A11yState {
  textSize: TextSize;
  contrast: Contrast;
  motion: Motion;
  setTextSize: (v: TextSize) => void;
  setContrast: (v: Contrast) => void;
  setMotion: (v: Motion) => void;
}

const Ctx = createContext<A11yState | null>(null);

const KEY = "accessops:a11y";

interface StoredPrefs {
  textSize?: TextSize;
  contrast?: Contrast;
  motion?: Motion;
}

function readPrefs(): StoredPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredPrefs) : {};
  } catch {
    return {};
  }
}

export function A11yProvider({ children }: { children: ReactNode }) {
  // Lazy initial state: localStorage is read only on the client during first render.
  const [textSize, setTextSizeState] = useState<TextSize>(() => readPrefs().textSize ?? "md");
  const [contrast, setContrastState] = useState<Contrast>(() => readPrefs().contrast ?? "default");
  const [motion, setMotionState] = useState<Motion>(() => readPrefs().motion ?? "default");

  // Sync to <html> data attributes + persist. Effect only writes to external systems.
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.textSize = textSize === "md" ? "" : textSize;
    html.dataset.contrast = contrast === "default" ? "" : contrast;
    html.dataset.motion = motion === "default" ? "" : motion;
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ textSize, contrast, motion }));
    } catch {
      // Ignore quota / privacy-mode failures.
    }
  }, [textSize, contrast, motion]);

  const value: A11yState = {
    textSize,
    contrast,
    motion,
    setTextSize: setTextSizeState,
    setContrast: setContrastState,
    setMotion: setMotionState,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useA11y() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useA11y must be used inside A11yProvider");
  return ctx;
}
