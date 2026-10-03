import "server-only";
import type { InvoiceKind, PayableKind, PaymentMode, TxSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { KernelError, docNumber, logActivity, postTransaction } from "@/lib/kernel";

// ───────────────────────── Invoices (receivables) ─────────────────────────

export interface InvoiceLineInput {
  description: string;
  qty: number;
  unitPrice: number; // paise, ex-tax
  taxRatePct: number;
}

export interface CreateInvoiceInput {
  clubId: string;
  kind: InvoiceKind;
  memberId?: string | null;
  billToName: string;
  billToEmail?: string | null;
  billToPhone?: string | null;
  billToAddress?: string | null;
  billToGstin?: string | null;
  dueInDays?: number;
  items: InvoiceLineInput[];
  notes?: string | null;
  byUserId?: string | null;
}

export function totalInvoiceLines(items: InvoiceLineInput[]) {
  let subtotal = 0;
  let tax = 0;
  const lines = items.map((l, i) => {
    if (!Number.isInteger(l.qty) || l.qty <= 0) throw new KernelError("BAD_QTY", "Quantity must be a positive whole number.");
    if (!Number.isInteger(l.unitPrice) || l.unitPrice < 0) throw new KernelError("BAD_PRICE", "Unit price must be a non-negative amount.");
    if (l.taxRatePct < 0 || l.taxRatePct > 100) throw new KernelError("BAD_TAX", "Tax rate must be 0–100.");
    const amount = l.qty * l.unitPrice;
    const lineTax = Math.round((amount * l.taxRatePct) / 100);
    subtotal += amount;
    tax += lineTax;
    return { ...l, description: l.description.trim(), amount, tax: lineTax, sortOrder: i };
  });
  return { lines, subtotal, tax, total: subtotal + tax };
}

export async function createInvoice(input: CreateInvoiceInput) {
  if (!input.billToName.trim()) throw new KernelError("NO_NAME", "Who is this invoice for?");
  if (input.items.length === 0) throw new KernelError("NO_LINES", "Add at least one line.");
  if (input.items.some((l) => !l.description.trim())) throw new KernelError("NO_DESC", "Every line needs a description.");
  const { lines, subtotal, tax, total } = totalInvoiceLines(input.items);
  const now = new Date();
  const dueDate = new Date(now.getTime() + (input.dueInDays ?? 7) * 86_400_000);

  return prisma.$transaction(async (tx) => {
    if (input.memberId) {
      const m = await tx.member.findFirst({ where: { id: input.memberId, clubId: input.clubId }, select: { id: true } });
      if (!m) throw new KernelError("NOT_FOUND", "Member not found.");
    }
    const created = await tx.invoice.create({
      data: {
        clubId: input.clubId,
        invoiceNo: `TMP-${Date.now()}`,
        kind: input.kind,
        memberId: input.memberId ?? null,
        billToName: input.billToName.trim(),
        billToEmail: input.billToEmail?.trim() || null,
        billToPhone: input.billToPhone?.trim() || null,
        billToAddress: input.billToAddress?.trim() || null,
        billToGstin: input.billToGstin?.trim().toUpperCase() || null,
        issueDate: now,
        dueDate,
        subtotal,
        tax,
        total,
        notes: input.notes?.trim() || null,
        createdById: input.byUserId ?? null,
        items: { create: lines },
      },
    });
    const invoice = await tx.invoice.update({ where: { id: created.id }, data: { invoiceNo: docNumber("INV", created.hashId, now) }, include: { items: true } });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "INVOICE_ISSUED", entity: "Invoice", entityId: invoice.id, meta: { invoiceNo: invoice.invoiceNo, total, kind: input.kind } });
    return invoice;
  });
}

const INVOICE_SOURCE: Record<InvoiceKind, TxSource> = { MEMBERSHIP: "MEMBERSHIP", CORPORATE: "CORPORATE", OTHER: "OTHER" };

export async function markInvoicePaid(input: { clubId: string; invoiceId: string; paymentMode: PaymentMode; reference?: string | null; byUserId?: string | null; paidAt?: Date }) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findFirst({ where: { id: input.invoiceId, clubId: input.clubId } });
    if (!inv) throw new KernelError("NOT_FOUND", "Invoice not found.");
    if (inv.status === "PAID") throw new KernelError("ALREADY_PAID", `${inv.invoiceNo} is already paid.`);
    if (inv.status === "VOID") throw new KernelError("VOID", `${inv.invoiceNo} was voided.`);

    const txn = await postTransaction(tx, {
      clubId: input.clubId,
      source: INVOICE_SOURCE[inv.kind],
      direction: "IN",
      amount: inv.total,
      tax: inv.tax,
      paymentMode: input.paymentMode,
      reference: input.reference ?? null,
      refType: "Invoice",
      refId: inv.id,
      memberId: inv.memberId,
      description: `Invoice ${inv.invoiceNo} · ${inv.billToName}`,
      byUserId: input.byUserId ?? null,
    });
    const updated = await tx.invoice.update({ where: { id: inv.id }, data: { status: "PAID", paidAt: input.paidAt ?? new Date(), paymentMode: input.paymentMode, transactionId: txn.id } });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "INVOICE_PAID", entity: "Invoice", entityId: inv.id, meta: { invoiceNo: inv.invoiceNo, amount: inv.total, mode: input.paymentMode } });
    return updated;
  });
}

