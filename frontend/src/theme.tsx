import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "romantic" | "minimal" | "minimal-dark";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  cycle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE = "dp.theme";

function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE) as Theme | null;
    return stored ?? "romantic";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const cycle = useCallback(() => {
    setThemeState((t) =>
      t === "romantic" ? "minimal" : t === "minimal" ? "minimal-dark" : "romantic",
    );
  }, []);

  const value = useMemo(() => ({ theme, setTheme, cycle }), [theme, setTheme, cycle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
