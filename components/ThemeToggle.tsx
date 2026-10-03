"use client";

/**
 * components/ThemeToggle.tsx
 *
 * Sun / Moon icon button that sits in the navbar.
 * Calls toggle() from ThemeProvider context.
 */

import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  // If theme hasn't loaded yet, default to a safe state to avoid hydration mismatch
  const isDark = theme === "dark";

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`theme-toggle-btn ${isDark ? "is-dark" : "is-light"}`}
    >
      <div className="toggle-icon-wrap">
        <Sun size={18} strokeWidth={2} className="icon-sun" />
        <Moon size={18} strokeWidth={2} className="icon-moon" />
      </div>
    </button>
  );
}
