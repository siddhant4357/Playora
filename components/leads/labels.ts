import type { LeadStage } from "@/generated/prisma/client";

export const STAGE_LABEL: Record<LeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTE_SENT: "Quote sent",
  TRIAL_BOOKED: "Trial booked",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export const SOURCE_LABEL: Record<string, string> = {
  WEBSITE: "Website",
  WALK_IN: "Walk-in",
  PHONE: "Phone",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Referral",
  INSTAGRAM: "Instagram",
};

export const ACTIVITY_LABEL: Record<string, string> = {
  NOTE: "Note",
  CALL: "Call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  QUOTE: "Quote",
  STAGE_CHANGE: "Stage",
  TRIAL: "Trial",
};

export function followUpState(iso: string | null, stage: LeadStage, timezone: string): { label: string; tone: "danger" | "warning" | "neutral" } | null {
  if (!iso || stage === "CONVERTED" || stage === "LOST") return null;
  const at = new Date(iso);
  const diffH = (at.getTime() - Date.now()) / 3_600_000;
  if (diffH < 0) return { label: diffH > -24 ? "Overdue" : `Overdue ${Math.floor(-diffH / 24)}d`, tone: "danger" };
  if (diffH < 24) return { label: `Today ${new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(at)}`, tone: "warning" };
  return { label: new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", timeZone: timezone }).format(at), tone: "neutral" };
}

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
