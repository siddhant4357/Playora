"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlarmClock, CalendarPlus, FileText, Mail, MessageCircle, Phone, Printer, UserCheck, XCircle } from "lucide-react";
import type { LeadStage } from "@/generated/prisma/client";
import { addLeadActivityAction, bookTrialAction, moveLeadStageAction, sendQuoteAction, setFollowUpAction } from "@/lib/actions/leads";
import type { FreeSlotCard } from "@/lib/leads/queries";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Panel, Pill, statusTone } from "@/components/shared/Primitives";
import { ACTIVITY_LABEL, SOURCE_LABEL, STAGE_LABEL, followUpState, whatsappLink } from "@/components/leads/labels";

export interface DetailLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  source: string;
  stage: LeadStage;
  message: string | null;
  nextFollowUp: string | null;
  lostReason: string | null;
  quotePlanId: string | null;
  quoteBilling: string | null;
  quoteAmount: number | null;
  quoteSentAt: string | null;
  quotePlan: { id: string; name: string; tier: string } | null;
  trial: { id: string; courtName: string; startsAt: string; status: string } | null;
  member: { id: string; memberCode: string; firstName: string; lastName: string } | null;
  activities: { id: string; type: string; content: string; byName: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  lead: DetailLead;
  plans: { id: string; name: string; tier: string; priceMonthly: number; priceYearly: number }[];
  slots: FreeSlotCard[];
  timezone: string;
  clubName: string;
}

const selectCls = "h-9 rounded-md border bg-transparent px-3 text-sm";

