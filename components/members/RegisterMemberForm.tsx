"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { registerMemberAction, type RegisterInput } from "@/lib/actions/members";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/shared/Primitives";

type Plan = { id: string; name: string; tier: string; priceMonthly: number; priceYearly: number };
const PAY: Array<RegisterInput["paymentMode"]> = ["UPI", "CASH", "CARD", "ONLINE", "COMPLIMENTARY"];

export function RegisterMemberForm({ plans, prefill }: { plans: Plan[]; prefill?: Partial<RegisterInput> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<RegisterInput>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    emergencyContact: "",
    skillRating: 3,
    planId: "",
    billing: "MONTHLY",
    paymentMode: "UPI",
    ...prefill,
  });
  const set = <K extends keyof RegisterInput>(k: K, v: RegisterInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const plan = plans.find((p) => p.id === form.planId);
  const fee = plan ? (form.billing === "YEARLY" ? plan.priceYearly : plan.priceMonthly) : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await registerMemberAction(form);
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      router.push(`/desk/members/${res.data.memberId}`);
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <Panel title="Contact">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" required>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required autoFocus />
            </Field>
            <Field label="Last name" required>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            </Field>
            <Field label="Phone" required>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" placeholder="+91 98xxx xxxxx" required />
            </Field>
            <Field label="Email">
              <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} type="email" />
            </Field>
            <Field label="Date of birth">
              <Input value={form.dateOfBirth ?? ""} onChange={(e) => set("dateOfBirth", e.target.value)} type="date" />
            </Field>
            <Field label="Emergency contact">
              <Input value={form.emergencyContact ?? ""} onChange={(e) => set("emergencyContact", e.target.value)} placeholder="Name · phone" />
            </Field>
          </div>
        </Panel>

        <Panel title="Playing level">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Skill rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={form.skillRating === n}
                onClick={() => set("skillRating", n)}
                className={cn("rounded-xl px-4 py-2 text-sm font-medium transition-colors", form.skillRating === n && "text-white")}
                style={form.skillRating === n ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
              >
                {n} · {["Beginner", "Improver", "Intermediate", "Advanced", "Competitive"][n - 1]}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Membership">
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Plan">
            <PlanOption selected={!form.planId} onSelect={() => set("planId", "")} name="No plan yet" sub="Starts as a trial contact" />
            {plans.map((p) => (
              <PlanOption
                key={p.id}
                selected={form.planId === p.id}
                onSelect={() => set("planId", p.id)}
                name={p.name}
                sub={`${formatPaise(p.priceMonthly)}/mo · ${formatPaise(p.priceYearly)}/yr`}
              />
            ))}
          </div>
          {plan && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(["MONTHLY", "YEARLY"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set("billing", b)}
                    className={cn("rounded-xl px-3 py-2 text-sm font-medium", form.billing === b && "text-white")}
                    style={form.billing === b ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                  >
                    {b === "MONTHLY" ? "Monthly" : "Yearly"}
                  </button>
                ))}
              </div>
              <Field label="Paid by">
                <select
                  value={form.paymentMode}
                  onChange={(e) => set("paymentMode", e.target.value as RegisterInput["paymentMode"])}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {PAY.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <div className="flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: "var(--color-bg)" }}>
            <span style={{ color: "var(--color-text-muted)" }}>Due now</span>
            <span className="text-lg font-bold tabular-nums">{formatPaise(fee, { free: "₹0" })}</span>
          </div>
        </Panel>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Saving…" : plan ? `Register & collect ${formatPaise(fee)}` : "Register as trial"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">
        {label}
        {required && <span aria-hidden> *</span>}
      </Label>
      {children}
    </div>
  );
}

function PlanOption({ selected, onSelect, name, sub }: { selected: boolean; onSelect: () => void; name: string; sub: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors"
      style={{
        background: selected ? "color-mix(in oklab, var(--color-accent-500) 12%, transparent)" : "var(--color-bg)",
        border: `1px solid ${selected ? "var(--color-accent-500)" : "var(--color-border)"}`,
      }}
    >
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{name}</span>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {sub}
        </span>
      </span>
      <span className="h-4 w-4 rounded-full border-2" style={{ borderColor: selected ? "var(--color-accent-500)" : "var(--color-border)", background: selected ? "var(--color-accent-500)" : "transparent" }} aria-hidden />
    </button>
  );
}
