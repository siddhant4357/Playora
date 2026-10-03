import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { getInvoice } from "@/lib/finance/queries";
import { MODE_LABEL } from "@/lib/finance/labels";
import { PrintSheet, PrintToolbar } from "@/components/print/PrintSheet";

export const metadata: Metadata = { title: "Tax invoice" };

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("OWNER");
  const { id } = await params;
  const [inv, club] = await Promise.all([getInvoice(user.clubId, id), prisma.club.findUniqueOrThrow({ where: { id: user.clubId } })]);
  if (!inv) notFound();
  const tz = club.timezone;
  const settings = (club.settings ?? {}) as { gstin?: string };

  const byRate = new Map<number, { taxable: number; tax: number }>();
  for (const l of inv.items) {
    const c = byRate.get(l.taxRatePct) ?? { taxable: 0, tax: 0 };
    c.taxable += l.amount;
    c.tax += l.tax;
    byRate.set(l.taxRatePct, c);
  }

  const meta: [string, string][] = [["Due", formatDate(inv.dueDate, tz, { long: true })]];
  if (settings.gstin) meta.unshift(["GSTIN", settings.gstin]);
  if (inv.status === "PAID" && inv.paidAt) meta.push(["Paid", `${formatDate(inv.paidAt, tz, { long: true })}${inv.paymentMode ? ` · ${MODE_LABEL[inv.paymentMode]}` : ""}`]);
  if (inv.status === "VOID") meta.push(["Status", "VOID"]);

  return (
    <>
      <PrintToolbar backHref={`/owner/invoices/${inv.id}`} />
      <PrintSheet
        club={club}
        docType={inv.status === "PAID" ? "Tax invoice · Paid" : "Tax invoice"}
        docNo={inv.invoiceNo}
        date={formatDate(inv.issueDate, tz, { long: true })}
        meta={meta}
        to={{ name: inv.billToName, lines: [inv.billToGstin ? `GSTIN ${inv.billToGstin}` : "", inv.billToAddress ?? "", inv.billToEmail ?? "", inv.billToPhone ?? ""].filter(Boolean) }}
        footer={
          <div>
            {inv.notes && <p>{inv.notes}</p>}
            <p className="ps-muted">
              Amounts in Indian Rupees. GST charged per line at the rates shown. {inv.status === "PAID" ? "This invoice has been settled in full." : "Please quote the invoice number with your payment."}
            </p>
          </div>
        }
      >
        <table className="ps-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="r">Qty</th>
              <th className="r">Unit (ex-GST)</th>
              <th className="r">Taxable</th>
              <th className="r">GST</th>
              <th className="r">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((l) => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td className="r">{l.qty}</td>
                <td className="r">{formatPaise(l.unitPrice)}</td>
                <td className="r">{formatPaise(l.amount)}</td>
                <td className="r">
                  {formatPaise(l.tax)} <span className="ps-muted">@{l.taxRatePct}%</span>
                </td>
                <td className="r">{formatPaise(l.amount + l.tax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>Subtotal (taxable value)</td>
              <td className="r">{formatPaise(inv.subtotal)}</td>
            </tr>
            {Array.from(byRate, ([rate, c]) => (
              <tr key={rate}>
                <td colSpan={5}>
                  GST @ {rate}% <span className="ps-muted">(CGST {rate / 2}% + SGST {rate / 2}% on {formatPaise(c.taxable)})</span>
                </td>
                <td className="r">{formatPaise(c.tax)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5}>
                <b>Total</b>
              </td>
              <td className="r">
                <b>{formatPaise(inv.total)}</b>
              </td>
            </tr>
          </tfoot>
        </table>
      </PrintSheet>
    </>
  );
}