export function LeadDetail({ lead, plans, slots, timezone, clubName }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const open = lead.stage !== "CONVERTED" && lead.stage !== "LOST";
  const fu = followUpState(lead.nextFollowUp, lead.stage, timezone);
  const fmt = useMemo(() => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: timezone }), [timezone]);

  const waText = `Hi ${lead.name.split(" ")[0]}, this is ${clubName}. Thanks for getting in touch${lead.interest ? ` about ${lead.interest.toLowerCase()}` : ""} — when would suit you for a chat or a free trial session?`;

  function refresh(res: { success: boolean; message?: string; error?: string }) {
    if (!res.success) return void toast.error(res.error);
    toast.success(res.message);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-4">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
                <Pill tone={statusTone(lead.stage)}>{STAGE_LABEL[lead.stage]}</Pill>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {lead.interest ?? "General enquiry"} · via {SOURCE_LABEL[lead.source] ?? lead.source} · since {fmt.format(new Date(lead.createdAt))}
              </p>
              <p className="text-sm">
                <a href={`tel:${lead.phone}`} className="hover:underline">
                  {lead.phone}
                </a>
                {lead.email && (
                  <>
                    {" · "}
                    <a href={`mailto:${lead.email}`} className="hover:underline">
                      {lead.email}
                    </a>
                  </>
                )}
              </p>
            </div>
            {fu && (
              <Pill tone={fu.tone} className="gap-1 text-xs">
                <AlarmClock className="h-3 w-3" /> Follow up {fu.label.toLowerCase()}
              </Pill>
            )}
          </div>
          {lead.message && (
            <blockquote className="rounded-xl p-3 text-sm italic" style={{ background: "var(--color-bg)", borderLeft: "3px solid var(--color-accent-500)" }}>
              &ldquo;{lead.message}&rdquo;
            </blockquote>
          )}
          {lead.lostReason && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              Lost: {lead.lostReason}
            </p>
          )}
          {lead.member && (
            <p className="text-sm">
              Now member{" "}
              <Link href={`/desk/members/${lead.member.id}`} className="font-semibold hover:underline">
                {lead.member.memberCode} · {lead.member.firstName} {lead.member.lastName}
              </Link>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" render={<a href={`tel:${lead.phone}`} />} nativeButton={false}>
              <Phone className="h-4 w-4" /> Call
            </Button>
            <Button variant="outline" size="sm" render={<a href={whatsappLink(lead.phone, waText)} target="_blank" rel="noreferrer" />} nativeButton={false}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
            {lead.email && (
              <Button variant="outline" size="sm" render={<a href={`mailto:${lead.email}`} />} nativeButton={false}>
                <Mail className="h-4 w-4" /> Email
              </Button>
            )}
            {open && (
              <>
                <Button size="sm" onClick={() => setQuoteOpen(true)}>
                  <FileText className="h-4 w-4" /> {lead.quoteAmount != null ? "Re-send quote" : "Send quote"}
                </Button>
                {!lead.trial && (
                  <Button size="sm" variant="secondary" onClick={() => setTrialOpen(true)}>
                    <CalendarPlus className="h-4 w-4" /> Book trial
                  </Button>
                )}
                <Button size="sm" variant="secondary" render={<Link href={`/desk/members/new?lead=${lead.id}`} />} nativeButton={false}>
                  <UserCheck className="h-4 w-4" /> Convert to member
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setLostOpen(true)}>
                  <XCircle className="h-4 w-4" /> Mark lost
                </Button>
              </>
            )}
          </div>
        </Panel>

        <Composer leadId={lead.id} disabled={!open} />

        <Panel title="Activity">
          <ol className="flex flex-col gap-3">
            {lead.activities.length === 0 && (
              <li className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Nothing logged yet.
              </li>
            )}
            {lead.activities.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-0.5 w-16 shrink-0">
                  <Pill tone={a.type === "QUOTE" ? "warning" : a.type === "TRIAL" ? "success" : a.type === "STAGE_CHANGE" ? "accent" : "neutral"}>{ACTIVITY_LABEL[a.type] ?? a.type}</Pill>
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-pretty">{a.content}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {a.byName} · {fmt.format(new Date(a.createdAt))}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <aside className="flex flex-col gap-4">
        <Panel title="Quote">
          {lead.quoteAmount != null && lead.quotePlan ? (
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-xl font-bold tabular-nums">
                {formatPaise(lead.quoteAmount)} <span className="text-sm font-normal" style={{ color: "var(--color-text-muted)" }}>/ {lead.quoteBilling === "YEARLY" ? "year" : "month"}</span>
              </p>
              <p>{lead.quotePlan.name} plan</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Sent {lead.quoteSentAt ? fmt.format(new Date(lead.quoteSentAt)) : "—"}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" render={<a href={`/print/quote/${lead.id}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
                  <Printer className="h-4 w-4" /> Print / PDF
                </Button>
                <Button size="sm" variant="outline" render={<a href={whatsappLink(lead.phone, `Hi ${lead.name.split(" ")[0]}, here is your ${clubName} quote: ${lead.quotePlan.name} plan at ${formatPaise(lead.quoteAmount)} per ${lead.quoteBilling === "YEARLY" ? "year" : "month"}. Reply here and we'll get you started.`)} target="_blank" rel="noreferrer" />} nativeButton={false}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp it
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No quote yet. Pick a plan and it goes out by email with a printable copy.
            </p>
          )}
        </Panel>

        <Panel title="Trial">
          {lead.trial ? (
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold">{lead.trial.courtName}</p>
              <p>{fmt.format(new Date(lead.trial.startsAt))}</p>
              <Pill tone={statusTone(lead.trial.status)} className="w-fit">
                {lead.trial.status.toLowerCase()}
              </Pill>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No trial booked. A free session is the fastest way to a yes.
            </p>
          )}
        </Panel>

        <Panel title="Follow-up">
          <FollowUp leadId={lead.id} current={lead.nextFollowUp} disabled={!open} timezone={timezone} />
        </Panel>
      </aside>

      <QuoteDialog open={quoteOpen} onClose={() => setQuoteOpen(false)} leadId={lead.id} plans={plans} defaultPlanId={lead.quotePlanId} defaultBilling={(lead.quoteBilling as "MONTHLY" | "YEARLY" | null) ?? "MONTHLY"} onDone={(r) => { setQuoteOpen(false); refresh(r); }} />
      <TrialDialog open={trialOpen} onClose={() => setTrialOpen(false)} leadId={lead.id} slots={slots} timezone={timezone} onDone={(r) => { setTrialOpen(false); refresh(r); }} />

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark {lead.name} as lost</DialogTitle>
            <DialogDescription>One line on why.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
              start(async () => {
                const r = await moveLeadStageAction({ leadId: lead.id, stage: "LOST", lostReason: reason });
                setLostOpen(false);
                refresh(r);
              });
            }}
          >
            <Input name="reason" required autoFocus placeholder="Joined another club / no reply after 3 calls" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLostOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                Mark lost
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Composer({ leadId, disabled }: { leadId: string; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState<"CALL" | "WHATSAPP" | "EMAIL" | "NOTE">("CALL");
  const [content, setContent] = useState("");
  const [followUp, setFollowUp] = useState<string>("24");

  if (disabled) return null;
  return (
    <Panel title="Log a touch">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addLeadActivityAction({ leadId, type, content, followUpInHours: Number(followUp) });
            if (!r.success) return void toast.error(r.error);
            setContent("");
            toast.success("Logged.");
            router.refresh();
          });
        }}
      >
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type">
          {(["CALL", "WHATSAPP", "EMAIL", "NOTE"] as const).map((t) => (
            <Button key={t} type="button" size="sm" variant={type === t ? "default" : "outline"} role="radio" aria-checked={type === t} onClick={() => setType(t)}>
              {ACTIVITY_LABEL[t]}
            </Button>
          ))}
        </div>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} required placeholder={type === "CALL" ? "Spoke to her — wants weekend evenings, will decide by Friday" : "What happened?"} aria-label="Activity" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span style={{ color: "var(--color-text-muted)" }}>Next follow-up</span>
            <select value={followUp} onChange={(e) => setFollowUp(e.target.value)} className={selectCls} style={{ borderColor: "var(--color-border)" }}>
              <option value="4">In 4 hours</option>
              <option value="24">Tomorrow</option>
              <option value="72">In 3 days</option>
              <option value="168">Next week</option>
              <option value="0">None</option>
            </select>
          </label>
          <Button type="submit" disabled={pending || !content.trim()}>
            Log {ACTIVITY_LABEL[type].toLowerCase()}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function FollowUp({ leadId, current, disabled, timezone }: { leadId: string; current: string | null; disabled: boolean; timezone: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const fmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: timezone });
  const set = (hours: number | null) =>
    start(async () => {
      const r = await setFollowUpAction({ leadId, at: hours === null ? null : new Date(Date.now() + hours * 3_600_000).toISOString() });
      if (!r.success) return void toast.error(r.error);
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>{current ? fmt.format(new Date(current)) : "Nothing scheduled"}</p>
      {!disabled && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => set(4)}>
            +4h
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => set(24)}>
            Tomorrow
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => set(72)}>
            3 days
          </Button>
          {current && (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => set(null)}>
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function QuoteDialog({ open, onClose, leadId, plans, defaultPlanId, defaultBilling, onDone }: { open: boolean; onClose: () => void; leadId: string; plans: Props["plans"]; defaultPlanId: string | null; defaultBilling: "MONTHLY" | "YEARLY"; onDone: (r: { success: boolean; message?: string; error?: string }) => void }) {
  const [pending, start] = useTransition();
  const [planId, setPlanId] = useState(defaultPlanId ?? plans[0]?.id ?? "");
  const [billing, setBilling] = useState<"MONTHLY" | "YEARLY">(defaultBilling);
  const plan = plans.find((p) => p.id === planId);
  const amount = plan ? (billing === "YEARLY" ? plan.priceYearly : plan.priceMonthly) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a quote</DialogTitle>
          <DialogDescription>Emailed if we have an address; always printable and WhatsApp-able from the lead.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const note = String(new FormData(e.currentTarget).get("note") ?? "");
            start(async () => onDone(await sendQuoteAction({ leadId, planId, billing, note })));
          }}
        >
          <div className="grid gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                className="flex items-center justify-between rounded-xl border p-3 text-left text-sm"
                style={{ borderColor: planId === p.id ? "var(--color-accent-500)" : "var(--color-border)", background: planId === p.id ? "color-mix(in oklab, var(--color-accent-500) 8%, transparent)" : "transparent" }}
                aria-pressed={planId === p.id}
              >
                <span className="font-semibold">{p.name}</span>
                <span className="tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                  {formatPaise(billing === "YEARLY" ? p.priceYearly : p.priceMonthly)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Billing">
            {(["MONTHLY", "YEARLY"] as const).map((b) => (
              <Button key={b} type="button" size="sm" variant={billing === b ? "default" : "outline"} role="radio" aria-checked={billing === b} onClick={() => setBilling(b)}>
                {b === "MONTHLY" ? "Monthly" : "Yearly"}
              </Button>
            ))}
          </div>
          <Input name="note" placeholder="Optional note — e.g. first month 10% off if you join this week" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm">
              Total <b className="tabular-nums">{formatPaise(amount)}</b> / {billing === "YEARLY" ? "year" : "month"}
            </p>
            <Button type="submit" disabled={pending || !planId}>
              {pending ? "Sending…" : "Send quote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TrialDialog({ open, onClose, leadId, slots, timezone, onDone }: { open: boolean; onClose: () => void; leadId: string; slots: FreeSlotCard[]; timezone: string; onDone: (r: { success: boolean; message?: string; error?: string }) => void }) {
  const [pending, start] = useTransition();
  const days = useMemo(() => Array.from(new Map(slots.map((s) => [s.dateKey, s.dayLabel])), ([dateKey, label]) => ({ dateKey, label })), [slots]);
  const [day, setDay] = useState(days[0]?.dateKey ?? "");
  const [picked, setPicked] = useState<FreeSlotCard | null>(null);
  const daySlots = slots.filter((s) => s.dateKey === (day || days[0]?.dateKey));
  const fmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: timezone });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book a free trial</DialogTitle>
          <DialogDescription>Goes through the same booking engine — the slot is held the moment you confirm.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Day">
          {days.map((d) => (
            <Button key={d.dateKey} type="button" size="sm" variant={(day || days[0]?.dateKey) === d.dateKey ? "default" : "outline"} role="tab" aria-selected={day === d.dateKey} onClick={() => { setDay(d.dateKey); setPicked(null); }}>
              {d.label}
            </Button>
          ))}
        </div>
        <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4" role="listbox" aria-label="Free slots">
          {daySlots.map((s) => {
            const on = picked?.courtId === s.courtId && picked?.startsAt === s.startsAt;
            return (
              <button key={`${s.courtId}-${s.startsAt}`} type="button" role="option" aria-selected={on} onClick={() => setPicked(s)} className="flex flex-col items-start rounded-lg border p-2 text-left text-xs" style={{ borderColor: on ? "var(--color-accent-500)" : "var(--color-border)", background: on ? "color-mix(in oklab, var(--color-accent-500) 10%, transparent)" : "transparent" }}>
                <b className="text-sm">{s.time}</b>
                <span style={{ color: "var(--color-text-muted)" }}>{s.courtName}</span>
              </button>
            );
          })}
          {daySlots.length === 0 && (
            <p className="col-span-full text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nothing free that day.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {picked ? `${picked.courtName} · ${fmt.format(new Date(picked.startsAt))}` : "Pick a slot"}
          </p>
          <Button disabled={pending || !picked} onClick={() => picked && start(async () => onDone(await bookTrialAction({ leadId, courtId: picked.courtId, startsAt: picked.startsAt })))}>
            {pending ? "Booking…" : "Confirm trial"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
