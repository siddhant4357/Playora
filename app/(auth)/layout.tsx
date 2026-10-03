/**
 * app/(auth)/layout.tsx
 *
 * Auth screen layout.
 * Odoo Enterprise style: Clean, light gray background, centered white card.
 */

import { Suspense, type ReactNode } from "react";
import Footer from "@/components/shared/Footer";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#0f0c18]"
      style={{ backgroundImage: "var(--auth-bg-pattern)" }}>
      {/* Subtle purple glow orb in dark mode */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-0 dark:opacity-20"
          style={{ background: "radial-gradient(circle, #714B67 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-0 dark:opacity-10"
          style={{ background: "radial-gradient(circle, #6ccbb5 0%, transparent 70%)" }} />
      </div>
      <div className="flex-1 flex flex-col items-center justify-start pt-[20vh] pb-[60vh] px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Login reads useSearchParams (callbackUrl); Suspense keeps the page statically renderable. */}
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>
      <Footer />
    </div>
  );
}

