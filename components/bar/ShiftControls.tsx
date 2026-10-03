"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { closeShiftAction, openShiftAction } from "@/lib/actions/bar";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/shared/Primitives";

export function ShiftControls({ shift, expectedCash }: { shift: { id: string; openingCash: number } | null; expectedCash: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cash, setCash] = useState("");
  const [notes, setNotes] = useState("");
  const counted = Math.round(Number(cash || 0) * 100);
  const diff = counted - expectedCash;

  if (!shift) {
    return (
      <Panel title="Open shift">
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await openShiftAction({ openingCash: counted }); r.success ? (toast.success(r.message), router.refresh()) : toast.error(r.error); }); }}>
          <div className="flex flex-col gap-1.5"><Label className="text-xs">Opening float (₹)</Label><Input type="number" min={0} step="1" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="2000" required autoFocus /></div>
          <Button type="submit" disabled={pending}>{pending ? "Opening…" : "Open shift"}</Button>
        </form>
      </Panel>
    );
  }

  return (
    <Panel title="Close shift">
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await closeShiftAction({ shiftId: shift.id, closingCash: counted, notes }); r.success ? (toast.success(r.message), router.refresh()) : toast.error(r.error); }); }}>
        <div className="flex flex-col gap-1.5"><Label className="text-xs">Cash counted in drawer (₹)</Label><Input type="number" min={0} step="1" value={cash} onChange={(e) => setCash(e.target.value)} required /></div>
        {cash && (
          <p className="text-sm tabular-nums" style={{ color: diff === 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            Expected {formatPaise(expectedCash)} · {diff === 0 ? "balanced" : `${diff > 0 ? "over" : "short"} by ${formatPaise(Math.abs(diff))}`}
          </p>
        )}
        <div className="flex flex-col gap-1.5"><Label className="text-xs">Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Comped table 3 for a spilled drink…" /></div>
        <Button type="submit" variant="destructive" disabled={pending || !cash}>{pending ? "Closing…" : "Close shift & file Z-report"}</Button>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>All tabs must be settled or voided first.</p>
      </form>
    </Panel>
  );
}
