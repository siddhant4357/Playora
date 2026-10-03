"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createLeadAction } from "@/lib/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SOURCE_LABEL } from "@/components/leads/labels";

const INTERESTS = ["Tennis", "Padel", "Membership", "Coaching", "Events"] as const;
const SOURCES = ["WALK_IN", "PHONE", "WHATSAPP", "REFERRAL", "INSTAGRAM", "WEBSITE"] as const;

const selectCls = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function NewLeadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlus className="h-4 w-4" /> Add lead
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>Someone on the phone or at the counter. Thirty seconds, then follow up later.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await createLeadAction({
                name: String(fd.get("name") ?? ""),
                phone: String(fd.get("phone") ?? ""),
                email: String(fd.get("email") ?? ""),
                interest: fd.get("interest") as (typeof INTERESTS)[number],
                source: fd.get("source") as (typeof SOURCES)[number],
                message: String(fd.get("message") ?? ""),
              });
              if (!res.success) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
              router.push(`/desk/leads/${res.data.leadId}`);
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nl-name">Name</Label>
              <Input id="nl-name" name="name" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nl-phone">Phone</Label>
              <Input id="nl-phone" name="phone" type="tel" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nl-email">Email (optional)</Label>
            <Input id="nl-email" name="email" type="email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nl-interest">Interested in</Label>
              <select id="nl-interest" name="interest" defaultValue="Membership" className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                {INTERESTS.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nl-source">Source</Label>
              <select id="nl-source" name="source" defaultValue="WALK_IN" className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nl-msg">What did they ask?</Label>
            <Textarea id="nl-msg" name="message" rows={2} placeholder="Wants weekend padel for two beginners" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
