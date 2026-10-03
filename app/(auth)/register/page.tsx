/**
 * app/(auth)/register/page.tsx
 *
 * Registration page with full dark mode support.
 */

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/shared/BrandMark";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signupAction, type ActionResult } from "@/lib/actions/auth";

// Shared class tokens — keep consistent across all auth pages
const cardClass =
  "w-full bg-white dark:bg-[#1c1630] px-6 py-8 sm:px-10 sm:py-12 shadow-sm dark:shadow-[0_0_40px_rgba(113,75,103,0.15)] rounded-2xl border border-gray-100 dark:border-[#2e2048] dark:ring-1 dark:ring-[#3d2f5a]";
const labelClass =
  "block text-sm font-medium text-gray-700 dark:text-[#c8c2d4] mb-1";
const inputClass =
  "w-full rounded-md border border-gray-300 dark:border-[#3d2f5a] bg-white dark:bg-[#261f35] px-3 py-2 text-gray-900 dark:text-[#f0edf5] placeholder-gray-400 dark:placeholder-[#6b6278] focus:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67] dark:focus:border-[#9b6887] dark:focus:ring-[#9b6887] transition-colors";
const btnClass =
  "flex w-full justify-center rounded-md bg-[#714B67] dark:bg-gradient-to-r dark:from-[#714B67] dark:to-[#8b5a7f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5e3d55] dark:hover:brightness-110 dark:shadow-[0_4px_15px_rgba(113,75,103,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#714B67] disabled:opacity-70 disabled:cursor-not-allowed transition-all";
const errorClass =
  "mb-4 rounded-md bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50";
const fieldErrorClass = "mt-1 text-xs text-red-600 dark:text-red-400";

export default function RegisterPage() {
  const [state, action, isPending] = useActionState<ActionResult | null, FormData>(
    signupAction,
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const callbackUrl = useSearchParams().get("callbackUrl") ?? "";

  return (
    <div className={cardClass}>
      {/* Logo + glow */}
      <div className="mb-6 text-center relative">
        {/* Ambient glow behind logo */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10">
          <div className="w-32 h-16 rounded-full opacity-0 dark:opacity-30 blur-2xl"
            style={{ background: "radial-gradient(ellipse, #714B67 0%, transparent 70%)" }} />
        </div>
        <BrandMark />
      </div>

      {/* Global error */}
      {state && !state.success && !state.fieldErrors && (
        <div className={errorClass}>{state.error}</div>
      )}

      <form action={action} className="space-y-5">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {/* Name */}
        <div>
          <label htmlFor="register-name" className={labelClass}>Full name</label>
          <input
            id="register-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Arjun Sharma"
            className={inputClass}
            aria-invalid={state && !state.success ? !!state.fieldErrors?.name : false}
          />
          {state && !state.success && state.fieldErrors?.name && (
            <p className={fieldErrorClass}>{state.fieldErrors.name[0]}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="register-email" className={labelClass}>Email</label>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
            aria-invalid={state && !state.success ? !!state.fieldErrors?.email : false}
          />
          {state && !state.success && state.fieldErrors?.email && (
            <p className={fieldErrorClass}>{state.fieldErrors.email[0]}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="register-password" className={labelClass}>Password</label>
          <div className="relative">
            <input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Min 8 chars, mixed case + number"
              className={inputClass + " pr-10"}
              aria-invalid={state && !state.success ? !!state.fieldErrors?.password : false}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6b6278] hover:text-gray-600 dark:hover:text-[#c8c2d4] transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {state && !state.success && state.fieldErrors?.password ? (
            <p className={fieldErrorClass}>{state.fieldErrors.password[0]}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500 dark:text-[#7a7290]">
              Must contain uppercase, lowercase, and a number
            </p>
          )}
        </div>

        {/* Submit */}
        <button id="register-submit-btn" type="submit" disabled={isPending} className={btnClass}>
          {isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
          {isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      {/* Footer link */}
      <div className="mt-8 text-center text-sm text-gray-600 dark:text-[#9b94aa]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#714B67] dark:text-[#c89bdb] hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
