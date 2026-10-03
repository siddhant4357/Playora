"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { formatDayLabel, formatTime, toDateKey } from "@/lib/time";
import { memberCancelAction } from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface BookingCardData {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  kind: string;
  priceCharged: number;
  priceReason: string | null;
  creditIssued: number;
  checkedInAt: Date | null;
  court: { name: string; type: string; isIndoor: boolean };
}

interface BookingCardProps {
  booking: BookingCardData;
  timezone: string;
  cancellable?: boolean;
  fullCreditHours: number;
  lateCreditPct: number;
}

export function BookingCard({ booking, timezone, cancellable, fullCreditHours, lateCreditPct }: BookingCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const hoursAhead = (booking.startsAt.getTime() - Date.now()) / 3_600_000;
  const creditPct = hoursAhead >= fullCreditHours ? 100 : lateCreditPct;
  const credit = Math.round((booking.priceCharged * creditPct) / 100);

  function doCancel() {
    startTransition(async () => {
      const res = await memberCancelAction({ bookingId: booking.id });
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  const [dayName, dayNum, monthName] = formatDayLabel(toDateKey(booking.startsAt, timezone), timezone)
    .replace(/,/g, "")
    .split(" ");

  const statusTone =
    booking.status === "CANCELLED"
      ? { bg: "rgba(136,136,136,0.12)", fg: "var(--color-text-muted)", label: "Cancelled" }
      : booking.status === "NO_SHOW"
        ? { bg: "rgba(231,76,60,0.12)", fg: "var(--color-danger)", label: "No-show" }
        : booking.checkedInAt
          ? { bg: "rgba(39,174,96,0.12)", fg: "var(--color-success)", label: "Checked in" }
          : booking.status === "COMPLETED" || booking.endsAt.getTime() < Date.now()
            ? { bg: "rgba(136,136,136,0.12)", fg: "var(--color-text-muted)", label: "Played" }
            : { bg: "var(--color-primary-50)", fg: "var(--color-primary-700)", label: "Confirmed" };

  return (
    <article
      className="flex items-stretch gap-3 rounded-2xl p-3"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", opacity: booking.status === "CANCELLED" ? 0.7 : 1 }}
    >
      <div
        className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center"
        style={{ background: "var(--color-primary-500)", color: "#fff" }}
      >
        <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">{dayName}</span>
        <span className="text-xl font-bold leading-tight">{dayNum}</span>
        <span className="text-[11px] opacity-80">{monthName}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-semibold">{booking.court.name}</span>
            <span className="text-sm tabular-nums" style={{ color: "var(--color-text-muted)" }}>
              {formatTime(booking.startsAt, timezone)} – {formatTime(booking.endsAt, timezone)}
            </span>
          </div>
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: statusTone.bg, color: statusTone.fg }}>
            {statusTone.label}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
            {booking.status === "CANCELLED" && booking.creditIssued > 0
              ? `${formatPaise(booking.creditIssued)} credited`
              : booking.priceReason}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">{formatPaise(booking.priceCharged, { free: "Free" })}</span>
            {cancellable && booking.status === "CONFIRMED" && hoursAhead > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              {booking.court.name}, {formatDayLabel(toDateKey(booking.startsAt, timezone), timezone)} at {formatTime(booking.startsAt, timezone)}.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-xl p-3 text-sm" style={{ background: "var(--color-bg)" }}>
            {booking.priceCharged === 0
              ? "This session was included in your plan, so nothing to refund. The slot goes back to the club."
              : `You are ${hoursAhead >= fullCreditHours ? "outside" : "inside"} the ${fullCreditHours}-hour window, so ${creditPct}% (${formatPaise(credit)}) returns to your credit balance.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={doCancel} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
