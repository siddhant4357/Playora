/**
 * components/shared/Topbar.tsx
 *
 * Dashboard top navigation bar.
 * Includes animated Sun/Moon theme toggle synced with the home page.
 */

"use client";

import { Search, LogOut, ChevronDown, Menu, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SessionPayload } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";

interface TopbarProps {
  user: SessionPayload;
  onOpenPalette: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function getInitials(name: string | null | undefined): string {
  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return initials || "?";
}

export function Topbar({ user, onOpenPalette, sidebarOpen, onToggleSidebar }: TopbarProps) {
  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 transition-all duration-300"
      style={{
        left: sidebarOpen ? "240px" : "0px",
        height: "56px",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Left: Hamburger + Cmd+K search trigger */}
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md transition-colors cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <button
          id="topbar-search-btn"
          onClick={onOpenPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
          style={{
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search or run command…</span>
          <span className="inline sm:hidden">Search…</span>
          <kbd
            className="hidden sm:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-subtle)",
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Theme toggle + user menu */}
      <div className="flex items-center gap-2">
        {/* Animated Sun/Moon toggle — same as home page, synced via localStorage */}
        <ThemeToggle />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="topbar-user-menu"
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors cursor-pointer"
            style={{ color: "var(--color-text)" }}
          >
            <Avatar className="w-7 h-7">
              <AvatarFallback
                className="text-xs font-semibold text-white"
                style={{ background: "var(--color-primary-500)" }}
              >
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span
              className="hidden sm:block text-sm max-w-28 truncate"
              style={{ fontWeight: 400, color: "var(--color-text)" }}
            >
              {user.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-[--color-text-muted] truncate">{user.email}</p>
              <span
                className="badge mt-1"
                style={{
                  fontSize: "0.65rem",
                  padding: "0.1rem 0.5rem",
                  background:
                    user.role === "OWNER"
                      ? "var(--color-primary-100)"
                      : "#f3eff5",
                  color:
                    user.role === "OWNER"
                      ? "var(--color-primary-700)"
                      : "var(--color-text-muted)",
                }}
              >
                {ROLE_LABELS[user.role]}
              </span>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => { window.location.href = "/account"; }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Account
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer text-[--color-danger] focus:text-[--color-danger]"
              onClick={() => {
                window.location.href = "/api/logout";
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
