/**
 * middleware.ts
 *
 * Route protection using jose JWT verification on the Edge Runtime.
 *
 * Rules:
 *  - /dashboard/** → requires a valid session (any role)
 *  - /admin/**     → requires a valid session with role === "ADMIN"
 *  - /login, /register → redirect to /dashboard if already logged in
 *  - /               → always public (signed-in members can browse the site)
 *  - Everything else passes through
 *
 * We use jose for JWT verification here because Next.js middleware
 * runs on the Edge Runtime which cannot use Node.js crypto APIs.
 */

import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { SessionPayload } from "@/lib/auth";

const SESSION_COOKIE = "ldxodoo_session";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "dev-only-secret-change-before-production";
  return new TextEncoder().encode(secret);
}

async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await getSession(request);

  // ── Redirect authenticated users away from auth pages ──────────────────
  // The public site (/) stays reachable when signed in: a member should be
  // able to browse courts and plans without being bounced to the dashboard.
  if (session && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── Protect dashboard routes ────────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Protect admin routes ────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "ADMIN") {
      // Authenticated but not admin — redirect to dashboard with error flag
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *  - _next/static (static files)
     *  - _next/image (image optimization)
     *  - favicon.ico, public assets
     *  - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
