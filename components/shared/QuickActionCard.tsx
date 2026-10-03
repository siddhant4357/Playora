"use client";

import { Package, TrendingUp, AlertTriangle, Truck } from "lucide-react";

const quickActions = [
  { label: "Products", desc: "Manage product catalog", icon: Package, href: "/dashboard/products", color: "#714B67" },
  { label: "Transfers", desc: "View pending transfers", icon: Truck, href: "/dashboard/transfers", color: "#3b82f6" },
  { label: "Analytics", desc: "See inventory trends", icon: TrendingUp, href: "/dashboard/reports", color: "#10b981" },
  { label: "Low Stock", desc: "Items needing attention", icon: AlertTriangle, href: "/dashboard/stock", color: "#f59e0b" },
];

export function QuickActionsCard() {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)" }}>
          Quick Actions
        </h2>
      </div>
      <div
        style={{
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}
      >
        {quickActions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid var(--color-border)",
              textDecoration: "none",
              transition: "all 0.15s",
              cursor: "pointer",
              background: "var(--color-bg)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = action.color;
              el.style.background = `${action.color}10`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "var(--color-border)";
              el.style.background = "var(--color-bg)";
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: `${action.color}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <action.icon style={{ width: "15px", height: "15px", color: action.color }} />
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--color-text)",
                  marginBottom: "2px",
                }}
              >
                {action.label}
              </p>
              <p
                style={{
                  fontSize: "0.6875rem",
                  color: "var(--color-text-muted)",
                  lineHeight: 1.4,
                }}
              >
                {action.desc}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
