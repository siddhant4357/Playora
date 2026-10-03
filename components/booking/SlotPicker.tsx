"use client";

/**
 * components/booking/SlotPicker.tsx
 *
 * Phone-first availability list for members: one row per start time, courts
 * as tappable chips. Tapping a free chip opens a confirm sheet with the price
 * explained. The server action enforces every rule; this only renders state.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Lock, MoonStar, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import type { SlotGrid } from "@/lib/booking/slots";
import { memberBookAction } from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SlotPickerProps {
  grid: SlotGrid;
  remainingToday: number;
}

interface Selection {
  courtId: string;
  courtName: string;
  startsAt: Date;
  priceCharged: number;
  listPrice: number;
  reason: string;
  bandLabel: string;
}

export function SlotPicker({ grid, remainingToday }: SlotPickerProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(
    () =>
      grid.times.map((t, i) => ({
        ...t,
        courts: grid.courts.map((c) => ({ court: c, slot: c.slots[i] })),
      })),
    [grid]
  );

  const visibleRows = rows.filter((r) => r.courts.some(({ slot }) => slot.state !== "past"));

  function confirm() {
    if (!selection) return;
    startTransition(async () => {
      const res = await memberBookAction({
        courtId: selection.courtId,
        startsAt: selection.startsAt.toISOString(),
      });
      if (res.success) {
        toast.success(res.message);
        setSelection(null);
        router.push("/me/bookings");
      } else {
        toast.error(res.error);
        setSelection(null);
        router.refresh();
      }
    });
  }

  if (grid.courts.length === 0) {
    return (
      <p className="rounded-xl p-6 text-center text-sm" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
        No courts of this type.
      </p>
    );
  }

  if (visibleRows.length === 0) {
    return (
      <p className="rounded-xl p-6 text-center text-sm" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
        The club has closed for today. Pick another day.
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
        <span className="flex items-center gap-3">
          <Legend swatch="free" label="Free" />
          <Legend swatch="mine" label="Yours" />
          <Legend swatch="booked" label="Taken" />
        </span>
        <span>{grid.courts.length} courts</span>
      </div>

      <ol className="flex flex-col divide-y rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderColor: "var(--color-border)" }}>
        {visibleRows.map((row) => {
          const anyFree = row.courts.some(({ slot }) => slot.state === "free");
          const sample = row.courts[0].slot.price;
          const isEvening = row.minuteOfDay >= 17 * 60;
          return (
            <li key={row.minuteOfDay} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex w-16 shrink-0 flex-col">
                <span className="text-sm font-semibold tabular-nums">{row.label}</span>
                <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  {isEvening ? <MoonStar className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  {sample.bandLabel}
                </span>
              </div>

              <div className="flex flex-1 flex-wrap gap-1.5">
                {row.courts.map(({ court, slot }) => {
                  const disabled = slot.state !== "free" || (remainingToday <= 0 && slot.state === "free");
                  return (
                    <button
                      key={court.id}
                      type="button"
                      disabled={disabled}
                      aria-label={`${court.name} at ${row.label}, ${describe(slot.state)}`}
                      onClick={() =>
                        setSelection({
                          courtId: court.id,
                          courtName: court.name,
                          startsAt: slot.startsAt,
                          priceCharged: slot.price.priceCharged,
                          listPrice: slot.price.listPrice,
                          reason: slot.price.reason,
                          bandLabel: slot.price.bandLabel,
                        })
                      }
                      className={cn(
                        "flex h-8 min-w-[3.25rem] items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium transition-all",
                        slot.state === "free" && !disabled && "hover:-translate-y-px hover:shadow-sm active:translate-y-0",
                        slot.state === "past" && "opacity-30"
                      )}
                      style={chipStyle(slot.state, disabled)}
                    >
                      {slot.state === "mine" && <Check className="h-3 w-3" />}
                      {slot.state === "booked" && <Lock className="h-3 w-3" />}
                      {court.name.replace("Court ", "C")}
                    </button>
                  );
                })}
              </div>

              <div className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums" style={{ color: anyFree ? "var(--color-text)" : "var(--color-text-subtle)" }}>
                {formatPaise(sample.priceCharged, { free: "Free" })}
              </div>
            </li>
          );
        })}
      </ol>

      <Dialog open={!!selection} onOpenChange={(o) => !o && !pending && setSelection(null)}>
        <DialogContent className="max-w-sm">
          {selection && (
            <>
              <DialogHeader>
                <DialogTitle>{selection.courtName}</DialogTitle>
                <DialogDescription>{formatDateTime(selection.startsAt, grid.timezone)} · 60 min</DialogDescription>
              </DialogHeader>

              <div className="flex items-end justify-between rounded-xl p-4" style={{ background: "var(--color-primary-50)" }}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-primary-700)" }}>
                    You pay
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{selection.reason}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--color-primary-700)" }}>
                    {formatPaise(selection.priceCharged, { free: "Free" })}
                  </span>
                  {selection.priceCharged !== selection.listPrice && (
                    <span className="text-xs line-through" style={{ color: "var(--color-text-subtle)" }}>
                      {formatPaise(selection.listPrice)}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Cancel 2 hours or more before start for a full credit; later cancellations credit 50%.
              </p>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelection(null)} disabled={pending}>
                  Back
                </Button>
                <Button onClick={confirm} disabled={pending}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm booking
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function describe(state: string) {
  return state === "free" ? "available" : state === "mine" ? "your booking" : state === "past" ? "already started" : "taken";
}

function chipStyle(state: string, disabled: boolean): React.CSSProperties {
  switch (state) {
    case "mine":
      return { background: "var(--color-primary-500)", color: "#fff", border: "1px solid var(--color-primary-500)" };
    case "booked":
    case "social":
      return {
        background: "repeating-linear-gradient(135deg, var(--color-bg) 0 4px, var(--color-surface) 4px 8px)",
        color: "var(--color-text-subtle)",
        border: "1px solid var(--color-border)",
      };
    case "past":
      return { background: "transparent", color: "var(--color-text-subtle)", border: "1px dashed var(--color-border)" };
    default:
      return disabled
        ? { background: "var(--color-surface)", color: "var(--color-text-subtle)", border: "1px solid var(--color-border)" }
        : { background: "var(--color-surface)", color: "var(--color-primary-700)", border: "1px solid var(--color-primary-300)" };
  }
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded" style={chipStyle(swatch, false)} />
      {label}
    </span>
  );
}
