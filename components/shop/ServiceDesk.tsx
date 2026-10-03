"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "cn";
import { Clock, MessageCircle, UserRound, Wrench } from "lucide-react";
import { advanceServiceJobAction, createServiceJobAction } from "@/lib/actions/shop";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, Panel, Pill } from "@/components/shared/Primitives";
import { MemberPicker, type PickedMember } from "@/components/bar/MemberPicker";
import { PaymentSplit, balanceOf, type PaymentLine } from "@/components/shop/PaymentSplit";
import { JOB_STATUS_LABEL } from "@/components/shop/labels";

type Job = { id: string; jobNo: string; customerName: string; phone: string; item: string; service: string; price: number; status: string; dueAt: string; readyAt: string | null; notes: string | null };
type Service = { id: string; name: string; price: number };

const TURNAROUND = [
  { h: 2, label: "2 hrs (express)" },
  { h: 24, label: "Next day" },
  { h: 48, label: "2 days" },
];

function tone(status: string): "neutral" | "success" | "warning" | "danger" | "accent" {
  return status === "RECEIVED" ? "accent" : status === "IN_PROGRESS" ? "warning" : "success";
}

export function ServiceDesk({ open, done, services, role }: { open: Job[]; done: Job[]; services: Service[]; role: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [member, setMember] = useState<PickedMember | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [item, setItem] = useState("");
  const [notes, setNotes] = useState("");
  const [hours, setHours] = useState(24);
  const [payments, setPayments] = useState<PaymentLine[]>([{ mode: "UPI", amount: 0 }]);

  const svc = services.find((s) => s.id === serviceId) ?? null;
  const price = svc ? Math.round(svc.price * (1 - (member?.shopDiscountPct ?? 0) / 100)) : 0;
  const key = `${serviceId}:${member?.id ?? ""}`;
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setPayments((p) => (p.length === 1 ? [{ ...p[0], amount: price }] : p));
  }
  if (payments.length === 1 && payments[0].amount === 0 && price > 0) setPayments([{ mode: "UPI", amount: price }]);
  const { balanced } = balanceOf(payments, price);

  const run = (fn: () => Promise<{ success: boolean; message?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      after?.();
      router.refresh();
    });

  const book = () =>
    run(
      () => createServiceJobAction({ productId: serviceId, memberId: member?.id ?? null, customerName: member ? undefined : customerName, phone: member ? undefined : phone, item, notes: notes || undefined, turnaroundHours: hours, payments }),
      () => {
        setMember(null);
        setCustomerName("");
        setPhone("");
        setItem("");
        setNotes("");
        setPayments([{ mode: "UPI", amount: price }]);
      }
    );

  const now = Date.now();

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        {open.length === 0 ? (
          <EmptyState title="No jobs on the bench" hint="Book a restring on the right. It is paid now and tracked until collected." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {open.map((j) => {
              const due = new Date(j.dueAt);
              const overdue = j.status !== "READY" && due.getTime() < now;
              const next = j.status === "RECEIVED" ? { to: "IN_PROGRESS" as const, label: "Start" } : j.status === "IN_PROGRESS" ? { to: "READY" as const, label: "Mark ready" } : { to: "COLLECTED" as const, label: "Collected" };
              const msg = `Hi ${j.customerName.split(" ")[0]}, your ${j.service.toLowerCase()} (${j.jobNo}) is ready to collect at the Champions Club pro shop.`;
              return (
                <li key={j.id} className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: "var(--color-surface)", border: `1px solid ${overdue ? "var(--color-danger)" : "var(--color-border)"}` }}>
                  <header className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-semibold">{j.jobNo}</span>
                      <span className="text-sm">{j.customerName}</span>
                    </div>
                    <Pill tone={tone(j.status)}>{JOB_STATUS_LABEL[j.status]}</Pill>
                  </header>
                  <p className="flex items-center gap-1.5 text-sm">
                    <Wrench className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} /> {j.service} · <span className="truncate">{j.item}</span>
                  </p>
                  {j.notes && (
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {j.notes}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-xs" style={{ color: overdue ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                    <Clock className="h-3.5 w-3.5" />
                    {j.status === "READY" ? `Ready since ${new Date(j.readyAt ?? j.dueAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : `${overdue ? "Overdue · was due" : "Due"} ${due.toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}`}
                    <span className="ml-auto font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>{formatPaise(j.price)}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={pending} onClick={() => run(() => advanceServiceJobAction({ jobId: j.id, to: next.to }))}>
                      {next.label}
                    </Button>
                    {j.status === "READY" && (
                      <Button size="sm" variant="outline" render={<a href={`https://wa.me/${j.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
                        <MessageCircle className="h-4 w-4" /> Notify
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {done.length > 0 && (
          <Panel title="Recently collected">
            <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
              {done.map((j) => (
                <li key={j.id} className="flex items-center gap-3 py-2">
                  <span className="w-36 shrink-0 font-medium tabular-nums">{j.jobNo}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {j.customerName} <span style={{ color: "var(--color-text-muted)" }}>· {j.service} · {j.item}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatPaise(j.price)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <aside className="flex flex-col gap-3 rounded-2xl p-4 lg:sticky lg:top-4 lg:self-start" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} aria-label="Book a service">
        <h2 className="font-semibold">Book a job</h2>
        {services.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Add a product flagged as a service in Inventory first.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Service">
              {services.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={serviceId === s.id} onClick={() => setServiceId(s.id)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", serviceId === s.id && "text-white")} style={serviceId === s.id ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                  {s.name} · {formatPaise(s.price)}
                </button>
              ))}
            </div>

            {member ? (
              <div className="flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: "color-mix(in oklab, var(--color-accent-500) 12%, transparent)" }}>
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" /> {member.name}
                  {member.shopDiscountPct > 0 && <span className="text-xs" style={{ color: "var(--color-success)" }}>−{member.shopDiscountPct}%</span>}
                </span>
                <button type="button" className="text-xs underline" onClick={() => setMember(null)}>
                  Remove
                </button>
              </div>
            ) : (
              <>
                <MemberPicker onPick={setMember} placeholder="Member (optional)" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" aria-label="Customer name" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" aria-label="Phone" />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item">Racket / item</Label>
              <Input id="item" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Wilson Pro Staff — 24 lbs, Luxilon ALU" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="jnotes">Notes</Label>
              <Input id="jnotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hybrid, keep old grip…" />
            </div>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Turnaround">
              {TURNAROUND.map((t) => (
                <button key={t.h} type="button" role="radio" aria-checked={hours === t.h} onClick={() => setHours(t.h)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", hours === t.h && "text-white")} style={hours === t.h ? { background: "var(--color-accent-600)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-baseline justify-between border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Due {new Date(Date.now() + hours * 3_600_000).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}
              </span>
              <span className="text-2xl font-bold tabular-nums">{formatPaise(price)}</span>
            </div>
            <PaymentSplit total={price} payments={payments} onChange={setPayments} allowComp={role !== "FRONT_DESK"} />
            <Button size="lg" onClick={book} disabled={pending || !item.trim() || !balanced || (!member && (!customerName.trim() || !phone.trim()))}>
              {pending ? "Booking…" : "Take payment & book in"}
            </Button>
          </>
        )}
      </aside>
    </div>
  );
}
