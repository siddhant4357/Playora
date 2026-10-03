"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { BookingPolicy } from "@/lib/booking/policy";
import { resetBookingPolicyAction, updateBookingPolicyAction, updateClubProfileAction, type ProfileInput } from "@/lib/actions/settings";
import { Panel } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function ClubProfileForm({ initial }: { initial: ProfileInput }) {
  const [form, setForm] = useState<ProfileInput>(initial);
  const [pending, start] = useTransition();
  const set = (k: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updateClubProfileAction(form);
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    });
  };

  return (
    <Panel title="Club profile & hours">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="name" label="Club name">
            <Input id="name" value={form.name} onChange={set("name")} required />
          </Field>
          <Field id="tagline" label="Tagline" hint="Shown on the public site and member app.">
            <Input id="tagline" value={form.tagline ?? ""} onChange={set("tagline")} />
          </Field>
          <Field id="phone" label="Front desk phone">
            <Input id="phone" value={form.phone ?? ""} onChange={set("phone")} inputMode="tel" />
          </Field>
          <Field id="email" label="Club email">
            <Input id="email" type="email" value={form.email ?? ""} onChange={set("email")} />
          </Field>
        </div>
        <Field id="address" label="Address">
          <Textarea id="address" rows={2} value={form.address ?? ""} onChange={set("address")} />
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="timezone" label="Timezone" hint="IANA name. Drives every slot grid and report.">
            <Input id="timezone" value={form.timezone} onChange={set("timezone")} required />
          </Field>
          <Field id="opensAt" label="Opens at">
            <Input id="opensAt" type="time" value={form.opensAt} onChange={set("opensAt")} required />
          </Field>
          <Field id="closesAt" label="Closes at">
            <Input id="closesAt" type="time" value={form.closesAt} onChange={set("closesAt")} required />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            Save profile
          </Button>
        </div>
      </form>
    </Panel>
  );
}

const POLICY_FIELDS: { key: keyof BookingPolicy; label: string; hint: string; unit: string }[] = [
  { key: "sessionMinutes", label: "Session length", hint: "Every court booking is this long.", unit: "min" },
  { key: "slotStepMinutes", label: "Slot step", hint: "A new slot starts every N minutes.", unit: "min" },
  { key: "defaultAdvanceDays", label: "Advance booking", hint: "How far ahead walk-ins and no-plan members may book. Plans override this.", unit: "days" },
  { key: "defaultMaxPerDay", label: "Sessions per day", hint: "Per member without a plan.", unit: "/day" },
  { key: "cancelFullCreditHours", label: "Full-credit window", hint: "Cancel at least this long before start for 100% credit.", unit: "hrs" },
  { key: "cancelLateCreditPct", label: "Late-cancel credit", hint: "Credit returned when cancelling inside the window.", unit: "%" },
  { key: "waitlistOfferMinutes", label: "Waitlist offer", hint: "How long a freed slot is held for the next person.", unit: "min" },
];

export function BookingPolicyForm({ initial }: { initial: BookingPolicy }) {
  const [form, setForm] = useState<BookingPolicy>(initial);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updateBookingPolicyAction(form);
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    });
  };

  const reset = () =>
    start(async () => {
      const res = await resetBookingPolicyAction();
      if (res.success) {
        toast.success("Policy reset to club defaults.");
        window.location.reload();
      } else toast.error(res.error);
    });

  return (
    <Panel
      title="Booking policy"
      actions={
        <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={pending}>
          Reset to defaults
        </Button>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POLICY_FIELDS.map((f) => (
            <Field key={f.key} id={f.key} label={f.label} hint={f.hint}>
              <div className="relative">
                <Input
                  id={f.key}
                  type="number"
                  inputMode="numeric"
                  value={form[f.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: Number(e.target.value) }))}
                  className="pr-12 tabular-nums"
                  required
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {f.unit}
                </span>
              </div>
            </Field>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Changes apply to new bookings immediately. Existing bookings keep the policy they were made under.
          </p>
          <Button type="submit" disabled={pending}>
            Save policy
          </Button>
        </div>
      </form>
    </Panel>
  );
}
