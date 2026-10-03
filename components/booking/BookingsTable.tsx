"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LogIn, XCircle, Undo2 } from "lucide-react";
import type { listDeskBookings } from "@/lib/booking/queries";
import { deskCancelAction, deskCheckInAction } from "@/lib/actions/booking";
import { formatPaise } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/time";
import { tierStyle } from "@/lib/booking/ui";
import { EmptyState, Pill, statusTone } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Row = Awaited<ReturnType<typeof listDeskBookings>>["rows"][number];

const KIND_LABEL: Record<Row["kind"], string> = {
  PRIVATE: "Private",
  SOCIAL: "Social",
  COACHING: "Coaching",
  MAINTENANCE: "Maintenance",
  TRIAL: "Trial",
};

export function BookingsTable({ rows, timezone }: { rows: Row[]; timezone: string }) {
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (rows.length === 0) {
    return <EmptyState title="No bookings match" hint="Try another range or status, or book a court from Today." />;
  }

  const toggleCheckIn = (b: Row) =>
    startTransition(async () => {
      const res = await deskCheckInAction({ bookingId: b.id });
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    });

  const confirmCancel = () =>
    startTransition(async () => {
      if (!cancelTarget) return;
      const res = await deskCancelAction({ bookingId: cancelTarget.id, reason });
      if (res.success) {
        toast.success(res.message);
        setCancelTarget(null);
        setReason("");
      } else toast.error(res.error);
    });

  return (
    <>
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Court</th>
              <th className="px-4 py-3 font-semibold">Who</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">Kind</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="hidden px-4 py-3 text-right font-semibold lg:table-cell">Charged</th>
              <th className="px-4 py-3 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {rows.map((b) => {
              const name = b.member ? `${b.member.firstName} ${b.member.lastName}` : b.walkInName ?? "Walk-in";
              const live = b.status === "CONFIRMED";
              return (
                <tr key={b.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium tabular-nums">
                        {formatTime(b.startsAt, timezone)}–{formatTime(b.endsAt, timezone)}
                      </span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {formatDate(b.startsAt, timezone)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.court.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {b.member ? (
                        <Link href={`/desk/members/${b.member.id}`} className="truncate font-medium hover:underline">
                          {name}
                        </Link>
                      ) : (
                        <span className="truncate font-medium">{name}</span>
                      )}
                      <span className="hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline" style={tierStyle(b.member?.plan?.tier)}>
                        {b.member?.plan?.name ?? "Walk-in"}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell" style={{ color: "var(--color-text-muted)" }}>
                    {KIND_LABEL[b.kind]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Pill tone={statusTone(b.status)}>{b.status.replace("_", " ")}</Pill>
                      {b.checkedInAt && live && <Pill tone="success">In</Pill>}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">
                    {formatPaise(b.priceCharged)}
                    {b.creditIssued > 0 && (
                      <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {formatPaise(b.creditIssued)} credited
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {live && (
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => toggleCheckIn(b)} aria-label={b.checkedInAt ? "Undo check-in" : "Check in"}>
                          {b.checkedInAt ? <Undo2 className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                          <span className="hidden sm:inline">{b.checkedInAt ? "Undo" : "Check in"}</span>
                        </Button>
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setCancelTarget(b)} aria-label="Cancel booking">
                          <XCircle className="h-3.5 w-3.5" style={{ color: "var(--color-danger)" }} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel booking</DialogTitle>
            <DialogDescription>
              {cancelTarget && (
                <>
                  {cancelTarget.court.name} · {formatDate(cancelTarget.startsAt, timezone)} {formatTime(cancelTarget.startsAt, timezone)}. Credit is issued to the member per club policy.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, shown in the audit log)" rows={3} aria-label="Cancellation reason" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={pending}>
              Keep booking
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={pending || !reason.trim()}>
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
