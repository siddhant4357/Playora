"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import type { BookingRange, BookingStatusFilter } from "@/lib/booking/queries";

const RANGES: { key: BookingRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past 30 days" },
];

const STATUSES: { key: BookingStatusFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "NO_SHOW", label: "No-show" },
];

export function BookingsToolbar({
  range,
  status,
  q,
  counts,
}: {
  range: BookingRange;
  status: BookingStatusFilter;
  q: string;
  counts: Record<string, number | undefined>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(q);
  const [, startTransition] = useTransition();

  const push = (next: { range?: string; status?: string; q?: string }) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined) continue;
      const isDefault = (k === "range" && v === "today") || (k === "status" && v === "ALL") || v === "";
      if (isDefault) sp.delete(k);
      else sp.set(k, v);
    }
    startTransition(() => router.push(`/desk/bookings${sp.size ? `?${sp}` : ""}`));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Time range">
          {RANGES.map((r) => {
            const active = range === r.key;
            return (
              <button
                key={r.key}
                role="tab"
                aria-selected={active}
                onClick={() => push({ range: r.key })}
                className={cn("rounded-full px-3 py-1.5 text-sm font-medium transition-colors", active ? "text-white" : "hover:opacity-80")}
                style={active ? { background: "var(--color-primary-900)" } : { background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <form
          className="relative w-full md:w-72"
          onSubmit={(e) => {
            e.preventDefault();
            push({ q: value.trim() });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Member, code or court" className="pl-9" aria-label="Search bookings" />
        </form>
      </div>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Status">
        {STATUSES.map((s) => {
          const active = status === s.key;
          const n = counts[s.key];
          return (
            <button
              key={s.key}
              role="tab"
              aria-selected={active}
              onClick={() => push({ status: s.key })}
              className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", active ? "" : "opacity-70 hover:opacity-100")}
              style={{
                background: active ? "var(--color-surface-2, var(--color-surface))" : "transparent",
                border: `1px solid ${active ? "var(--color-border)" : "transparent"}`,
                color: "var(--color-text)",
              }}
            >
              {s.label}
              {n !== undefined && <span className="ml-1.5 tabular-nums opacity-60">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
