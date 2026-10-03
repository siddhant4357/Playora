"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatPaise } from "@/lib/money";

export type PickedMember = { id: string; firstName: string; lastName: string; memberCode: string; creditBalance: number; plan: string | null };

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<PickedMember[]>);

export function MemberPicker({ onPick, placeholder = "Attach member (name / phone / code)" }: { onPick: (m: PickedMember) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);
  const { data } = useSWR(debounced.length >= 2 ? `/api/members/search?q=${encodeURIComponent(debounced)}` : null, fetcher, { keepPreviousData: true });

  return (
    <div className="relative">
      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-9" aria-label="Search members" />
      {debounced.length >= 2 && data && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl p-1 shadow-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} role="listbox">
          {data.length === 0 && (
            <li className="px-3 py-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              No matches
            </li>
          )}
          {data.map((m) => (
            <li key={m.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onPick(m);
                  setQ("");
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex flex-col">
                  <span className="font-medium">
                    {m.firstName} {m.lastName}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {m.memberCode} · {m.plan ?? "No plan"}
                  </span>
                </span>
                {m.creditBalance > 0 && <span className="text-xs tabular-nums" style={{ color: "var(--color-success)" }}>{formatPaise(m.creditBalance)} credit</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
