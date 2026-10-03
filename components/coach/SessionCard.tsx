"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, NotebookPen, Phone, UserX } from "lucide-react";
import type { CoachSession } from "@/lib/coach/queries";
import { coachAttendanceAction } from "@/lib/actions/coach";
import { addMemberNoteAction } from "@/lib/actions/members";
import { formatTime } from "@/lib/time";
import { tierStyle } from "@/lib/booking/ui";
import { Pill } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function SessionCard({ session, timezone, showCoach, canLinkMember }: { session: CoachSession; timezone: string; showCoach: boolean; canLinkMember: boolean }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const now = Date.now();
  const started = session.startsAt.getTime() <= now;
  const live = started && session.endsAt.getTime() > now;
  const attended = session.checkedInAt !== null;
  const name = session.member ? `${session.member.firstName} ${session.member.lastName}` : "Unassigned";

  const mark = (present: boolean) =>
    start(async () => {
      const res = await coachAttendanceAction({ bookingId: session.id, present });
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    });

  const saveNote = () =>
    start(async () => {
      if (!session.member) return;
      const res = await addMemberNoteAction({ memberId: session.member.id, content: note });
      if (res.success) {
        toast.success("Note saved to the player's record.");
        setNote("");
        setNoteOpen(false);
      } else toast.error(res.error);
    });

  return (
    <li
      className="flex flex-col gap-3 rounded-xl p-3"
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${live ? "var(--color-primary-500, var(--color-primary-900))" : "var(--color-border)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tabular-nums">
            {formatTime(session.startsAt, timezone)}–{formatTime(session.endsAt, timezone)}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {session.court.name}
            {showCoach && session.coach ? ` · ${session.coach.name}` : ""}
          </span>
        </div>
        {live ? <Pill tone="accent">On court</Pill> : started ? <Pill tone={attended ? "success" : "danger"}>{attended ? "Attended" : "Absent"}</Pill> : <Pill>Upcoming</Pill>}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {session.member && canLinkMember ? (
          <Link href={`/desk/members/${session.member.id}`} className="truncate text-sm font-medium hover:underline">
            {name}
          </Link>
        ) : (
          <span className="truncate text-sm font-medium">{name}</span>
        )}
        {session.member && (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={tierStyle(session.member.plan?.tier)}>
            {session.member.plan?.name ?? "No plan"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {started && (
          <>
            <Button size="sm" variant={attended ? "default" : "outline"} disabled={pending} onClick={() => mark(true)} aria-pressed={attended}>
              <Check className="h-3.5 w-3.5" />
              Present
            </Button>
            <Button size="sm" variant={!attended ? "destructive" : "ghost"} disabled={pending} onClick={() => mark(false)} aria-pressed={!attended}>
              <UserX className="h-3.5 w-3.5" />
              Absent
            </Button>
          </>
        )}
        {session.member && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setNoteOpen(true)}>
            <NotebookPen className="h-3.5 w-3.5" />
            Note
          </Button>
        )}
        {session.member?.phone && (
          <Button size="sm" variant="ghost" render={<a href={`tel:${session.member.phone}`} />} nativeButton={false} aria-label={`Call ${name}`}>
            <Phone className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session note for {name}</DialogTitle>
            <DialogDescription>Saved to the player&apos;s member record so the desk and future coaches see it too.</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="What did you work on? What's the homework?" aria-label="Session note" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={saveNote} disabled={pending || !note.trim()}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
