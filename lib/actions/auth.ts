/**
 * lib/actions/auth.ts
 *
 * Server Actions for authentication:
 *  - signupAction    — creates a new user account
 *  - loginAction     — authenticates and issues a session
 *  - logoutAction    — clears the session cookie
 *
 * All mutations are validated with Zod before touching the DB.
 * Successful auth events are logged to ActivityLog for the admin health page.
 */

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  getCurrentUser,
} from "@/lib/auth";
import { homeFor, type Role } from "@/lib/roles";
import { DEFAULT_CLUB_SLUG } from "@/lib/club";
import type { Prisma } from "../../generated/prisma/client";

/** Only same-origin relative paths are honoured, never external URLs. */
function safeCallback(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

// ── Zod schemas ─────────────────────────────────────────────────────────────

const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── Response type ────────────────────────────────────────────────────────────

export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ── Helper: log auth event ───────────────────────────────────────────────────

async function logEvent(
  action: string,
  entity: string,
  entityId: string,
  userId: string,
  newData?: Prisma.InputJsonValue,
  clubId?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entity,
        entityId,
        newData: newData ?? undefined,
        userId,
        clubId,
      },
    });
  } catch (err) {
    // Non-critical — don't block the main flow if logging fails
    console.error("[ActivityLog] Failed to log event:", err);
  }
}

// ── signupAction ─────────────────────────────────────────────────────────────

export async function signupAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = SignupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, password } = parsed.data;

  // Check for existing email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Public signup always creates a MEMBER of the default club.
  // Staff accounts are created by the owner from /owner/settings.
  const club = await prisma.club.findUnique({ where: { slug: DEFAULT_CLUB_SLUG } });
  if (!club) {
    return { success: false, error: "The club is not set up yet. Please run the seed." };
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "MEMBER", clubId: club.id },
  });

  // Log signup event
  await logEvent("USER_SIGNUP", "User", user.id, user.id, {
    email: user.email,
    name: user.name,
    role: user.role,
  });

  // Issue session
  const token = await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    clubId: user.clubId,
  });
  await setSessionCookie(token);

  redirect(homeFor("MEMBER"));
}

// ── loginAction ──────────────────────────────────────────────────────────────

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberate generic error to prevent email enumeration
  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return { success: false, error: "Invalid email or password." };
  }

  // Log login event
  await logEvent("USER_LOGIN", "User", user.id, user.id, {
    status: "authenticated",
  });

  // Issue session
  const token = await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    clubId: user.clubId,
  });
  await setSessionCookie(token);

  const callbackUrl = safeCallback(formData.get("callbackUrl"));
  redirect(callbackUrl ?? homeFor(user.role as Role));
}

// ── logoutAction ─────────────────────────────────────────────────────────────

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await logEvent("USER_LOGOUT", "User", user.userId, user.userId, {
      status: "logged_out",
    });
  }

  await clearSessionCookie();
  return { success: true };
}
