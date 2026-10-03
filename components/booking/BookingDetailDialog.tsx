"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogIn, Undo2 } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { deskCancelAction, deskCheckInAction } from "@/lib/actions/booking";
import type { Slot } from "@/lib/booking/slots";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface BookingDetailTarget {
  courtName: string;
  slot: Slot;
}

interface Props {
  target: BookingDetailTarget | null;
  timezone: string;
  onClose: () => void;
}

export function BookingDetailDialog({ target, timezone, onClose }: Props) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (!target?.slot.booking) return null;
  const { slot } = target;
  const booking = slot.booking!;
  const isPast = slot.endsAt.getTime() < Date.now();

  function toggleCheckIn() {
    startTransition(async () => {
      const res = await deskCheckInAction({ bookingId: booking.id });
      res.success ? toast.success(res.message) : toast.error(res.error);
      onClose();
      router.refresh();
    });
  }

  function doCancel() {
    startTransition(async () => {
      const res = await deskCancelAction({ bookingId: booking.id, reason });
      res.success ? toast.success(res.message) : toast.error(res.error);
      if (res.success) {
        setCancelling(false);
        setReason("");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !pending) {
          setCancelling(false);
          setReason("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{booking.label || "Booking"}</DialogTitle>
          <DialogDescription>
            {target.courtName} · {formatDateTime(slot.startsAt, timezone)}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl p-3 text-sm" style={{ background: "var(--color-bg)" }}>
          <dt style={{ color: "var(--color-text-muted)" }}>Type</dt>
          <dd className="font-medium capitalize">{booking.kind.toLowerCase()}</dd>
          <dt style={{ color: "var(--color-text-muted)" }}>Paid</dt>
          <dd className="font-medium tabular-nums">{formatPaise(booking.priceCharged, { free: "Included" })}</dd>
          <dt style={{ color: "var(--color-text-muted)" }}>Status</dt>
          <dd className="font-medium" style={{ color: booking.checkedIn ? "var(--color-success)" : "var(--color-text)" }}>
            {booking.checkedIn ? "Checked in" : isPast ? "Finished" : "Confirmed"}
          </dd>
        </dl>

        {cancelling ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cancel-reason">Reason (required, goes to the audit log)</Label>
            <Textarea
              id="cancel-reason"
              autoFocus
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Member called to cancel / rain / double entry…"
            />
          </div>
        ) : null}

        <DialogFooter className="sm:justify-between">
          {cancelling ? (
            <>
              <Button variant="outline" onClick={() => setCancelling(false)} disabled={pending}>
                Back
              </Button>
              <Button variant="destructive" onClick={doCancel} disabled={pending || reason.trim().length < 3}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm cancel
              </Button>
            </>
          ) : (
            <>
              {!isPast && (
                <Button variant="ghost" className="text-[var(--color-danger)]" onClick={() => setCancelling(true)} disabled={pending}>
                  Cancel booking
                </Button>
              )}
              <Button onClick={toggleCheckIn} disabled={pending} variant={booking.checkedIn ? "outline" : "default"}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : booking.checkedIn ? <Undo2 className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {booking.checkedIn ? "Undo check-in" : "Check in"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
