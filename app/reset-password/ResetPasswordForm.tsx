"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/shared/BrandMark";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/password-reset";
import type { ActionResult } from "@/lib/actions/auth";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, isPending] = useActionState<ActionResult | null, FormData>(
    resetPasswordAction,
    null
  );

  if (!token) {
    return (
      <div className="w-full bg-white px-8 py-10 shadow-sm rounded-xl border border-gray-100 text-center">
        <XCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Invalid link</h1>
        <p className="text-sm text-gray-500 mb-6">This reset link is missing or malformed.</p>
        <Link href="/forgot-password" className="text-sm font-semibold text-[#714B67] hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="w-full bg-white px-8 py-10 shadow-sm rounded-xl border border-gray-100 text-center">
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Password updated!</h1>
        <p className="text-sm text-gray-500 mb-6">{state.message}</p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-[#714B67] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5e3d55] transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-white px-8 py-10 shadow-sm rounded-xl border border-gray-100">
      <div className="mb-6 text-center">
        <BrandMark />
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Set new password</h1>
        <p className="mt-1 text-sm text-gray-500">Choose a strong password for your account.</p>
      </div>

      {state && !state.success && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-5">
        {/* Hidden token */}
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 mb-1">
            New password
          </label>
          <div className="relative">
            <input
              id="reset-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Min 8 chars, upper + lower + number"
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 placeholder-gray-400 focus:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {state && !state.success && state.fieldErrors?.password && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <button
          id="reset-submit-btn"
          type="submit"
          disabled={isPending}
          className="flex w-full justify-center rounded-md bg-[#714B67] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5e3d55] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        >
          {isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
          {isPending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
