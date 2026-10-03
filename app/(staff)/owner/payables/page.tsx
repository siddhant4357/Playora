import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { listPayables } from "@/lib/finance/queries";
import { MODE_LABEL, PAYABLE_KIND_LABEL } from "@/lib/finance/labels";
import { PageHeader, Panel, Pill, Stat, statusTone } from "@/components/shared/Primitives";
import { NewPayableDialog } from "@/components/owner/NewPayableDialog";
import { PayableActions } from "@/components/owner/PayableActions";

export const metadata: Metadata = { title: "Payables" };

export default async function PayablesPage() {
  const user = await requireRole("OWNER");
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  const tz = club.timezone;
  const { pending, recent, summary } = await listPayables(user.clubId);
  const now = new Date();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Finance" title="Payables" subtitle="What the club owes: supplier bills, salaries, refunds, GST. Paying one posts an outgoing to the ledger, so net revenue is always honest." actions={<NewPayableDialog />} />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Outstanding" value={formatPaise(summary.total)} hint={`${pending.length} pending`} />
        <Stat label="Overdue" value={formatPaise(summary.overdue)} tone={summary.overdue > 0 ? "danger" : undefined} />
        <Stat label="Due in 7 days" value={formatPaise(summary.dueThisWeek)} tone={summary.dueThisWeek > 0 ? "warning" : undefined} />
        <Stat label="Largest bucket" value={summary.byKind[0] ? PAYABLE_KIND_LABEL[summary.byKind[0].kind as keyof typeof PAYABLE_KIND_LABEL] : "–"} hint={summary.byKind[0] ? formatPaise(summary.byKind[0].amount) : undefined} />
      </section>

      <Panel title="To pay">
        {pending.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            Nothing owed. Add a bill when one lands.
          </p>
        ) : (
          <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
            {pending.map((p) => {
              const overdue = p.dueDate < now;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{p.payee}</span>
                      <Pill tone="neutral">{PAYABLE_KIND_LABEL[p.kind]}</Pill>
                      {overdue && <Pill tone="danger">Overdue</Pill>}
                    </div>
                    <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {[p.description, p.reference ? `Ref ${p.reference}` : null, p.member ? `Member ${p.member.memberCode}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <div className="flex flex-col items-end text-sm">
                    <span className="font-semibold tabular-nums">{formatPaise(p.amount)}</span>
                    <span className="text-xs tabular-nums" style={{ color: overdue ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                      due {formatDate(p.dueDate, tz)}
                    </span>
                  </div>
                  <PayableActions payableId={p.id} payee={p.payee} amount={p.amount} />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Recently settled">
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No history yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <th className="py-2 pr-3 font-medium">Payee</th>
                  <th className="py-2 pr-3 font-medium">Kind</th>
                  <th className="py-2 pr-3 font-medium">Settled</th>
                  <th className="py-2 pr-3 font-medium">Mode</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pl-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td className="py-2 pr-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{p.payee}</span>
                        <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {p.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {PAYABLE_KIND_LABEL[p.kind]}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {formatDate(p.paidAt ?? p.updatedAt, tz)}
                    </td>
                    <td className="py-2 pr-3 text-xs">{p.paymentMode ? MODE_LABEL[p.paymentMode] : "–"}</td>
                    <td className="py-2 pr-3">
                      <Pill tone={statusTone(p.status)}>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</Pill>
                    </td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right font-semibold tabular-nums">{formatPaise(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
