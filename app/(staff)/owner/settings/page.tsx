import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClub } from "@/lib/club";
import { policyFrom } from "@/lib/booking/policy";
import { ROLE_LABELS } from "@/lib/roles";
import { PageHeader, Panel, Pill } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { BookingPolicyForm, ClubProfileForm } from "@/components/owner/ClubSettingsForms";

export const metadata: Metadata = { title: "Club settings" };

interface IntegrationStatus {
  name: string;
  purpose: string;
  configured: boolean;
  detail: string;
  docs: string;
}

const SETUP = "https://github.com/siddhant4357/LDXODOO/blob/v0/landing-courtos/SETUP.md";

/** Presence only; values are never read into the page. */
function has(...keys: string[]) {
  return keys.every((k) => Boolean(process.env[k]));
}

function integrationStatuses(): IntegrationStatus[] {
  const onVercel = Boolean(process.env.VERCEL);
  return [
    {
      name: "WhatsApp agent (Twilio)",
      purpose: "Members book, check and cancel courts over WhatsApp.",
      configured: has("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"),
      detail: "Webhook: /api/webhooks/twilio",
      docs: `${SETUP}#3-whatsapp-twilio-sandbox--outbound--inbound-agent`,
    },
    {
      name: "Voice agent (Vapi)",
      purpose: "Phone callers reach the same booking tools by voice.",
      configured: has("VAPI_SERVER_SECRET"),
      detail: "Tool server: /api/vapi/tools",
      docs: `${SETUP}#4-voice-vapi--call-the-club-and-book-a-court`,
    },
    {
      name: "AI Gateway",
      purpose: "Powers Ask Playora and the WhatsApp agent's language model.",
      configured: has("AI_GATEWAY_API_KEY") || onVercel,
      detail: onVercel ? "Authenticated automatically on Vercel" : "Set AI_GATEWAY_API_KEY locally",
      docs: `${SETUP}#5-ask-ai-ownerask-and-the-whatsapp-agent--model-access`,
    },
    {
      name: "Transactional email",
      purpose: "Password resets, booking confirmations and invoices.",
      configured: has("GMAIL_USER", "GMAIL_APP_PASSWORD"),
      detail: "Nodemailer via Gmail app password",
      docs: `${SETUP}#2-email-password-reset-invoices-receipts`,
    },
  ];
}

export default async function ClubSettingsPage() {
  const user = await requireRole("OWNER");
  const [club, staff] = await Promise.all([
    getClub(user.clubId),
    prisma.user.findMany({
      where: { clubId: user.clubId, role: { not: "MEMBER" } },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!club) notFound();

  const integrations = integrationStatuses();
  const live = integrations.filter((i) => i.configured).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Management" title="Club settings" subtitle={`${club.name} · ${club.slug} · ${club.currency}`} />

      <ClubProfileForm
        initial={{
          name: club.name,
          tagline: club.tagline ?? "",
          phone: club.phone ?? "",
          email: club.email ?? "",
          address: club.address ?? "",
          timezone: club.timezone,
          opensAt: club.opensAt,
          closesAt: club.closesAt,
        }}
      />

      <BookingPolicyForm initial={policyFrom(club.settings)} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Integrations · ${live}/${integrations.length} live`}>
          <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
            {integrations.map((i) => (
              <li key={i.name} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{i.name}</span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {i.purpose}
                  </span>
                  <span className="font-mono text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {i.detail}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Pill tone={i.configured ? "success" : "warning"}>{i.configured ? "Connected" : "Not configured"}</Pill>
                  <a href={i.docs} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:underline" style={{ color: "var(--color-text-muted)" }}>
                    Setup <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title={`Staff & roles · ${staff.length}`}
          actions={
            <Button variant="outline" size="sm" render={<Link href="/owner/hr" />} nativeButton={false}>
              Manage in HR
            </Button>
          }
        >
          <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
            {staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {s.email}
                  </span>
                </div>
                <Pill tone={s.role === "OWNER" ? "accent" : "neutral"}>{ROLE_LABELS[s.role]}</Pill>
              </li>
            ))}
          </ul>
          <p className="pt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
            Every role sees only its own shell. Access rules live in one place (<code className="font-mono">lib/roles.ts</code>) and are enforced in middleware and on every server action.
          </p>
        </Panel>
      </div>
    </div>
  );
}
