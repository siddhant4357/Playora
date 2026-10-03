import { z } from "zod";

/**
 * One phone rule for every form (register, enquiry, trial, member intake,
 * leads, guest checkout). Each failure mode has its own message so a user
 * typing "98765abc" is told about letters, not "too short".
 */

const ALLOWED = /^[0-9+\-\s().]*$/;
const MIN_DIGITS = 10;
const MAX_DIGITS = 15;

export const PHONE_MESSAGES = {
  required: "Phone number is required.",
  letters: "Phone number can only contain digits (plus an optional +, spaces or dashes).",
  tooShort: `Phone number must have at least ${MIN_DIGITS} digits.`,
  tooLong: `Phone number can't have more than ${MAX_DIGITS} digits.`,
  plusPosition: "A + is only allowed at the very start of the number.",
} as const;

/** Returns the specific problem with a phone string, or null when it is valid. */
export function phoneProblem(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return PHONE_MESSAGES.required;
  if (!ALLOWED.test(value)) return PHONE_MESSAGES.letters;
  if (value.indexOf("+") > 0) return PHONE_MESSAGES.plusPosition;
  const digits = value.replace(/\D/g, "");
  if (digits.length < MIN_DIGITS) return PHONE_MESSAGES.tooShort;
  if (digits.length > MAX_DIGITS) return PHONE_MESSAGES.tooLong;
  return null;
}

/** Required phone: non-empty and well formed. */
export const phoneSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const problem = phoneProblem(value);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
  });

/** Optional phone: empty string / undefined is fine, anything else must be well formed. */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .superRefine((value, ctx) => {
    if (!value) return;
    const problem = phoneProblem(value);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
  });