export async function voidInvoice(input: { clubId: string; invoiceId: string; reason: string; byUserId?: string | null }) {
  if (!input.reason.trim()) throw new KernelError("NEED_REASON", "Say why.");
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findFirst({ where: { id: input.invoiceId, clubId: input.clubId } });
    if (!inv) throw new KernelError("NOT_FOUND", "Invoice not found.");
    if (inv.status === "PAID") throw new KernelError("PAID", "Paid invoices cannot be voided — raise a refund payable instead.");
    const updated = await tx.invoice.update({ where: { id: inv.id }, data: { status: "VOID", voidReason: input.reason.trim() } });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "INVOICE_VOID", entity: "Invoice", entityId: inv.id, meta: { reason: input.reason } });
    return updated;
  });
}

// ───────────────────────── Payables ─────────────────────────

const PAYABLE_SOURCE: Record<PayableKind, TxSource> = { SUPPLIER: "SUPPLIER", SALARY: "PAYROLL", REFUND: "REFUND", TAX: "OTHER", OTHER: "OTHER" };

export async function createPayable(input: { clubId: string; kind: PayableKind; payee: string; description: string; amount: number; dueDate: Date; reference?: string | null; memberId?: string | null; byUserId?: string | null }) {
  if (!input.payee.trim()) throw new KernelError("NO_PAYEE", "Who do we owe?");
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new KernelError("BAD_AMOUNT", "Amount must be positive.");
  const p = await prisma.payable.create({
    data: {
      clubId: input.clubId,
      kind: input.kind,
      payee: input.payee.trim(),
      description: input.description.trim() || input.kind.toLowerCase(),
      amount: input.amount,
      dueDate: input.dueDate,
      reference: input.reference?.trim() || null,
      memberId: input.memberId ?? null,
      createdById: input.byUserId ?? null,
    },
  });
  await logActivity(prisma, { clubId: input.clubId, userId: input.byUserId, action: "PAYABLE_CREATED", entity: "Payable", entityId: p.id, meta: { kind: input.kind, amount: input.amount } });
  return p;
}

export async function payPayable(input: { clubId: string; payableId: string; paymentMode: PaymentMode; reference?: string | null; byUserId?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.payable.findFirst({ where: { id: input.payableId, clubId: input.clubId } });
    if (!p) throw new KernelError("NOT_FOUND", "Payable not found.");
    if (p.status !== "PENDING") throw new KernelError("NOT_PENDING", `Already ${p.status.toLowerCase()}.`);

    const txn = await postTransaction(tx, {
      clubId: input.clubId,
      source: PAYABLE_SOURCE[p.kind],
      direction: "OUT",
      amount: p.amount,
      paymentMode: input.paymentMode,
      reference: input.reference ?? p.reference,
      refType: "Payable",
      refId: p.id,
      memberId: p.memberId,
      description: `${p.kind === "SALARY" ? "Salary" : p.kind === "REFUND" ? "Refund" : p.kind === "SUPPLIER" ? "Supplier bill" : "Payment"} · ${p.payee}${p.reference ? ` · ${p.reference}` : ""}`,
      byUserId: input.byUserId ?? null,
    });
    const updated = await tx.payable.update({ where: { id: p.id }, data: { status: "PAID", paidAt: new Date(), paymentMode: input.paymentMode, transactionId: txn.id } });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "PAYABLE_PAID", entity: "Payable", entityId: p.id, meta: { amount: p.amount, mode: input.paymentMode } });
    return updated;
  });
}

export async function voidPayable(input: { clubId: string; payableId: string; byUserId?: string | null }) {
  const p = await prisma.payable.findFirst({ where: { id: input.payableId, clubId: input.clubId } });
  if (!p) throw new KernelError("NOT_FOUND", "Payable not found.");
  if (p.status !== "PENDING") throw new KernelError("NOT_PENDING", `Already ${p.status.toLowerCase()}.`);
  return prisma.payable.update({ where: { id: p.id }, data: { status: "VOID" } });
}

// ───────────────────────── Report sharing ─────────────────────────

export async function createReportShare(input: { clubId: string; label: string; period: "today" | "week" | "month"; days?: number }) {
  return prisma.reportShare.create({
    data: { clubId: input.clubId, label: input.label.trim() || "Shared report", period: input.period, expiresAt: new Date(Date.now() + (input.days ?? 30) * 86_400_000) },
  });
}

export async function revokeReportShare(input: { clubId: string; id: string }) {
  return prisma.reportShare.deleteMany({ where: { id: input.id, clubId: input.clubId } });
}
