"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TxSource } from "@/generated/prisma/client";
import type { DayPoint } from "@/lib/finance/queries";
import { REVENUE_SOURCES, SOURCE_COLOR, SOURCE_LABEL } from "@/lib/finance/labels";
import { formatPaise } from "@/lib/money";

function compact(paise: number) {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(r >= 1000000 ? 0 : 1)}L`;
  if (r >= 1000) return `₹${Math.round(r / 1000)}k`;
  return `₹${Math.round(r)}`;
}

export function RevenueChart({ data, sources }: { data: DayPoint[]; sources: TxSource[] }) {
  const active = REVENUE_SOURCES.filter((s) => sources.includes(s));
  const single = data.length === 1;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap={single ? "40%" : "20%"}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} interval={data.length > 14 ? Math.floor(data.length / 7) : 0} />
            <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, var(--color-primary-500) 8%, transparent)" }}
              content={({ active: isActive, payload, label }) => {
                if (!isActive || !payload?.length) return null;
                const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
                return (
                  <div className="flex min-w-44 flex-col gap-1 rounded-xl p-3 text-xs shadow-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                    <div className="flex items-center justify-between gap-4 font-semibold">
                      <span>{label}</span>
                      <span className="tabular-nums">{formatPaise(total)}</span>
                    </div>
                    {payload
                      .filter((p) => Number(p.value) > 0)
                      .map((p) => (
                        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
                            {SOURCE_LABEL[p.dataKey as TxSource]}
                          </span>
                          <span className="tabular-nums">{formatPaise(Number(p.value))}</span>
                        </div>
                      ))}
                  </div>
                );
              }}
            />
            {active.map((s, i) => (
              <Bar key={s} dataKey={s} stackId="rev" fill={SOURCE_COLOR[s]} radius={i === active.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={single ? 120 : 40} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
        {active.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: SOURCE_COLOR[s] }} />
            {SOURCE_LABEL[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}
