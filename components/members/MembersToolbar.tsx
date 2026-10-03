"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import type { MemberFilter } from "@/lib/members/queries";

const TABS: { key: MemberFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "EXPIRING", label: "Expiring" },
  { key: "EXPIRED", label: "Expired" },
  { key: "TRIAL", label: "Trial" },
  { key: "LEAD", label: "Leads" },
];

export function MembersToolbar({ q, filter, counts }: { q: string; filter: MemberFilter; counts: Record<string, number | undefined> }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(q);
  const [, startTransition] = useTransition();

  const push = (next: { q?: string; f?: string }) => {
    const sp = new URLSearchParams(params.toString());
    if (next.q !== undefined) (next.q ? sp.set("q", next.q) : sp.delete("q"));
    if (next.f !== undefined) (next.f && next.f !== "ALL" ? sp.set("f", next.f) : sp.delete("f"));
    startTransition(() => router.replace(`/desk/members?${sp.toString()}`));
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter members">
        {TABS.map((t) => {
          const n = t.key === "ALL" ? undefined : counts[t.key];
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => push({ f: t.key })}
              className={cn("rounded-full px-3 py-1.5 text-sm font-medium transition-colors", active ? "text-white" : "hover:opacity-80")}
              style={active ? { background: "var(--color-primary-900)" } : { background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              {t.label}
              {n !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{n}</span>}
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
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Name, phone or CC-0001"
          className="pl-9"
          aria-label="Search members"
        />
      </form>
    </div>
  );
}
