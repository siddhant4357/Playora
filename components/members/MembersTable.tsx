import Link from "next/link";
import type { listMembers } from "@/lib/members/queries";
import { daysUntil } from "@/lib/members/queries";
import { formatPaise } from "@/lib/money";
import { EmptyState, Pill, statusTone } from "@/components/shared/Primitives";
import { tierStyle } from "@/lib/booking/ui";

type Row = Awaited<ReturnType<typeof listMembers>>["rows"][number];

export function MembersTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No members match" hint="Try a different search or filter, or register a new member." />;
  }
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            <th className="px-4 py-3 font-semibold">Member</th>
            <th className="hidden px-4 py-3 font-semibold md:table-cell">Plan</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="hidden px-4 py-3 font-semibold lg:table-cell">Expires</th>
            <th className="hidden px-4 py-3 text-right font-semibold lg:table-cell">Visits</th>
            <th className="hidden px-4 py-3 text-right font-semibold md:table-cell">Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
          {rows.map((m) => {
            const days = daysUntil(m.expiryDate);
            const expiring = m.status === "ACTIVE" && days !== null && days <= 14;
            return (
              <tr key={m.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`/desk/members/${m.id}`} className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: "var(--color-primary-900)", color: "#fff" }}
                      aria-hidden
                    >
                      {m.firstName[0]}
                      {m.lastName[0]}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        {m.firstName} {m.lastName}
                      </span>
                      <span className="truncate text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                        {m.memberCode} · {m.phone}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={tierStyle(m.plan?.tier)}>
                    {m.plan?.name ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={expiring ? "warning" : statusTone(m.status)}>{expiring ? `Expiring · ${days}d` : m.status}</Pill>
                </td>
                <td className="hidden px-4 py-3 tabular-nums lg:table-cell" style={{ color: "var(--color-text-muted)" }}>
                  {m.expiryDate ? m.expiryDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">{m._count.checkIns}</td>
                <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{m.creditBalance > 0 ? formatPaise(m.creditBalance) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
