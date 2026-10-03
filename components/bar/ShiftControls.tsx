"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [cash, setCash] = useState(shift ? String(expectedCash / 100) : "2000");
  const [notes, setNotes] = useState("");
  const counted = Math.round((parseFloat(cash) || 0) * 100);
  const diff = counted - expectedCash;

  if (!shift) {
    return (
      <Panel title="Open shift">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Opening float (₹)</Label>
          <Input type="number" min="0" step="1" value={cash} onChange={(e) => setCash(e.target.value)} />
        </div>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await openShiftAction({ openingCash: Math.round((parseFloat(cash) || 0) * 100) });
              if (!res.success) return void toast.error(res.error);
              toast.success(res.message);
              router.refresh();
            })
          }
        >
          Open shift
        </Button>
      </Panel>
    );
  }

  return (
    <Panel title="Close shift">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Cash counted in drawer (₹)</Label>
        <Input type="number" min="0" step="1" value={cash} onChange={(e) => setCash(e.target.value)} />
        <p className="text-xs tabular-nums" style={{ color: diff === 0 ? "var(--color-success)" : "var(--color-warning)" }}>
          Expected {formatPaise(expectedCash)} · {diff === 0 ? "balances" : diff > 0 ? `over by ${formatPaise(diff)}` : `short by ${formatPaise(-diff)}`}
        </p>
      </div>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for the manager (optional)" rows={2} />
      <Button
        variant={diff === 0 ? "default" : "outline"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await closeShiftAction({ shiftId: shift.id, closingCash: counted, notes });
            if (!res.success) return void toast.error(res.error);
            toast.success(res.message);
            router.refresh();
          })
        }
      >
        Close shift & file Z-report
      </Button>
    </Panel>
  );
}
