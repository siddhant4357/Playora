/**
 * lib/actions/profile.ts
 *
 * Server action to update user profile (name, dob, gender).
 * Email is read-only. Password is handled via password-reset flow.
 */

"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const ProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  gender: z.string().optional(),
  dob: z.string().optional(),
});

export type ProfileActionResult =
  | { success: true; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateProfileAction(
  _prev: ProfileActionResult | null,
  formData: FormData
): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const raw = {
    name: formData.get("name") as string,
    gender: (formData.get("gender") as string) || undefined,
    dob: (formData.get("dob") as string) || undefined,
  };

  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, gender, dob } = parsed.data;

  await prisma.user.update({
    where: { id: user.userId },
    data: {
      name,
      gender: gender || null,
      dob: dob ? new Date(dob) : null,
    },
  });

  revalidatePath("/dashboard/settings");

  return { success: true, message: "Profile updated successfully!" };
}
