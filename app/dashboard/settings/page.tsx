/**
 * app/dashboard/settings/page.tsx
 *
 * User settings page — profile info, optional fields, password change.
 */

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SettingsForm } from "./SettingsForm";
import { Key, User } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, gender: true, dob: true },
  });
  if (!user) redirect("/login");

  const dobString = user.dob
    ? user.dob.toISOString().slice(0, 10) // YYYY-MM-DD
    : null;

  return (
    <div style={{ width: "100%" }}>
      {/* Page header */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "var(--color-text)",
            letterSpacing: "-0.02em",
            marginBottom: "4px",
          }}
        >
          Account Settings
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          Manage your personal information and account preferences.
        </p>
      </div>

      {/* ── Profile section ── */}
      <section
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "rgba(113,75,103,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <User style={{ width: "14px", height: "14px", color: "#714B67" }} />
          </div>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text)" }}>
            Profile information
          </h2>
        </div>
        <div style={{ padding: "24px" }}>
          <SettingsForm
            initialName={user.name}
            initialEmail={user.email}
            initialGender={user.gender}
            initialDob={dobString}
          />
        </div>
      </section>

      {/* ── Password section ── */}
      <section
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
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "rgba(59,130,246,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Key style={{ width: "14px", height: "14px", color: "#3b82f6" }} />
          </div>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text)" }}>
            Password
          </h2>
        </div>
        <div style={{ padding: "24px" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "16px" }}>
            To change your password, we&apos;ll send a secure reset link to{" "}
            <strong style={{ color: "var(--color-text)" }}>{user.email}</strong>.
          </p>
          <Link
            href="/forgot-password"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
              transition: "border-color 0.15s",
            }}
          >
            <Key style={{ width: "14px", height: "14px" }} />
            Send password reset link
          </Link>
        </div>
      </section>
    </div>
  );
}
