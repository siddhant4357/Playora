"use client";

/**
 * components/ThemeProvider.tsx
 *
 * Reads theme from localStorage on mount, applies it to <html> as a class,
 * and provides a toggle function available via useTheme().
 *
 * Strategy: add/remove class "dark" on the <html> element.
 * CSS variables in home.css are overridden under html.dark { … }
 */

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // On mount: read saved preference, then watch for system preference changes
  useEffect(() => {
    const saved = localStorage.getItem("ldxodoo-theme") as Theme | null;
    const preferred = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(preferred);
    setTheme(preferred);
  }, []);

  function applyTheme(t: Theme) {
    const html = document.documentElement;
    if (t === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("ldxodoo-theme", t);
  }

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
