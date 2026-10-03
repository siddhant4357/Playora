import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Coffee, QrCode } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMemberTabs } from "@/lib/bar/queries";
import { Button } from "@/components/ui/button";
import { OpenTabCard, SettledTabRow } from "@/components/member/MemberTab";
import { NoMemberProfile } from "@/components/member/NoMemberProfile";

export const metadata: Metadata = { title: "My tab" };

export default async function MemberTabPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fme%2Ftab");

  const [club, account] = await Promise.all([
    prisma.club.findUnique({ where: { id: user.clubId }, select: { timezone: true } }),
    prisma.user.findUnique({ where: { id: user.userId }, select: { member: { select: { id: true } } } }),
  ]);
  const member = account?.member;
  if (!member) return <NoMemberProfile feature="your bar tab" />;

  const tz = club?.timezone ?? "Asia/Kolkata";
  const { open, history } = await getMemberTabs(member.id);
  const spent = history.reduce((n, t) => n + t.total, 0);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">My tab</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Bar &amp; cafeteria orders on your member account.
          </p>
        </div>
        <Button size="sm" variant="outline" render={<Link href="/me" />} nativeButton={false}>
          <QrCode className="h-4 w-4" />
          Member QR
        </Button>
      </header>

      {open ? (
        <OpenTabCard tab={open} tz={tz} />
      ) : (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl p-8 text-center"
          style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border-strong)" }}
        >
          <span className="flex size-10 items-center justify-center rounded-full" style={{ background: "var(--color-surface-2)" }}>
            <Coffee className="h-5 w-5" style={{ color: "var(--color-text-muted)" }} />
          </span>
          <p className="text-sm font-medium">No tab open right now</p>
          <p className="max-w-sm text-sm" style={{ color: "var(--color-text-muted)" }}>
            Scan the QR on any table to order, or show your member QR at the bar and staff will open a tab on your account.
          </p>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Settled · {history.length}
          </h2>
          {history.length > 0 && (
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Last {history.length} tabs · {formatTotal(spent)}
            </span>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Settled tabs will show up here with an itemised receipt.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {history.map((t) => (
              <SettledTabRow key={t.id} tab={t} tz={tz} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function formatTotal(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}
