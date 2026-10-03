import Link from "next/link";
import type { Period } from "@/lib/finance/queries";

const OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export function PeriodToggle({ period, basePath }: { period: Period; basePath: string }) {
  return (
    <nav aria-label="Period" className="inline-flex rounded-full p-1 text-sm" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
      {OPTIONS.map((o) => {
        const active = o.value === period;
        return (
          <Link
            key={o.value}
            href={`${basePath}?period=${o.value}`}
            aria-current={active ? "page" : undefined}
            className="rounded-full px-3 py-1 font-medium transition-colors"
            style={active ? { background: "var(--color-primary-500)", color: "var(--color-primary-foreground)" } : { color: "var(--color-text-muted)" }}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function parsePeriod(v: string | undefined): Period {
  return v === "today" || v === "week" ? v : "month";
}
