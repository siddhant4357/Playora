"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DayOption {
  key: string;
  href: string;
  weekday: string; // "Mon"
  day: string; // "14"
  isToday: boolean;
}

interface DayStripProps {
  days: DayOption[];
  selected: string;
}

export function DayStrip({ days, selected }: DayStripProps) {
  return (
    <nav aria-label="Pick a day" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <ul className="flex gap-2">
        {days.map((d) => {
          const active = d.key === selected;
          return (
            <li key={d.key} className="shrink-0">
              <Link
                href={d.href}
                scroll={false}
                aria-current={active ? "date" : undefined}
                className={cn(
                  "flex w-14 flex-col items-center gap-0.5 rounded-xl py-2 text-center transition-colors",
                  active ? "shadow-sm" : "hover:bg-[var(--color-primary-50)]"
                )}
                style={{
                  background: active ? "var(--color-primary-500)" : "var(--color-surface)",
                  color: active ? "#fff" : "var(--color-text)",
                  border: `1px solid ${active ? "var(--color-primary-500)" : "var(--color-border)"}`,
                }}
              >
                <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                  {d.isToday ? "Today" : d.weekday}
                </span>
                <span className="text-lg font-bold leading-none">{d.day}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
