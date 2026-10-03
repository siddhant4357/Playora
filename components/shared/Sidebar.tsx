/**
 * components/shared/Sidebar.tsx
 *
 * Premium sidebar — clean white with plum accent, Odoo-inspired.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  Package,
  BarChart3,
  Settings,
  ChevronRight,
  PanelLeftClose,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Products", href: "/dashboard/products", icon: Package },
      { label: "Stock", href: "/dashboard/stock", icon: Boxes },
      { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Health", href: "/admin/health", icon: ShieldCheck, adminOnly: true },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  userRole?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ userRole, isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "ADMIN";

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
          <div className="flex items-center gap-2.5">
            <span
              className="font-bold text-sm tracking-tight"
              style={{ color: "var(--color-text)", letterSpacing: "-0.02em", fontSize: "0.9rem" }}
            >
              LDXODOO
            </span>
          </div>
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
          {NAV_SECTIONS.map((section) => {
            if ((section as any).adminOnly && !isAdmin) return null;
            const visibleItems = section.items.filter(
              (item) => !(item as any).adminOnly || isAdmin
            );
            if (!visibleItems.length) return null;

            return (
              <div key={section.label} className="mb-4">
                <p
                  className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-text-subtle)" }}
                >
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = (item as any).exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
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
          <p className="text-[10px]">LDXODOO · v0.1</p>
        </div>
      </aside>
    </>
  );
}
