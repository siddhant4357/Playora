"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Member = {
  firstName: string;
  lastName: string;
  memberCode: string;
  status: string;
  expiryDate: Date | null;
  plan: { name: string; tier: string } | null;
};

export function MemberCard({ member, qrToken }: { member: Member; qrToken: string }) {
  const [open, setOpen] = useState(false);
  const days = member.expiryDate ? Math.ceil((member.expiryDate.getTime() - Date.now()) / 86_400_000) : null;
  const tone = days === null ? null : days < 0 ? "Expired" : days <= 14 ? `${days} days left` : `Valid till ${member.expiryDate!.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-left transition-transform active:scale-[0.99]"
        style={{ background: "var(--color-primary-900)", color: "#fff" }}
        aria-label="Show membership pass"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Membership pass</span>
          <span className="truncate text-lg font-bold">
            {member.firstName} {member.lastName}
          </span>
          <span className="text-sm opacity-85">
            {member.plan?.name ?? "Trial"} · <span className="font-mono tracking-wider">{member.memberCode}</span>
          </span>
          {tone && (
            <span className="text-xs" style={{ color: days !== null && days <= 14 ? "#fbbf24" : "rgba(255,255,255,0.75)" }}>
              {tone}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center justify-center rounded-xl bg-white p-2">
          <QRCodeSVG value={`yolla:${qrToken}`} size={64} fgColor="#20121d" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Show this at the desk
            </DialogTitle>
            <DialogDescription>Front desk scans it to check you in and link today&apos;s booking.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6">
            <QRCodeSVG value={`yolla:${qrToken}`} size={240} level="M" fgColor="#20121d" />
            <span className="font-mono text-lg font-semibold tracking-widest" style={{ color: "#20121d" }}>
              {member.memberCode}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
