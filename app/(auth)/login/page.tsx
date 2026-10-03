/**
 * app/(auth)/login/page.tsx
 *
 * Login page with Odoo Enterprise style card.
 * Uses useActionState for form state + Server Action for auth.
 */

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/shared/BrandMark";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction, type ActionResult } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, action, isPending] = useActionState<ActionResult | null, FormData>(
    loginAction,
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const callbackUrl = useSearchParams().get("callbackUrl") ?? "";

  return (
    <div className="w-full bg-white dark:bg-[#1c1630] px-6 py-8 sm:px-10 sm:py-12 shadow-sm dark:shadow-[0_0_40px_rgba(113,75,103,0.15)] rounded-2xl border border-gray-100 dark:border-[#2e2048] dark:ring-1 dark:ring-[#3d2f5a]">
      {/* Logo + glow */}
      <div className="mb-6 text-center relative">
        {/* Ambient glow behind logo — same on all auth pages */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10">
          <div className="w-32 h-16 rounded-full opacity-0 dark:opacity-30 blur-2xl"
            style={{ background: "radial-gradient(ellipse, #714B67 0%, transparent 70%)" }} />
        </div>
        <BrandMark />
      </div>

      {/* Error */}
      {state && !state.success && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-5">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {/* Email */}
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-gray-700 dark:text-[#c8c2d4] mb-1"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={state && !state.success ? !!state.fieldErrors?.email : false}
            className="w-full rounded-md border border-gray-300 dark:border-[#3d2f5a] bg-white dark:bg-[#261f35] px-3 py-2 text-gray-900 dark:text-[#f0edf5] placeholder-gray-400 dark:placeholder-[#6b6278] focus:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67] dark:focus:border-[#9b6887] dark:focus:ring-[#9b6887] transition-colors"
          />
          {state && !state.success && state.fieldErrors?.email && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {state.fieldErrors.email[0]}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700 dark:text-[#c8c2d4]"
            >
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-[#714B67] dark:text-[#c89bdb] hover:underline">
              Reset Password
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={state && !state.success ? !!state.fieldErrors?.password : false}
              className="w-full rounded-md border border-gray-300 dark:border-[#3d2f5a] bg-white dark:bg-[#261f35] px-3 py-2 pr-10 text-gray-900 dark:text-[#f0edf5] placeholder-gray-400 dark:placeholder-[#6b6278] focus:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67] dark:focus:border-[#9b6887] dark:focus:ring-[#9b6887] transition-colors"
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
        </div>

        {/* Submit */}
        <button
          id="login-submit-btn"
          type="submit"
          disabled={isPending}
          className="flex w-full justify-center rounded-md bg-[#714B67] dark:bg-gradient-to-r dark:from-[#714B67] dark:to-[#8b5a7f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5e3d55] dark:hover:brightness-110 dark:shadow-[0_4px_15px_rgba(113,75,103,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#714B67] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
        >
          {isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
          {isPending ? "Signing in…" : "Log in"}
        </button>
      </form>

      {/* Footer link */}
      <div className="mt-8 text-center text-sm text-gray-600 dark:text-[#9b94aa]">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#714B67] dark:text-[#c89bdb] hover:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
