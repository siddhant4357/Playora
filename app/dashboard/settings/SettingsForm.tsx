"use client";

/**
 * app/dashboard/settings/SettingsForm.tsx
 *
 * Client component for the profile settings form.
 */

import { useActionState } from "react";
import { updateProfileAction, type ProfileActionResult } from "@/lib/actions/profile";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SettingsFormProps {
  initialName: string;
  initialEmail: string;
  initialGender?: string | null;
  initialDob?: string | null; // ISO date string YYYY-MM-DD
}

export function SettingsForm({
  initialName,
  initialEmail,
  initialGender,
  initialDob,
}: SettingsFormProps) {
  const [state, action, isPending] = useActionState<ProfileActionResult | null, FormData>(
    updateProfileAction,
    null
  );

  const inputStyle = {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    background: "var(--color-bg)",
    padding: "10px 14px",
    fontSize: "0.875rem",
    color: "var(--color-text)",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "var(--color-text-muted)",
    marginBottom: "6px",
  };

  return (
    <form action={action}>
      {/* Success / Error banner */}
      {state?.success && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.25)",
            color: "#10b981",
            fontSize: "0.875rem",
            marginBottom: "20px",
          }}
        >
          <CheckCircle2 style={{ width: "16px", height: "16px", flexShrink: 0 }} />
          {state.message}
        </div>
      )}
      {state && !state.success && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444",
            fontSize: "0.875rem",
            marginBottom: "20px",
          }}
        >
          <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {/* Name */}
        <div>
          <label htmlFor="settings-name" style={labelStyle}>
            Full name <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            id="settings-name"
            name="name"
            type="text"
            required
            defaultValue={initialName}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#714B67")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
          {state && !state.success && state.fieldErrors?.name && (
            <p style={{ marginTop: "4px", fontSize: "0.75rem", color: "#ef4444" }}>
              {state.fieldErrors.name[0]}
            </p>
          )}
        </div>

        {/* Email (read-only) */}
        <div>
          <label style={labelStyle}>
            Email address
            <span
              style={{
                marginLeft: "8px",
                fontSize: "0.7rem",
                background: "var(--color-border)",
                padding: "2px 8px",
                borderRadius: "999px",
                color: "var(--color-text-muted)",
              }}
            >
              Cannot be changed
            </span>
          </label>
          <input
            type="email"
            value={initialEmail}
            disabled
            style={{
              ...inputStyle,
              opacity: 0.55,
              cursor: "not-allowed",
            }}
          />
        </div>

        {/* Gender */}
        <div>
          <label htmlFor="settings-gender" style={labelStyle}>
            Gender <span style={{ color: "var(--color-text-subtle)", fontWeight: 400 }}>(optional)</span>
          </label>
          <select
            id="settings-gender"
            name="gender"
            defaultValue={initialGender ?? ""}
            style={{
              ...inputStyle,
              cursor: "pointer",
              appearance: "auto",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#714B67")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          >
            <option value="">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Date of birth */}
        <div>
          <label htmlFor="settings-dob" style={labelStyle}>
            Date of birth <span style={{ color: "var(--color-text-subtle)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="settings-dob"
            name="dob"
            type="date"
            defaultValue={initialDob ?? ""}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#714B67")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          marginTop: "28px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 24px",
          borderRadius: "8px",
          background: isPending ? "#9b6887" : "#714B67",
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.875rem",
          border: "none",
          cursor: isPending ? "not-allowed" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {isPending && <Loader2 style={{ width: "15px", height: "15px", animation: "spin 1s linear infinite" }} />}
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
