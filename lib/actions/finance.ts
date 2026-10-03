"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth";
import { KernelError } from "@/lib/kernel";
import { createInvoice, createPayable, createReportShare, markInvoicePaid, payPayable, revokeReportShare, voidInvoice, voidPayable } from "@/lib/finance/engine";

export type ActionResult<T = undefined> = { success: true; message: string; data: T } | { success: false; error: string };

const FINANCE = ["OWNER"] as const;

function fail(err: unknown): { success: false; error: string } {
  if (err instanceof KernelError) return { success: false, error: err.message };
  if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message ?? "Invalid input." };
  if (err instanceof AuthError) return { success: false, error: err.code === "FORBIDDEN" ? "Not allowed." : "Please sign in." };
  console.error("[finance action]", err);
  return { success: false, error: "Something went wrong. Please try again." };
}

function touch(...paths: string[]) {
  revalidatePath("/owner");
  revalidatePath("/owner/finance");
  for (const p of paths) revalidatePath(p);
}

const PaymentModeSchema = z.enum(["CASH", "CARD", "UPI", "ONLINE", "CREDIT", "COMPLIMENTARY"]);

// ───────────────────────── Invoices ─────────────────────────

const InvoiceLineSchema = z.object({
  description: z.string().trim().min(1, "Every line needs a description").max(200),
  qty: z.coerce.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().int("Price must be in whole paise").min(0),
  taxRatePct: z.coerce.number().int().min(0).max(100),
});

const CreateInvoiceSchema = z.object({
  kind: z.enum(["MEMBERSHIP", "CORPORATE", "OTHER"]),
  memberId: z.string().min(1).optional().nullable(),
  billToName: z.string().trim().min(1, "Bill-to name is required").max(120),
  billToEmail: z.string().trim().email("Invalid email").or(z.literal("")).optional().nullable(),
  billToPhone: z.string().trim().max(20).optional().nullable(),
  billToAddress: z.string().trim().max(400).optional().nullable(),
  billToGstin: z.string().trim().max(15).optional().nullable(),
  dueInDays: z.coerce.number().int().min(0).max(90).default(7),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(InvoiceLineSchema).min(1, "Add at least one line"),
});

export async function createInvoiceAction(input: z.input<typeof CreateInvoiceSchema>): Promise<ActionResult<{ invoiceId: string; invoiceNo: string }>> {
  try {
    const user = await requireRole(...FINANCE);
    const data = CreateInvoiceSchema.parse(input);
    const inv = await createInvoice({ clubId: user.clubId, ...data, billToEmail: data.billToEmail || null, byUserId: user.userId });
    touch("/owner/invoices");
    return { success: true, message: `${inv.invoiceNo} issued.`, data: { invoiceId: inv.id, invoiceNo: inv.invoiceNo } };
  } catch (err) {
    return fail(err);
  }
}

const PayInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  paymentMode: PaymentModeSchema,
  reference: z.string().trim().max(80).optional().nullable(),
});

export async function markInvoicePaidAction(input: z.input<typeof PayInvoiceSchema>): Promise<ActionResult> {
  try {
    const user = await requireRole(...FINANCE);
    const data = PayInvoiceSchema.parse(input);
    const inv = await markInvoicePaid({ clubId: user.clubId, ...data, byUserId: user.userId });
    touch("/owner/invoices", `/owner/invoices/${inv.id}`, "/owner/tax");
    return { success: true, message: `${inv.invoiceNo} marked paid — posted to the ledger.`, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

const VoidInvoiceSchema = z.object({ invoiceId: z.string().min(1), reason: z.string().trim().min(1, "Say why").max(300) });

export async function voidInvoiceAction(input: z.input<typeof VoidInvoiceSchema>): Promise<ActionResult> {
  try {
    const user = await requireRole(...FINANCE);
    const data = VoidInvoiceSchema.parse(input);
    const inv = await voidInvoice({ clubId: user.clubId, ...data, byUserId: user.userId });
    touch("/owner/invoices", `/owner/invoices/${inv.id}`);
    return { success: true, message: `${inv.invoiceNo} voided.`, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

// ───────────────────────── Payables ─────────────────────────

const CreatePayableSchema = z.object({
  kind: z.enum(["SUPPLIER", "SALARY", "REFUND", "TAX", "OTHER"]),
  payee: z.string().trim().min(1, "Who do we owe?").max(120),
  description: z.string().trim().max(300).default(""),
  amount: z.coerce.number().int("Amount must be whole paise").min(1, "Amount must be positive"),
  dueDate: z.coerce.date(),
  reference: z.string().trim().max(80).optional().nullable(),
  memberId: z.string().min(1).optional().nullable(),
});

export async function createPayableAction(input: z.input<typeof CreatePayableSchema>): Promise<ActionResult<{ payableId: string }>> {
  try {
    const user = await requireRole(...FINANCE);
    const data = CreatePayableSchema.parse(input);
    const p = await createPayable({ clubId: user.clubId, ...data, byUserId: user.userId });
    touch("/owner/payables");
    return { success: true, message: `Payable to ${p.payee} recorded.`, data: { payableId: p.id } };
  } catch (err) {
    return fail(err);
  }
}

const PayPayableSchema = z.object({
  payableId: z.string().min(1),
  paymentMode: PaymentModeSchema,
  reference: z.string().trim().max(80).optional().nullable(),
});

export async function payPayableAction(input: z.input<typeof PayPayableSchema>): Promise<ActionResult> {
  try {
    const user = await requireRole(...FINANCE);
    const data = PayPayableSchema.parse(input);
    const p = await payPayable({ clubId: user.clubId, ...data, byUserId: user.userId });
    touch("/owner/payables");
    return { success: true, message: `Paid ${p.payee} — posted as an outgoing.`, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function voidPayableAction(payableId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(...FINANCE);
    await voidPayable({ clubId: user.clubId, payableId: z.string().min(1).parse(payableId), byUserId: user.userId });
    touch("/owner/payables");
    return { success: true, message: "Payable voided.", data: undefined };
  } catch (err) {
    return fail(err);
  }
}

// ───────────────────────── Report sharing ─────────────────────────

const ShareSchema = z.object({
  label: z.string().trim().max(80).default("Shared report"),
  period: z.enum(["today", "week", "month"]).default("month"),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export async function createReportShareAction(input: z.input<typeof ShareSchema>): Promise<ActionResult<{ token: string }>> {
  try {
    const user = await requireRole("OWNER");
    const data = ShareSchema.parse(input);
    const share = await createReportShare({ clubId: user.clubId, ...data });
    revalidatePath("/owner/reports");
    return { success: true, message: "Share link created.", data: { token: share.token } };
  } catch (err) {
    return fail(err);
  }
}

export async function revokeReportShareAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole("OWNER");
    await revokeReportShare({ clubId: user.clubId, id: z.string().min(1).parse(id) });
    revalidatePath("/owner/reports");
    return { success: true, message: "Link revoked.", data: undefined };
  } catch (err) {
    return fail(err);
  }
}
