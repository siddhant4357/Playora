"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { bookTrialPublicAction } from "@/lib/actions/public";
import type { FreeSlotCard } from "@/lib/leads/queries";
import { formatPaise } from "@/lib/money";

const INTERESTS = ["Tennis", "Padel", "Membership", "Coaching", "Events"] as const;

interface Props {
  slots: FreeSlotCard[];
  timezone: string;
  preselect: { courtId: string; startsAt: string } | null;
}

export function TrialForm({ slots, timezone, preselect }: Props) {
  const days = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of slots) if (!seen.has(s.dateKey)) seen.set(s.dateKey, s.dayLabel);
    return Array.from(seen, ([dateKey, label]) => ({ dateKey, label }));
  }, [slots]);

  const initial = preselect ? slots.find((s) => s.courtId === preselect.courtId && s.startsAt === preselect.startsAt) ?? null : null;
  const [day, setDay] = useState<string>(initial?.dateKey ?? days[0]?.dateKey ?? "");
  const [picked, setPicked] = useState<FreeSlotCard | null>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ courtName: string; startsAt: string; message: string } | null>(null);

  const daySlots = useMemo(() => slots.filter((s) => s.dateKey === day), [slots, day]);
  const fmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: timezone });

  if (done) {
    return (
      <div className="pub-done" role="status">
        <CheckCircle2 size={28} color="#1a7f6f" />
        <h2>You&apos;re booked.</h2>
        <p className="big">
          {done.courtName} · {fmt.format(new Date(done.startsAt))}
        </p>
        <p>Give your name at the front desk. Rackets and balls are available to borrow for your first session.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/plans" className="btn btn-primary">
            See membership plans
          </Link>
          <Link href="/courts" className="btn btn-outline">
            Back to the board
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="pub-split"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!picked) {
          setError("Pick a slot first.");
          return;
        }
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await bookTrialPublicAction({
            name: String(fd.get("name") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            email: String(fd.get("email") ?? ""),
            interest: (fd.get("interest") as (typeof INTERESTS)[number]) || "Tennis",
            courtId: picked.courtId,
            startsAt: picked.startsAt,
            message: String(fd.get("message") ?? ""),
            company: String(fd.get("company") ?? ""),
          });
          if (res.success) setDone({ ...res.data, message: res.message });
          else setError(res.error);
        });
      }}
    >
      <section className="pub-card" aria-labelledby="pick-title">
        <h2 id="pick-title">1. Pick a free slot</h2>
        {days.length === 0 ? (
          <p className="pub-note">Everything is booked this week. <Link href="/contact">Message us</Link> and we will find you a time.</p>
        ) : (
          <>
            <div className="pick-days" role="tablist" aria-label="Day">
              {days.map((d) => (
                <button key={d.dateKey} type="button" className="pick-day" role="tab" aria-pressed={d.dateKey === day} aria-selected={d.dateKey === day} onClick={() => setDay(d.dateKey)}>
                  {d.label}
                </button>
              ))}
            </div>
            <div className="pick-slots" role="listbox" aria-label="Free slots">
              {daySlots.map((s) => {
                const on = picked?.courtId === s.courtId && picked?.startsAt === s.startsAt;
                return (
                  <button key={`${s.courtId}-${s.startsAt}`} type="button" className="pick-slot" role="option" aria-selected={on} aria-pressed={on} onClick={() => setPicked(s)}>
                    <b>{s.time}</b>
                    <span>{s.courtName}</span>
                    <span>
                      <s>{formatPaise(s.listPrice)}</s> Free trial
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <aside className="pub-card pub-side" aria-labelledby="you-title">
        <h2 id="you-title">2. Who&apos;s coming</h2>
        <div className="pub-form">
          <label>
            Your name
            <input name="name" required autoComplete="name" placeholder="Priya Sharma" />
          </label>
          <label>
            Phone
            <input name="phone" required type="tel" autoComplete="tel" placeholder="+91 98xxx xxxxx" />
          </label>
          <label>
            Email <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
            <input name="email" type="email" autoComplete="email" />
          </label>
          <label>
            Sport
            <select name="interest" defaultValue="Tennis">
              {INTERESTS.filter((i) => i !== "Membership" && i !== "Events").map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
          <label>
            Anything we should know? <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
            <textarea name="message" rows={2} placeholder="Complete beginner, left-handed…" />
          </label>
          <div className="hp" aria-hidden="true">
            <label>
              Company
              <input name="company" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          {picked && (
            <p className="callout ok" style={{ fontSize: 13 }}>
              <CheckCircle2 size={16} />
              <span>
                {picked.courtName}, {fmt.format(new Date(picked.startsAt))} — free, no card needed.
              </span>
            </p>
          )}
          {error && (
            <p className="pub-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-lg" disabled={pending || !picked}>
            {pending ? "Holding your court…" : "Book my free trial"}
          </button>
        </div>
      </aside>
    </form>
  );
}
