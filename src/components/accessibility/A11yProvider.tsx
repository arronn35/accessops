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

const KEY = "percevia:a11y";

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
  // Static initial state: reading localStorage during render returns {} on
  // the server but stored prefs on the client, so the first client render
  // would differ from the SSR HTML (hydration mismatch #418). Stored prefs
  // are applied in a mount effect instead — one paint with defaults, then
  // the user's prefs, with no server/client divergence.
  const [textSize, setTextSizeState] = useState<TextSize>("md");
  const [contrast, setContrastState] = useState<Contrast>("default");
  const [motion, setMotionState] = useState<Motion>("default");

  useEffect(() => {
    const stored = readPrefs();
    // Mount-only sync from localStorage. A lazy useState initializer would
    // read storage during the first client render and diverge from the SSR
    // HTML (hydration mismatch #418); the one cascading render here happens
    // only when stored prefs differ from defaults.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored.textSize) setTextSizeState(stored.textSize);
    if (stored.contrast) setContrastState(stored.contrast);
    if (stored.motion) setMotionState(stored.motion);
  }, []);

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
