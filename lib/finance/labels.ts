import type { PaymentMode, TxSource } from "@/generated/prisma/client";

export const SOURCE_LABEL: Record<TxSource, string> = {
  COURT: "Courts",
  SHOP: "Shop",
  BAR: "Bar & café",
  MEMBERSHIP: "Memberships",
  COACHING: "Coaching",
  EVENT: "Events",
  CORPORATE: "Corporate",
  REFUND: "Refunds",
  PAYROLL: "Payroll",
  SUPPLIER: "Suppliers",
  OTHER: "Other",
};

export const MODE_LABEL: Record<PaymentMode, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  ONLINE: "Online",
  CREDIT: "Credit",
  COMPLIMENTARY: "Comp",
};

/** Stable chart colour per revenue source; the order is also the stacking order. */
export const REVENUE_SOURCES: TxSource[] = ["COURT", "MEMBERSHIP", "BAR", "SHOP", "COACHING", "CORPORATE", "EVENT", "OTHER"];

export const SOURCE_COLOR: Record<TxSource, string> = {
  COURT: "var(--chart-1)",
  MEMBERSHIP: "var(--chart-2)",
  BAR: "var(--chart-4)",
  SHOP: "var(--chart-5)",
  COACHING: "var(--chart-3)",
  CORPORATE: "var(--color-info)",
  EVENT: "var(--color-success)",
  OTHER: "var(--color-text-subtle)",
  REFUND: "var(--color-danger)",
  PAYROLL: "var(--color-text-muted)",
  SUPPLIER: "var(--color-text-muted)",
};

export const INVOICE_KIND_LABEL = { MEMBERSHIP: "Membership", CORPORATE: "Corporate", OTHER: "Other" } as const;
export const PAYABLE_KIND_LABEL = { SUPPLIER: "Supplier", SALARY: "Salary", REFUND: "Refund", TAX: "Tax", OTHER: "Other" } as const;
