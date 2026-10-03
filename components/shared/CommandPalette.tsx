/**
 * components/shared/CommandPalette.tsx
 *
 * Global Cmd+K command palette using cmdk.
 * Mount once in the dashboard layout; opens on ⌘K / Ctrl+K.
 * Domain-specific commands will be registered here in later phases.
 */

"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMANDS = [
  {
    group: "Navigation",
    items: [
  { id: "home", label: "Go to my home", icon: LayoutDashboard, href: "/app" },
  { id: "account", label: "Account settings", icon: Settings, href: "/account" },
    ],
  },
  {
    group: "Account",
    items: [
      { id: "logout", label: "Sign Out", icon: LogOut, action: "logout" as const },
    ],
  },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  const runCommand = React.useCallback(
    async (action: () => void | Promise<void>) => {
      onOpenChange(false);
      await action();
    },
    [onOpenChange]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => onOpenChange(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="bg-white rounded-xl shadow-2xl border border-[--color-border] overflow-hidden"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-[--color-border]">
            <Search className="w-4 h-4 text-[--color-text-subtle] flex-shrink-0" />
            <Command.Input
              placeholder="Search commands…"
              className="flex-1 py-3.5 text-sm outline-none bg-transparent text-[--color-text] placeholder:text-[--color-text-subtle]"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[--color-bg] border border-[--color-border] text-[--color-text-muted]">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-[--color-text-muted]">
              No commands found.
            </Command.Empty>

            {COMMANDS.map((group) => (
              <Command.Group
                key={group.group}
                heading={group.group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[--color-text-subtle] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
              >
                {group.items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    onSelect={() => {
                      if ("action" in item && item.action === "logout") {
                        runCommand(() => { logoutAction(); });
                      } else if ("href" in item) {
                        runCommand(() => router.push(item.href!));
                      }
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer text-[--color-text] data-[selected=true]:bg-black/5 dark:data-[selected=true]:bg-white/10 transition-colors"
                  >
                    <item.icon className="w-4 h-4 opacity-60" />
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
