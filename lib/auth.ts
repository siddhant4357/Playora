/**
 * lib/auth.ts
 *
 * Core auth utilities:
 *  - Session creation / verification with jose (JWT, Edge-compatible)
 *  - Session cookie helpers
 *  - getCurrentUser() for Server Components / Server Actions
 *
 * We use `jose` instead of `jsonwebtoken` because middleware.ts runs on the
 * Next.js Edge Runtime which doesn't support Node.js crypto APIs natively.
 * jose uses the Web Crypto API and works on both Edge and Node.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "./roles";
import { SESSION_COOKIE_NAME, getSessionSecret } from "./session-secret";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  clubId: string;
  iat?: number;
  exp?: number;
}

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthError";
  }
}

// ── Constants ──────────────────────────────────────────────────────────────

const SESSION_COOKIE = SESSION_COOKIE_NAME;
const SESSION_DURATION = "7d";
const getSecret = getSessionSecret;

// ── JWT helpers ────────────────────────────────────────────────────────────

/**
 * Creates a signed JWT containing the user session payload.
 */
export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

/**
 * Verifies and decodes a session JWT. Returns null if invalid/expired.
 */
export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ─────────────────────────────────────────────────────────

/**
 * Sets the session cookie (HttpOnly, Secure in production).
 * Call this from Server Actions after successful sign-in.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: "/",
  });
}

/**
 * Clears the session cookie (used on logout).
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Reads and verifies the current session from the cookie store.
 * Returns null if no valid session exists.
 *
 * Suitable for Server Components and Server Actions.
 * For middleware use, read the cookie via `request.cookies` directly.
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  // Sessions issued before clubId existed are treated as signed-out so the
  // user re-authenticates and gets a complete payload.
  if (!session || !session.clubId) return null;
  return session;
}

/**
 * For Server Components / layouts: returns the session or redirects to
 * /login with the current path preserved as callbackUrl.
 */
export async function requireUser(callbackUrl?: string): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    const target = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";
    redirect(target);
  }
  return user;
}

/**
 * For Server Actions: throws instead of redirecting so the caller can map
 * the error to an ActionResult. Every mutating action starts with this.
 */
export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  if (roles.length > 0 && !roles.includes(user.role)) throw new AuthError("FORBIDDEN");
  return user;
}

export { SESSION_COOKIE_NAME };
