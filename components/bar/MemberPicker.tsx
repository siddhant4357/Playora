"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { formatPaise } from "@/lib/money";

type Hit = { id: string; firstName: string; lastName: string; memberCode: string; creditBalance: number; plan: { name: string } | null };
const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<Hit[]>);

export function MemberPicker({ onPick, placeholder = "Attach member (name, phone, code)" }: { onPick: (m: { id: string; name: string; creditBalance: number }) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);
  const { data } = useSWR(debounced.length >= 2 ? `/api/members/search?q=${encodeURIComponent(debounced)}` : null, fetcher);

  return (
    <div className="relative">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Search members" />
      {data && data.length > 0 && q && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl shadow-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} role="listbox">
          {data.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onPick({ id: m.id, name: `${m.firstName} ${m.lastName}`, creditBalance: m.creditBalance });
                  setQ("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <span>
                  {m.firstName} {m.lastName} <span style={{ color: "var(--color-text-muted)" }}>· {m.memberCode}</span>
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {m.plan?.name ?? "Trial"}
                  {m.creditBalance > 0 && ` · ${formatPaise(m.creditBalance)} credit`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
