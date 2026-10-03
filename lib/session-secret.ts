/**
 * lib/session-secret.ts
 *
 * One place for the JWT secret so middleware (Edge) and server code can
 * never disagree about which key signs sessions. Production requires
 * JWT_SECRET; development falls back to a fixed key so the preview works
 * before env vars are configured.
 */

export const SESSION_COOKIE_NAME = "ldxodoo_session";

const DEV_FALLBACK = "dev-only-secret-change-before-production";

export function getSessionSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is not set.");
    }
    return new TextEncoder().encode(DEV_FALLBACK);
  }
  return new TextEncoder().encode(secret);
}
