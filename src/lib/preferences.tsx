import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Accent } from "../theme/theme";
import { readJson, writeJson } from "./storage";

// Per-browser UI preferences (accent colour, sidebar state). Colour scheme
// (light/dark/auto) is stored by Mantine itself.

type Preferences = {
  accent: Accent;
  sidebarCollapsed: boolean;
};

const KEY = "erp:preferences";
const DEFAULTS: Preferences = { accent: "indigo", sidebarCollapsed: false };

type Ctx = Preferences & {
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
};

const PreferencesContext = createContext<Ctx | null>(null);

export function PreferencesProvider({ children }: { children: (prefs: Preferences) => ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(() => readJson(KEY, DEFAULTS));

  const setPreference = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      writeJson(KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ...prefs, setPreference }), [prefs, setPreference]);
  return <PreferencesContext.Provider value={value}>{children(prefs)}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return ctx;
}
