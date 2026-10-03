"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/shared/BrandMark";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { forgotPasswordAction as forgotAction } from "@/lib/actions/password-reset";
import type { ActionResult } from "@/lib/actions/auth";

const cardClass =
  "w-full bg-white dark:bg-[#1c1630] px-6 py-8 sm:px-10 sm:py-12 shadow-sm dark:shadow-[0_0_40px_rgba(113,75,103,0.15)] rounded-2xl border border-gray-100 dark:border-[#2e2048] dark:ring-1 dark:ring-[#3d2f5a]";
const labelClass =
  "block text-sm font-medium text-gray-700 dark:text-[#c8c2d4] mb-1";
const inputClass =
  "w-full rounded-md border border-gray-300 dark:border-[#3d2f5a] bg-white dark:bg-[#261f35] px-3 py-2 text-gray-900 dark:text-[#f0edf5] placeholder-gray-400 dark:placeholder-[#6b6278] focus:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67] dark:focus:border-[#9b6887] dark:focus:ring-[#9b6887] transition-colors";
const btnClass =
  "flex w-full justify-center rounded-md bg-[#714B67] dark:bg-gradient-to-r dark:from-[#714B67] dark:to-[#8b5a7f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5e3d55] dark:hover:brightness-110 dark:shadow-[0_4px_15px_rgba(113,75,103,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#714B67] disabled:opacity-70 disabled:cursor-not-allowed transition-all";

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState<ActionResult | null, FormData>(
    forgotAction,
    null
  );

  return (
    <div className={cardClass}>
      {/* Logo + glow */}
      <div className="mb-6 text-center relative">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10">
          <div className="w-32 h-16 rounded-full opacity-0 dark:opacity-30 blur-2xl"
            style={{ background: "radial-gradient(ellipse, #714B67 0%, transparent 70%)" }} />
        </div>
        <BrandMark />
      </div>

      {state?.success ? (
        /* ── Success state ── */
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/40">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#f0edf5] mb-2">
            Check your email
          </h2>
          <p className="text-sm text-gray-600 dark:text-[#9b94aa] mb-6">{state.message}</p>
          <Link
            href="/login"
            className="text-sm font-semibold text-[#714B67] dark:text-[#c89bdb] hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-[#f0edf5]">
              Forgot password?
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9b94aa]">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {state && !state.success && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50">
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className={labelClass}>
                Email
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <button
              id="forgot-submit-btn"
              type="submit"
              disabled={isPending}
              className={btnClass}
            >
              {isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              {isPending ? "Sending…" : "Send reset link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-[#9b94aa] hover:text-[#714B67] dark:hover:text-[#c89bdb] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
