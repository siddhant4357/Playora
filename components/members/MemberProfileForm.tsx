"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { updateMyMemberProfileAction } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MemberProfileForm({ initial }: { initial: { phone: string; emergencyContact: string; skillRating: number } }) {
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateMyMemberProfileAction(form);
          res.success ? toast.success(res.message) : toast.error(res.error);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Emergency contact</Label>
          <Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Name · phone" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Playing level</Label>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Skill rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={form.skillRating === n} onClick={() => setForm({ ...form, skillRating: n })} className={cn("rounded-full px-3 py-1 text-xs font-semibold", form.skillRating === n && "text-white")} style={form.skillRating === n ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
              {n} · {["Beginner", "Improver", "Intermediate", "Advanced", "Competitive"][n - 1]}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending} className="self-end">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
