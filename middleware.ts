/**
 * middleware.ts
 *
 * Route protection using jose JWT verification on the Edge Runtime.
 *
 * Rules (the access matrix itself lives in lib/roles.ts):
 *  - protected prefixes (/me, /desk, /shop-pos, /bar, /coach, /owner, /admin,
 *    /display) → need a session; wrong role → sent to their own home
 *  - /app, /dashboard → entry points: redirect to homeFor(role)
 *  - /login, /register → redirect to homeFor(role) if already signed in
 *  - /                → always public (signed-in members can browse the site)
 *  - everything else passes through
 *
 * jose is used because the Edge Runtime has no Node crypto.
 */

import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { SessionPayload } from "@/lib/auth";
import { canAccess, homeFor, isProtectedPath } from "@/lib/roles";
import { SESSION_COOKIE_NAME, getSessionSecret } from "@/lib/session-secret";

async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const session = payload as unknown as SessionPayload;
    return session.clubId ? session : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await getSession(request);

  // ── Entry points: send the user to their role home ─────────────────────
  if (pathname === "/app" || pathname === "/dashboard") {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }

  // ── Signed-in users skip the auth pages ────────────────────────────────
  if (session && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }

  // ── Protected areas ────────────────────────────────────────────────────
  if (isProtectedPath(pathname)) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname + search);
      return NextResponse.redirect(loginUrl);
    }
    if (!canAccess(session.role, pathname)) {
      const home = new URL(homeFor(session.role), request.url);
      home.searchParams.set("error", "forbidden");
      return NextResponse.redirect(home);
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
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
