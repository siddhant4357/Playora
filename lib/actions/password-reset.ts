/**
 * lib/actions/password-reset.ts
 *
 * Server Actions for password reset flow:
 *  - forgotPasswordAction  — validates email, creates token, sends email
 *  - resetPasswordAction   — validates token, updates password
 */

"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import type { ActionResult } from "./auth";

const ForgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const ResetSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
});

// ── forgotPasswordAction ──────────────────────────────────────────────────────

export async function forgotPasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get("email") as string };
  const parsed = ForgotSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email } = parsed.data;

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return {
      success: true,
      message: "If that email exists, a reset link has been sent.",
    };
  }

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Create a new token (1-hour expiry)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(user.email, user.name, resetUrl);
  } catch (err) {
    console.error("[forgot-password] email send failed:", err);
    return { success: false, error: "Failed to send reset email. Please try again." };
  }

  return {
    success: true,
    message: "If that email exists, a reset link has been sent.",
  };
}

// ── resetPasswordAction ───────────────────────────────────────────────────────

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    token: formData.get("token") as string,
    password: formData.get("password") as string,
  };

  const parsed = ResetSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { token, password } = parsed.data;

  // Look up token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return {
      success: false,
      error: "This reset link is invalid or has expired. Please request a new one.",
    };
  }

  // Hash new password and update user
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true, message: "Password updated successfully! You can now sign in." };
}

// ── validateResetToken (for page rendering) ───────────────────────────────────

export async function validateResetToken(
  token: string
): Promise<{ valid: boolean; email?: string }> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { email: true } } },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { valid: false };
  }

  return { valid: true, email: resetToken.user.email };
}
