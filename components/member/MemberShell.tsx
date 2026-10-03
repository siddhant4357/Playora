/**
 * components/member/MemberShell.tsx
 *
 * Member app chrome: phone-first. Slim top bar with the club name and
 * theme toggle, content column capped at a comfortable reading width, and
 * a fixed bottom tab bar (Home · Book · Shop · Tab · Profile).
 * On wide screens the tab bar stays at the bottom but the column is centered.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEMBER_TABS } from "@/lib/nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SessionPayload } from "@/lib/auth";

interface MemberShellProps {
  user: SessionPayload;
  clubName: string;
  children: React.ReactNode;
}

export function MemberShell({ user, clubName, children }: MemberShellProps) {
  const pathname = usePathname();

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4"
        style={{
          height: "52px",
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight">Yolla</span>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            {clubName}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <a
            href="/api/logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Sign out"
            title={`Sign out ${user.name}`}
          >
            <LogOut className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-5">{children}</main>

      <nav
        aria-label="Member navigation"
        className="fixed inset-x-0 bottom-0 z-30"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <ul className="mx-auto flex max-w-xl items-stretch justify-between px-2">
          {MEMBER_TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    active ? "" : "opacity-60 hover:opacity-100"
                  )}
                  style={{ color: active ? "#714B67" : "var(--color-text)" }}
                >
                  <tab.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
