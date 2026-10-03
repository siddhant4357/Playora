"use client";

/**
 * components/booking/QuickBookDialog.tsx
 *
 * Front-desk booking in under 10 seconds: pick who (member search or walk-in
 * name), see the price change live with their plan, choose how they paid,
 * confirm. The server re-quotes, so the number shown here is a preview only.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search, UserRound, UserRoundPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { deskBookAction, searchMembersAction } from "@/lib/actions/booking";
import type { PriceQuote } from "@/lib/booking/price";
import { tierStyle } from "@/lib/booking/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MemberHit = Awaited<ReturnType<typeof searchMembersAction>>[number];

export interface QuickBookTarget {
  courtId: string;
  courtName: string;
  startsAt: Date;
  price: PriceQuote; // walk-in quote from the grid
}

interface QuickBookDialogProps {
  target: QuickBookTarget | null;
  timezone: string;
  onClose: () => void;
}

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "CREDIT", label: "Member credit" },
] as const;

export function QuickBookDialog({ target, timezone, onClose }: QuickBookDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"member" | "walkin">("member");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<MemberHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState<MemberHit | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [payment, setPayment] = useState<(typeof PAYMENT_MODES)[number]["value"]>("CASH");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!target) {
      setMode("member");
      setQuery("");
      setHits([]);
      setMember(null);
      setWalkInName("");
      setWalkInPhone("");
      setPayment("CASH");
    }
  }, [target]);

  useEffect(() => {
    if (mode !== "member" || member || query.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const rows = await searchMembersAction(query);
        if (!cancelled) setHits(rows);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, mode, member]);

  if (!target) return null;

  const discount = mode === "member" ? member?.plan?.courtDiscountPct ?? 0 : 0;
  const preview = Math.round((target.price.listPrice * (100 - discount)) / 100);
  const canUseCredit = !!member && member.creditBalance >= preview && preview > 0;
  const canSubmit = mode === "member" ? !!member : walkInName.trim().length > 0;

  function submit() {
    if (!target) return;
    startTransition(async () => {
      const res = await deskBookAction({
        courtId: target.courtId,
        startsAt: target.startsAt.toISOString(),
        memberId: mode === "member" ? member?.id : null,
        walkInName: mode === "walkin" ? walkInName : null,
        walkInPhone: mode === "walkin" ? walkInPhone || null : null,
        paymentMode: preview === 0 ? "COMPLIMENTARY" : payment,
        source: "FRONT_DESK",
      });
      if (res.success) {
        toast.success(res.message);
        onClose();
        router.refresh();
      } else {
        toast.error(res.error);
        if (/took that slot/i.test(res.error)) {
          onClose();
          router.refresh();
        }
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target.courtName} · {formatDateTime(target.startsAt, timezone)}
          </DialogTitle>
          <DialogDescription>
            60 min · {target.price.bandLabel} · walk-in {formatPaise(target.price.listPrice)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--color-bg)" }} role="tablist">
          {(
            [
              { v: "member", label: "Member", icon: UserRound },
              { v: "walkin", label: "Walk-in", icon: UserRoundPlus },
            ] as const
          ).map((t) => (
            <button
              key={t.v}
              type="button"
              role="tab"
              aria-selected={mode === t.v}
              onClick={() => setMode(t.v)}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors")}
              style={{
                background: mode === t.v ? "var(--color-surface)" : "transparent",
                color: mode === t.v ? "var(--color-text)" : "var(--color-text-muted)",
                boxShadow: mode === t.v ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {mode === "member" ? (
          member ? (
            <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-primary-200)" }}>
              <div className="flex flex-col">
                <span className="font-semibold">
                  {member.firstName} {member.lastName}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {member.memberCode} · {member.plan?.name ?? "No plan"} · {member.status.toLowerCase()}
                  {member.creditBalance > 0 && ` · ${formatPaise(member.creditBalance)} credit`}
                </span>
              </div>
              <Button variant="ghost" size="icon" aria-label="Change member" onClick={() => setMember(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="member-search">Find member</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-text-subtle)" }} />
                <Input
                  id="member-search"
                  autoFocus
                  placeholder="Name, phone or CC-0001"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              {(hits.length > 0 || searching) && (
                <ul className="max-h-48 overflow-y-auto rounded-lg" style={{ border: "1px solid var(--color-border)" }} role="listbox">
                  {searching && hits.length === 0 && (
                    <li className="px-3 py-2 text-xs" style={{ color: "var(--color-text-muted)" }}>Searching…</li>
                  )}
                  {hits.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => setMember(h)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-bg)]"
                      >
                        <span>
                          {h.firstName} {h.lastName}
                          <span className="ml-2 text-xs" style={{ color: "var(--color-text-muted)" }}>{h.phone}</span>
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={tierStyle(h.plan?.tier)}>
                          {h.plan?.name ?? h.status.toLowerCase()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!searching && query.trim().length >= 2 && hits.length === 0 && (
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  No member found. Book as a walk-in instead.
                </p>
              )}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="walkin-name">Name</Label>
              <Input id="walkin-name" autoFocus value={walkInName} onChange={(e) => setWalkInName(e.target.value)} placeholder="Who's playing" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="walkin-phone">Phone (optional)</Label>
              <Input id="walkin-phone" inputMode="tel" value={walkInPhone} onChange={(e) => setWalkInPhone(e.target.value)} placeholder="+91" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "var(--color-bg)" }}>
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              To collect
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {discount === 100 ? "Included in plan" : discount > 0 ? `${discount}% plan discount` : target.price.bandLabel}
            </span>
          </div>
          <span className="text-2xl font-bold tabular-nums">{formatPaise(preview, { free: "Free" })}</span>
        </div>

        {preview > 0 && (
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="sr-only">Payment mode</legend>
            {PAYMENT_MODES.filter((p) => p.value !== "CREDIT" || canUseCredit).map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={payment === p.value}
                onClick={() => setPayment(p.value)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  background: payment === p.value ? "var(--color-text)" : "var(--color-surface)",
                  color: payment === p.value ? "var(--color-bg)" : "var(--color-text-muted)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {p.label}
              </button>
            ))}
          </fieldset>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Book {preview > 0 && `· ${formatPaise(preview)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
