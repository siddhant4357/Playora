import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { getTodayCheckIns } from "@/lib/members/queries";
import { dayStart, formatTime, todayKey } from "@/lib/time";
import { tierStyle } from "@/lib/booking/ui";
import { PageHeader, Panel } from "@/components/shared/Primitives";
import { CheckInScanner } from "@/components/members/CheckInScanner";

export const metadata: Metadata = { title: "Check-in" };

export default async function CheckInPage() {
  const user = await requireUser("/desk/checkin");
  const club = await getClub(user.clubId);
  const tz = club?.timezone ?? "Asia/Kolkata";
  const rows = await getTodayCheckIns(user.clubId, dayStart(todayKey(tz), tz));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Front desk" title="Check-in" subtitle={`${rows.length} check-ins today. Scan the member pass, or type a code or phone number.`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <CheckInScanner />
        <Panel title="Today">
          {rows.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Nobody has checked in yet.</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
              {rows.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-16 shrink-0 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {formatTime(c.createdAt, tz)}
                    </span>
                    <span className="truncate font-medium">
                      {c.member.firstName} {c.member.lastName}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={tierStyle(c.member.plan?.tier)}>
                      {c.member.plan?.name ?? "Trial"}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                      {c.method}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
