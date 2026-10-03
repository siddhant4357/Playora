/**
 * components/shared/DashboardShell.tsx
 *
 * Dashboard shell — responsive, with sidebar defaulting closed on mobile.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { CommandPalette } from "@/components/shared/CommandPalette";
import type { SessionPayload } from "@/lib/auth";
import Footer from "@/components/shared/Footer";

interface DashboardShellProps {
  user: SessionPayload;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Default sidebar open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set proper initial state based on screen size after mount
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cmd+K / Ctrl+K global shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setPaletteOpen((v) => !v);
    }
    if (e.key === "Escape") {
      setPaletteOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const marginLeft = sidebarOpen ? "240px" : "0px";

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", display: "flex", flexDirection: "column" }}>
      {/* Sidebar */}
      <Sidebar userRole={user.role} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main area — shifts right when sidebar open on desktop */}
      <div
        className="flex flex-col flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? "240px" : "0px", minHeight: "100vh" }}
      >
        {/* Topbar */}
        <Topbar
          user={user}
          onOpenPalette={() => setPaletteOpen(true)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main content — flex column with grow so footer is pushed to bottom */}
        <main
          className="flex flex-col flex-1"
          style={{ paddingTop: "56px", minHeight: "calc(100vh - 56px)" }}
        >
          {/* Content area — full width, generous spacing */}
          <div className="p-6 lg:p-8 flex-1" style={{ minHeight: "calc(100vh - 56px - 300px)" }}>
            {children}
          </div>

          {/* Footer — pinned at true bottom */}
          <div style={{ marginTop: "auto" }}>
            <Footer />
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
