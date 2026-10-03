import type { ReactNode, CSSProperties } from "react";
import { cn } from "cn";

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-balance">{title}</h1>
        {subtitle && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, children, className, actions, style }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode; style?: CSSProperties }) {
  return (
    <section
      className={cn("flex flex-col gap-3 rounded-2xl p-4", className)}
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", ...style }}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const color =
    tone === "success" ? "var(--color-success)" : tone === "warning" ? "var(--color-warning)" : tone === "danger" ? "var(--color-danger)" : "var(--color-text)";
  return (
    <div className="flex flex-col gap-1 rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>
        {value}
      </span>
      {hint && (
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function Pill({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "accent"; className?: string }) {
  const styles: Record<string, CSSProperties> = {
    neutral: { background: "var(--color-bg)", color: "var(--color-text-muted)" },
    success: { background: "color-mix(in oklab, var(--color-success) 14%, transparent)", color: "var(--color-success)" },
    warning: { background: "color-mix(in oklab, var(--color-warning) 16%, transparent)", color: "var(--color-warning)" },
    danger: { background: "color-mix(in oklab, var(--color-danger) 14%, transparent)", color: "var(--color-danger)" },
    accent: { background: "color-mix(in oklab, var(--color-accent-500) 14%, transparent)", color: "var(--color-accent-600)" },
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", className)} style={styles[tone]}>
      {children}
    </span>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center" style={{ borderColor: "var(--color-border)" }}>
      <p className="font-medium">{title}</p>
      {hint && (
        <p className="max-w-sm text-sm text-pretty" style={{ color: "var(--color-text-muted)" }}>
          {hint}
        </p>
      )}
      {action}
    </div>
  );
}

export function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "accent" {
  switch (status) {
    case "ACTIVE":
    case "PAID":
    case "COMPLETED":
    case "SETTLED":
    case "READY":
    case "CONVERTED":
    case "COLLECTED":
      return "success";
    case "TRIAL":
    case "PENDING":
    case "PREPARING":
    case "OPEN":
    case "QUOTE_SENT":
    case "TRIAL_BOOKED":
    case "IN_PROGRESS":
      return "warning";
    case "EXPIRED":
    case "CANCELLED":
    case "FROZEN":
    case "VOID":
    case "LOST":
      return "danger";
    case "NEW":
    case "CONTACTED":
    case "READY_FOR_PICKUP":
      return "accent";
    default:
      return "neutral";
  }
}
