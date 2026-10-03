import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/time";
import { getInvoice } from "@/lib/finance/queries";
import { INVOICE_KIND_LABEL, MODE_LABEL } from "@/lib/finance/labels";
import { PageHeader, Panel, Pill, statusTone } from "@/components/shared/Primitives";
import { InvoiceActions } from "@/components/owner/InvoiceActions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("OWNER");
  const { id } = await params;
  const [inv, club] = await Promise.all([getInvoice(user.clubId, id), prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } })]);
  if (!inv) notFound();
  const tz = club.timezone;
  const overdue = inv.status === "ISSUED" && inv.dueDate < new Date();

  return (
    <div className="flex flex-col gap-5">
      <Link href="/owner/invoices" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <ArrowLeft className="h-4 w-4" /> All invoices
      </Link>
      <PageHeader
        eyebrow={INVOICE_KIND_LABEL[inv.kind]}
        title={inv.invoiceNo}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Pill tone={overdue ? "danger" : statusTone(inv.status)}>{overdue ? "Overdue" : inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}</Pill>
            Issued {formatDate(inv.issueDate, tz)} · due {formatDate(inv.dueDate, tz)}
            {inv.paidAt && ` · paid ${formatDateTime(inv.paidAt, tz)} by ${inv.paymentMode ? MODE_LABEL[inv.paymentMode] : ""}`}
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" render={<Link href={`/print/invoice/${inv.id}`} target="_blank" />} nativeButton={false}>
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
            {inv.status === "ISSUED" && <InvoiceActions invoiceId={inv.id} invoiceNo={inv.invoiceNo} total={inv.total} />}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Lines">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pr-3 text-right font-medium">Qty</th>
                <th className="py-2 pr-3 text-right font-medium">Unit</th>
                <th className="py-2 pr-3 text-right font-medium">GST</th>
                <th className="py-2 pl-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((l) => (
                <tr key={l.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td className="py-2 pr-3">{l.description}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{l.qty}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatPaise(l.unitPrice)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {l.taxRatePct}% · {formatPaise(l.tax)}
                  </td>
                  <td className="py-2 pl-3 text-right font-medium tabular-nums">{formatPaise(l.amount + l.tax)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="text-sm">
              <tr style={{ borderTop: "2px solid var(--color-border-strong)" }}>
                <td colSpan={4} className="py-1.5 pr-3 text-right" style={{ color: "var(--color-text-muted)" }}>
                  Subtotal
                </td>
                <td className="py-1.5 pl-3 text-right tabular-nums">{formatPaise(inv.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="py-1.5 pr-3 text-right" style={{ color: "var(--color-text-muted)" }}>
                  GST
                </td>
                <td className="py-1.5 pl-3 text-right tabular-nums">{formatPaise(inv.tax)}</td>
              </tr>
              <tr className="font-bold">
                <td colSpan={4} className="py-1.5 pr-3 text-right">
                  Total
                </td>
                <td className="py-1.5 pl-3 text-right tabular-nums" style={{ color: "var(--color-primary-500)" }}>
                  {formatPaise(inv.total)}
                </td>
              </tr>
            </tfoot>
          </table>
          {inv.notes && (
            <p className="rounded-xl p-3 text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text-muted)" }}>
              {inv.notes}
            </p>
          )}
          {inv.voidReason && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              Voided: {inv.voidReason}
            </p>
          )}
        </Panel>

        <Panel title="Bill to">
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-semibold">{inv.billToName}</p>
            {inv.billToGstin && <p className="tabular-nums">GSTIN {inv.billToGstin}</p>}
            {inv.billToAddress && <p style={{ color: "var(--color-text-muted)" }}>{inv.billToAddress}</p>}
            {inv.billToEmail && <p style={{ color: "var(--color-text-muted)" }}>{inv.billToEmail}</p>}
            {inv.billToPhone && <p style={{ color: "var(--color-text-muted)" }}>{inv.billToPhone}</p>}
            {inv.member && (
              <Link href={`/desk/members/${inv.member.id}`} className="pt-2 text-xs font-medium hover:underline" style={{ color: "var(--color-accent-600)" }}>
                Member {inv.member.memberCode} · {inv.member.firstName} {inv.member.lastName}
              </Link>
            )}
          </div>
          {inv.transaction && (
            <div className="rounded-xl p-3 text-xs" style={{ background: "var(--color-bg)", color: "var(--color-text-muted)" }}>
              Posted to ledger {formatDateTime(inv.transaction.createdAt, tz)}
              {inv.transaction.reference && ` · ref ${inv.transaction.reference}`}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
