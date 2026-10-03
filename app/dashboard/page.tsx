/**
 * app/(dashboard)/page.tsx
 *
 * Main dashboard page — modern design, full dark mode, full-width layout.
 */

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  Users,
  Activity,
  Zap,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Package,
  Truck,
} from "lucide-react";
import { QuickActionsCard } from "@/components/shared/QuickActionCard";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [userCount, recentLogs] = await Promise.all([
    prisma.user.count(),
    prisma.activityLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const stats = [
    {
      label: "Total Users",
      value: userCount,
      icon: Users,
      trend: "+0%",
      accent: "#714B67",
      accentBg: "rgba(113,75,103,0.1)",
    },
    {
      label: "Actions (24h)",
      value: recentLogs,
      icon: Activity,
      trend: "Today",
      accent: "#3b82f6",
      accentBg: "rgba(59,130,246,0.1)",
    },
    {
      label: "Your Role",
      value: user.role,
      icon: Zap,
      trend: "Active",
      accent: "#f59e0b",
      accentBg: "rgba(245,158,11,0.1)",
    },
  ];

  const recentActivity = [
    { label: "New user registered", time: "Just now", icon: CheckCircle2, color: "#10b981" },
    { label: "Stock level updated", time: "2 mins ago", icon: Package, color: "#714B67" },
    { label: "Transfer completed", time: "10 mins ago", icon: Truck, color: "#3b82f6" },
    { label: "Report generated", time: "1 hour ago", icon: Activity, color: "#f59e0b" },
  ];

  return (
    <div style={{ width: "100%" }}>
      {/* ── Welcome banner ── */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--color-text)",
            marginBottom: "4px",
            letterSpacing: "-0.02em",
          }}
        >
          Good to see you, {user.name.split(" ")[0]} 👋
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          Here&apos;s what&apos;s happening across the platform.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
              padding: "20px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "80px",
                height: "80px",
                borderRadius: "0 12px 0 80px",
                background: stat.accentBg,
              }}
            />
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: stat.accentBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <stat.icon style={{ width: "18px", height: "18px", color: stat.accent }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--color-text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    color: "var(--color-text)",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {stat.value}
                </p>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    color: "#10b981",
                    marginTop: "6px",
                  }}
                >
                  <ArrowUpRight style={{ width: "12px", height: "12px" }} />
                  {stat.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column: Quick Actions + Recent Activity ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          marginBottom: "80px",
        }}
      >
        {/* Quick Actions — client component */}
        <QuickActionsCard />

        {/* Recent Activity */}
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
            <h2
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              Recent Activity
            </h2>
            <a
              href="#"
              style={{
                fontSize: "0.75rem",
                color: "#714B67",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              View all →
            </a>
          </div>
          <div>
            {recentActivity.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 20px",
                  borderBottom:
                    i < recentActivity.length - 1
                      ? "1px solid var(--color-border)"
                      : "none",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: `${item.color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <item.icon
                    style={{ width: "14px", height: "14px", color: item.color }}
                  />
                </div>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "var(--color-text)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--color-text-muted)",
                    flexShrink: 0,
                  }}
                >
                  <Clock style={{ width: "11px", height: "11px" }} />
                  <span style={{ fontSize: "0.6875rem" }}>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
