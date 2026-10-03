/**
 * Notification service — one call, a fallback chain behind it.
 *
 *   WhatsApp (Twilio)  →  email (Nodemailer)  →  in-app (ActivityLog row the UI can surface)
 *
 * Every attempt is recorded on the kernel's audit log, so the owner can
 * always answer "did the member actually get told?". Channels that are not
 * configured are skipped silently — the chain never throws.
 */
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/kernel";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp, whatsappConfigured } from "@/lib/whatsapp";

export type Channel = "whatsapp" | "email" | "inapp";

export interface NotifyInput {
  clubId: string;
  /** Who we're telling. Any of these may be missing; we use what we have. */
  to: { memberId?: string | null; userId?: string | null; phone?: string | null; email?: string | null; name?: string | null };
  /** Short, plain-text. WhatsApp shows it as-is; email wraps it. */
  subject: string;
  body: string;
  /** Why this went out, e.g. "BookingConfirmed". Stored on the audit log. */
  kind: string;
  refType?: string;
  refId?: string;
  /** Restrict or reorder the chain. Default: whatsapp → email → inapp. */
  channels?: Channel[];
}

export interface NotifyResult {
  delivered: Channel | null;
  attempted: Channel[];
}

async function resolveRecipient(input: NotifyInput) {
  const to = { ...input.to };
  if (input.to.memberId && (!to.phone || !to.email || !to.name)) {
    const m = await prisma.member.findUnique({ where: { id: input.to.memberId }, select: { phone: true, email: true, firstName: true, user: { select: { id: true } } } });
    if (m) {
      to.phone ??= m.phone;
      to.email ??= m.email;
      to.name ??= m.firstName;
      to.userId ??= m.user?.id ?? null;
    }
  }
  if (input.to.userId && (!to.phone || !to.email || !to.name)) {
    const u = await prisma.user.findUnique({ where: { id: input.to.userId }, select: { phone: true, email: true, name: true } });
    if (u) {
      to.phone ??= u.phone;
      to.email ??= u.email;
      to.name ??= u.name;
    }
  }
  return to;
}

export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const to = await resolveRecipient(input);
  const chain = input.channels ?? ["whatsapp", "email", "inapp"];
  const attempted: Channel[] = [];
  let delivered: Channel | null = null;

  for (const channel of chain) {
    if (channel === "whatsapp") {
      if (!whatsappConfigured() || !to.phone) continue;
      attempted.push(channel);
      if (await sendWhatsApp(to.phone, input.body)) {
        delivered = channel;
        break;
      }
    } else if (channel === "email") {
      if (!to.email) continue;
      attempted.push(channel);
      const html = `<p>${to.name ? `Hi ${to.name},` : "Hi,"}</p><p style="white-space:pre-line">${input.body}</p>`;
      if (await sendEmail(to.email, input.subject, html)) {
        delivered = channel;
        break;
      }
    } else {
      attempted.push(channel);
      delivered = channel; // the audit log row below *is* the in-app notification
      break;
    }
  }

  await logActivity(prisma, {
    clubId: input.clubId,
    userId: to.userId ?? null,
    action: "NOTIFY",
    entity: input.refType ?? "Notification",
    entityId: input.refId ?? input.kind,
    meta: { kind: input.kind, subject: input.subject, body: input.body, delivered, attempted, memberId: input.to.memberId ?? null, phone: to.phone ?? null },
  });

  return { delivered, attempted };
}

/** Pull the latest in-app notifications for a signed-in user (for the topbar bell). */
export async function listInAppNotifications(userId: string, take = 10) {
  return prisma.activityLog.findMany({ where: { userId, action: "NOTIFY" }, orderBy: { createdAt: "desc" }, take });
}
