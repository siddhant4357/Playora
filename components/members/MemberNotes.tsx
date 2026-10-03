"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addMemberNoteAction } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MemberNotes({ memberId, notes }: { memberId: string; notes: { id: string; content: string; at: string }[] }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await addMemberNoteAction({ memberId, content: value });
      if (!res.success) return void toast.error(res.error);
      setValue("");
    });
  };
  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Prefers evening slots, left shoulder injury…" rows={2} aria-label="New note" />
        <Button type="submit" size="sm" variant="outline" disabled={pending || !value.trim()} className="self-end">
          Add note
        </Button>
      </form>
      {notes.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl px-3 py-2" style={{ background: "var(--color-bg)" }}>
              <p className="text-pretty">{n.content}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {n.at}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
