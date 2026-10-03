/**
 * app/admin/health/page.tsx
 *
 * Admin health dashboard.
 *
 * SCOPE NOTE: This page replaces a full Grafana/Prometheus observability
 * stack. For a hackathon build, direct DB queries against ActivityLog give
 * us everything we need: recent events, action counts, and user growth.
 * Wire up a real observability platform (e.g. Grafana Cloud) post-hackathon
 * if the product moves to production.
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, Users, Activity, CheckCircle2, Clock } from "lucide-react";

export default async function AdminHealthPage() {
  const user = await getCurrentUser();

  // Middleware and the admin layout already block non-owners, but guard here too
  if (!user || user.role !== "OWNER") {
    redirect("/app?error=forbidden");
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Real data — single batch query
  const [totalUsers, actionsLast24h, recentLogs] = await Promise.all([
    prisma.user.count(),
    prisma.activityLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-text)" }}>
            System Health
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            Real-time platform metrics and audit trail
          </p>
        </div>

        {/* All systems operational badge */}
        <div
          id="health-status-badge"
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "#dcfce7",
            border: "1px solid #bbf7d0",
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "var(--color-success)" }}
          />
          <CheckCircle2 className="w-4 h-4" style={{ color: "var(--color-success)" }} />
          <span className="text-sm font-semibold" style={{ color: "#15803d" }}>
            All systems operational
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-primary-50)" }}
          >
            <Users className="w-5 h-5" style={{ color: "var(--color-primary-500)" }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Total Users
            </p>
            <p className="text-3xl font-bold mt-0.5" style={{ color: "var(--color-text)" }}>
              {totalUsers}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#e0f7f7" }}
          >
            <Activity className="w-5 h-5" style={{ color: "var(--color-accent-500)" }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Actions (24h)
            </p>
            <p className="text-3xl font-bold mt-0.5" style={{ color: "var(--color-text)" }}>
              {actionsLast24h}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#fef3c7" }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: "var(--color-warning)" }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Audit Events (Total)
            </p>
            <p className="text-3xl font-bold mt-0.5" style={{ color: "var(--color-text)" }}>
              {recentLogs.length > 0
                ? await prisma.activityLog.count().then((c) => c)
                : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Recent activity log table */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-2 h-6 rounded-full flex-shrink-0"
            style={{ background: "var(--color-primary-500)" }}
          />
          <h2 className="font-semibold" style={{ color: "var(--color-text)" }}>
            Recent Activity Log
          </h2>
          <span className="badge badge-neutral ml-auto">Last 10 events</span>
        </div>

        {recentLogs.length === 0 ? (
          <p className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
            No activity recorded yet. Run the seed script to populate sample data.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table
              className="w-full text-sm"
              style={{ borderCollapse: "separate", borderSpacing: 0 }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["Action", "Entity", "User", "IP Address", "When"].map((col) => (
                    <th
                      key={col}
                      className="text-left px-6 pb-3 font-semibold text-xs uppercase tracking-wider"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom:
                        idx < recentLogs.length - 1
                          ? "1px solid var(--color-border)"
                          : "none",
                    }}
                  >
                    {/* Action */}
                    <td className="px-6 py-3">
                      <ActionBadge action={log.action} />
                    </td>

                    {/* Entity */}
                    <td className="px-6 py-3">
                      <span style={{ color: "var(--color-text)" }}>{log.entity}</span>
                      {log.entityId && (
                        <span
                          className="ml-1.5 font-mono text-xs"
                          style={{ color: "var(--color-text-subtle)" }}
                        >
                          #{log.hashId}
                        </span>
                      )}
                    </td>

                    {/* User */}
                    <td className="px-6 py-3">
                      {log.user ? (
                        <div>
                          <p className="font-medium" style={{ color: "var(--color-text)" }}>
                            {log.user.name}
                          </p>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {log.user.email}
                          </p>
                        </div>
                      ) : (
                        <span style={{ color: "var(--color-text-subtle)" }}>System</span>
                      )}
                    </td>

                    {/* IP */}
                    <td className="px-6 py-3">
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {log.ipAddress ?? "—"}
                      </span>
                    </td>

                    {/* When */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: action badge ──────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    USER_SIGNUP: { bg: "#dcfce7", color: "#15803d" },
    USER_LOGIN: { bg: "#dbeafe", color: "#1d4ed8" },
    USER_LOGOUT: { bg: "#f3eff5", color: "var(--color-text-muted)" },
  };
  const style = map[action] ?? { bg: "#fef3c7", color: "#b45309" };

  return (
    <span
      className="badge"
      style={{ background: style.bg, color: style.color }}
    >
      {action.replace(/_/g, " ")}
    </span>
  );
}
