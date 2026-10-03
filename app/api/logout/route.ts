/**
 * app/api/logout/route.ts
 *
 * A simple GET route handler for logout.
 * Clearing cookies and redirecting in a Route Handler is instant
 * and avoids the complexity of Server Action + client-side redirect.
 */

import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  // Log the event (best-effort, don't block the redirect)
  try {
    const user = await getCurrentUser();
    if (user) {
      await prisma.activityLog.create({
        data: {
          action: "USER_LOGOUT",
          entity: "User",
          entityId: user.userId,
          userId: user.userId,
          newData: { status: "logged_out" },
        },
      });
    }
  } catch {
    // Non-critical
  }

  // Clear the session cookie
  await clearSessionCookie();

  // Hard redirect to login
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
