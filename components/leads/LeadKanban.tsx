"use client";

import { useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlarmClock, CalendarCheck, FileText, Phone } from "lucide-react";
import type { LeadStage } from "@/generated/prisma/client";
import { moveLeadStageAction } from "@/lib/actions/leads";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pill, statusTone } from "@/components/shared/Primitives";
import { STAGE_LABEL, SOURCE_LABEL, followUpState } from "@/components/leads/labels";

export interface KanbanLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  source: string;
  stage: LeadStage;
  nextFollowUp: string | null;
  quoteAmount: number | null;
  quoteBilling: string | null;
  createdAt: string;
  updatedAt: string;
  memberId: string | null;
  trialBookingId: string | null;
}

interface Props {
  columns: { stage: LeadStage; leads: KanbanLead[] }[];
  timezone: string;
}

const DROPPABLE: LeadStage[] = ["NEW", "CONTACTED", "QUOTE_SENT", "TRIAL_BOOKED", "LOST"];

export function LeadKanban({ columns, timezone }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [over, setOver] = useState<LeadStage | null>(null);
  const [losing, setLosing] = useState<KanbanLead | null>(null);
  const [reason, setReason] = useState("");

  function move(leadId: string, stage: LeadStage, lostReason?: string) {
    start(async () => {
      const res = await moveLeadStageAction({ leadId, stage: stage as Exclude<LeadStage, "CONVERTED">, lostReason });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      setLosing(null);
      setReason("");
      router.refresh();
    });
  }

  function onDrop(e: DragEvent, stage: LeadStage) {
    e.preventDefault();
    setOver(null);
    const leadId = e.dataTransfer.getData("text/lead-id");
    const from = e.dataTransfer.getData("text/lead-stage") as LeadStage;
    if (!leadId || from === stage) return;
    if (stage === "LOST") {
      const lead = columns.flatMap((c) => c.leads).find((l) => l.id === leadId) ?? null;
      setLosing(lead);
      return;
    }
    move(leadId, stage);
  }

  return (
    <>
      <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))` }} aria-busy={pending}>
        {columns.map((col) => {
          const droppable = DROPPABLE.includes(col.stage);
          return (
            <section
              key={col.stage}
              aria-label={`${STAGE_LABEL[col.stage]} (${col.leads.length})`}
              className="flex min-h-[320px] flex-col gap-2 rounded-2xl p-2 transition-colors"
              style={{
                background: over === col.stage ? "color-mix(in oklab, var(--color-accent-500) 10%, var(--color-bg))" : "var(--color-bg)",
                border: `1px ${over === col.stage ? "solid" : "dashed"} ${over === col.stage ? "var(--color-accent-500)" : "var(--color-border)"}`,
              }}
              onDragOver={(e) => {
                if (!droppable) return;
                e.preventDefault();
                if (over !== col.stage) setOver(col.stage);
              }}
              onDragLeave={() => over === col.stage && setOver(null)}
              onDrop={(e) => droppable && onDrop(e, col.stage)}
            >
              <header className="flex items-center justify-between px-2 pt-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  {STAGE_LABEL[col.stage]}
                </h2>
                <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                  {col.leads.length}
                </span>
              </header>
              {col.leads.length === 0 && (
                <p className="px-2 py-6 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {droppable ? "Drop a card here" : "—"}
                </p>
              )}
              {col.leads.map((l) => (
                <LeadCard key={l.id} lead={l} timezone={timezone} />
              ))}
            </section>
          );
        })}
      </div>

      <Dialog open={Boolean(losing)} onOpenChange={(o) => !o && setLosing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark {losing?.name} as lost</DialogTitle>
            <DialogDescription>One line on why — it shows up in the owner&apos;s report.</DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Joined another club / too expensive / no reply" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLosing(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending || !reason.trim()} onClick={() => losing && move(losing.id, "LOST", reason)}>
              Mark lost
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LeadCard({ lead, timezone }: { lead: KanbanLead; timezone: string }) {
  const fu = followUpState(lead.nextFollowUp, lead.stage, timezone);
  const closed = lead.stage === "CONVERTED" || lead.stage === "LOST";
  return (
    <article
      draggable={!closed}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/lead-id", lead.id);
        e.dataTransfer.setData("text/lead-stage", lead.stage);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="flex flex-col gap-2 rounded-xl p-3 text-sm shadow-sm"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", cursor: closed ? "default" : "grab", opacity: closed ? 0.8 : 1 }}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/desk/leads/${lead.id}`} className="font-semibold leading-tight hover:underline">
          {lead.name}
        </Link>
        <Pill tone="neutral">{SOURCE_LABEL[lead.source] ?? lead.source}</Pill>
      </div>
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {lead.interest ?? "General"} · {lead.phone}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {lead.quoteAmount != null && (
          <Pill tone="warning" className="gap-1">
            <FileText className="h-3 w-3" /> {formatPaise(lead.quoteAmount)}/{lead.quoteBilling === "YEARLY" ? "yr" : "mo"}
          </Pill>
        )}
        {lead.trialBookingId && (
          <Pill tone="success" className="gap-1">
            <CalendarCheck className="h-3 w-3" /> Trial
          </Pill>
        )}
        {fu && (
          <Pill tone={fu.tone} className="gap-1">
            <AlarmClock className="h-3 w-3" /> {fu.label}
          </Pill>
        )}
        {lead.memberId && <Pill tone={statusTone("CONVERTED")}>Member</Pill>}
      </div>
      {!closed && (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" render={<a href={`tel:${lead.phone}`} />} nativeButton={false}>
            <Phone className="h-3 w-3" /> Call
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" render={<Link href={`/desk/leads/${lead.id}`} />} nativeButton={false}>
            Open
          </Button>
        </div>
      )}
    </article>
  );
}
