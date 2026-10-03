import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, FileWarning, Landmark, PackageMinus, Receipt, UserMinus } from "lucide-react";
import type { getOwnerAlerts } from "@/lib/finance/queries";
import { formatPaise } from "@/lib/money";

type Alerts = Awaited<ReturnType<typeof getOwnerAlerts>>;

interface AlertItem {
  key: string;
  icon: typeof AlertTriangle;
  tone: "danger" | "warning" | "neutral";
  title: string;
  detail: string;
  href: string;
}

/** The handful of things worth a phone call today. Empty list is good news. */
export function OwnerAlerts({ alerts }: { alerts: Alerts }) {
  const items: AlertItem[] = [];
  if (alerts.overdueInvoices.count > 0) items.push({ key: "inv", icon: FileWarning, tone: "danger", title: `${alerts.overdueInvoices.count} overdue ${alerts.overdueInvoices.count === 1 ? "invoice" : "invoices"}`, detail: `${formatPaise(alerts.overdueInvoices.amount)} past due`, href: "/owner/invoices?status=ISSUED" });
  if (alerts.payablesDue.count > 0) items.push({ key: "pay", icon: Landmark, tone: "warning", title: `${alerts.payablesDue.count} ${alerts.payablesDue.count === 1 ? "bill" : "bills"} due this week`, detail: `${formatPaise(alerts.payablesDue.amount)} to pay out`, href: "/owner/payables" });
  if (alerts.expiring > 0) items.push({ key: "exp", icon: UserMinus, tone: "warning", title: `${alerts.expiring} ${alerts.expiring === 1 ? "membership expires" : "memberships expire"} within 14 days`, detail: "Renewal nudges go out from the desk", href: "/desk/members?filter=expiring" });
  if (alerts.lowStock > 0) items.push({ key: "stock", icon: PackageMinus, tone: "warning", title: `${alerts.lowStock} ${alerts.lowStock === 1 ? "product" : "products"} at or below reorder level`, detail: "Raise a supplier payable once ordered", href: "/shop-pos/inventory" });
  if (alerts.followUps > 0) items.push({ key: "leads", icon: Clock, tone: "neutral", title: `${alerts.followUps} lead ${alerts.followUps === 1 ? "follow-up" : "follow-ups"} overdue`, detail: "Every day a quote sits, it cools", href: "/desk/leads" });
  if (alerts.openTabs > 0) items.push({ key: "tabs", icon: Receipt, tone: "neutral", title: `${alerts.openTabs} bar ${alerts.openTabs === 1 ? "tab" : "tabs"} still open`, detail: "Unsettled tabs are not in today's revenue yet", href: "/bar/tabs" });

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        Nothing needs you. Enjoy it.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
      {items.map((a) => {
        const color = a.tone === "danger" ? "var(--color-danger)" : a.tone === "warning" ? "var(--color-warning)" : "var(--color-text-muted)";
        return (
          <li key={a.key}>
            <Link href={a.href} className="group flex items-center gap-3 py-2.5 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}>
                <a.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{a.title}</span>
                <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {a.detail}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--color-text-muted)" }} aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
