/**
 * app/reset-password/page.tsx
 *
 * Password reset page — reads ?token= from URL, validates it server-side,
 * then lets the user set a new password.
 */

import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="text-center text-gray-500">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
