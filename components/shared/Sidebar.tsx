/**
 * components/shared/Sidebar.tsx
 *
 * Premium sidebar — clean white with plum accent, Odoo-inspired.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronDown, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { navFor } from "@/lib/nav";
import { BrandLogo } from "@/components/shared/BrandMark";
import { ROLE_LABELS, type Role } from "@/lib/roles";

interface SidebarProps {
  userRole: Role;
  clubName?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ userRole, clubName, isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const sections = navFor(userRole);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    return sections.reduce((acc, section) => {
      acc[section.label] = true;
      return acc;
    }, {} as Record<string, boolean>);
  });

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-40 flex flex-col transition-transform duration-300 ease-in-out",
          !isOpen && "-translate-x-full"
        )}
        style={{
          width: "240px",
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between flex-shrink-0 px-4"
          style={{ height: "56px", borderBottom: "1px solid var(--color-border)" }}
        >
          <Link href="/" aria-label="Playora home">
            <BrandLogo height={28} />
          </Link>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-gray-100"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3" style={{ scrollbarWidth: "none" }}>
          {sections.map((section) => {
            const visibleItems = section.items;
            if (visibleItems.length === 0) return null;
            const isCollapsed = collapsedSections[section.label];

            return (
              <div key={section.label} className="mb-4">
                <button
                  onClick={() => toggleSection(section.label)}
                  className="w-full flex items-center justify-between px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest cursor-pointer hover:opacity-75 transition-opacity"
                  style={{ color: "var(--color-text-subtle)" }}
                >
                  <span>{section.label}</span>
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                
                <div
                  className={cn(
                    "space-y-0.5 overflow-hidden transition-all duration-200 ease-in-out",
                    isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                  )}
                >
                  {visibleItems.map((item) => {
                    const active = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 group",
                          active ? "font-medium" : "hover:bg-black/5 dark:hover:bg-white/5"
                        )}
                        style={
                          active
                            ? { background: "rgba(113,75,103,0.12)", color: "#714B67" }
                            : { color: "var(--color-text)" }
                        }
                      >
                        <item.icon
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: active ? "#714B67" : "var(--color-text-muted)" }}
                        />
                        <span className="flex-1">{item.label}</span>
                        {active && (
                          <ChevronRight
                            className="w-3 h-3"
                            style={{ color: "#714B67", opacity: 0.6 }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom bar */}
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-subtle, #bbb)" }}
        >
          <p className="text-[10px]">Signed in as {ROLE_LABELS[userRole]}</p>
        </div>
      </aside>
    </>
  );
}
