import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { listInvoices } from "@/lib/finance/queries";
import { INVOICE_KIND_LABEL } from "@/lib/finance/labels";
import { PageHeader, Panel, Pill, Stat, statusTone } from "@/components/shared/Primitives";
import { NewInvoiceDialog } from "@/components/owner/NewInvoiceDialog";

export const metadata: Metadata = { title: "Invoices" };

const STATUSES = ["ISSUED", "PAID", "VOID"] as const;
type Status = (typeof STATUSES)[number];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireRole("OWNER");
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : undefined;
  const { rows, summary } = await listInvoices(user.clubId, status);
  const now = new Date();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Finance" title="Invoices" subtitle="Receivables: memberships billed to companies, corporate events, league blocks. Marking one paid posts it to the ledger." actions={<NewInvoiceDialog />} />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Outstanding" value={formatPaise(summary.outstanding)} hint={`${summary.outstandingCount} open`} tone={summary.outstanding > 0 ? "warning" : undefined} />
        <Stat label="Overdue" value={formatPaise(summary.overdue)} tone={summary.overdue > 0 ? "danger" : undefined} />
        <Stat label="Collected (all time)" value={formatPaise(summary.paid)} tone="success" />
        <Stat label="Showing" value={rows.length} hint={status ? status.toLowerCase() : "all statuses"} />
      </section>

      <Panel
        title="Invoices"
        actions={
          <nav aria-label="Filter by status" className="flex gap-1 text-xs">
            {[undefined, ...STATUSES].map((s) => {
              const active = s === status;
              return (
                <Link key={s ?? "all"} href={s ? `/owner/invoices?status=${s}` : "/owner/invoices"} aria-current={active ? "page" : undefined} className="rounded-full px-2.5 py-1 font-medium" style={active ? { background: "var(--color-primary-500)", color: "var(--color-primary-foreground)" } : { color: "var(--color-text-muted)" }}>
                  {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
                </Link>
              );
            })}
          </nav>
        }
      >
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No invoices here yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <th className="py-2 pr-3 font-medium">Invoice</th>
                  <th className="py-2 pr-3 font-medium">Bill to</th>
                  <th className="py-2 pr-3 font-medium">Kind</th>
                  <th className="py-2 pr-3 font-medium">Issued</th>
                  <th className="py-2 pr-3 font-medium">Due</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pl-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const overdue = inv.status === "ISSUED" && inv.dueDate < now;
                  return (
                    <tr key={inv.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                      <td className="whitespace-nowrap py-2 pr-3">
                        <Link href={`/owner/invoices/${inv.id}`} className="font-semibold tabular-nums hover:underline">
                          {inv.invoiceNo}
                        </Link>
                      </td>
                      <td className="max-w-[16rem] truncate py-2 pr-3">
                        {inv.billToName}
                        {inv.member && (
                          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {" "}
                            · {inv.member.memberCode}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {INVOICE_KIND_LABEL[inv.kind]}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                        {formatDate(inv.issueDate, club.timezone)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 tabular-nums" style={{ color: overdue ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                        {formatDate(inv.dueDate, club.timezone)}
                      </td>
                      <td className="py-2 pr-3">
                        <Pill tone={overdue ? "danger" : statusTone(inv.status)}>{overdue ? "Overdue" : inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}</Pill>
                      </td>
                      <td className="whitespace-nowrap py-2 pl-3 text-right font-semibold tabular-nums">{formatPaise(inv.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
