import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { listCoachPlayers } from "@/lib/coach/queries";
import { formatDate } from "@/lib/time";
import { tierStyle } from "@/lib/booking/ui";
import { EmptyState, PageHeader, Pill } from "@/components/shared/Primitives";

export const metadata: Metadata = { title: "Players" };

export default async function CoachPlayersPage() {
  const user = await requireRole("COACH", "MANAGER", "OWNER");
  const club = await getClub(user.clubId);
  const tz = club?.timezone ?? "Asia/Kolkata";
  const isCoach = user.role === "COACH";
  const players = await listCoachPlayers({ clubId: user.clubId, coachId: isCoach ? user.userId : null });

  const active = players.filter((p) => p.next !== null).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Coaching" title="Players" subtitle={`${players.length} players · ${active} with an upcoming session`} />

      {players.length === 0 ? (
        <EmptyState title="No players yet" hint="Players appear here once a coaching session is booked for them." />
      ) : (
        <div className="overflow-hidden rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                <th className="px-4 py-3 font-semibold">Player</th>
                <th className="hidden px-4 py-3 text-right font-semibold md:table-cell">Sessions</th>
                <th className="hidden px-4 py-3 text-right font-semibold md:table-cell">Attendance</th>
                <th className="px-4 py-3 font-semibold">Next</th>
                <th className="hidden px-4 py-3 font-semibold lg:table-cell">Last note</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {players.map((p) => {
                const name = `${p.member.firstName} ${p.member.lastName}`;
                return (
                  <tr key={p.member.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--color-primary-900)" }} aria-hidden>
                          {p.member.firstName[0]}
                          {p.member.lastName[0]}
                        </span>
                        <div className="flex min-w-0 flex-col leading-tight">
                          {isCoach ? (
                            <span className="truncate font-medium">{name}</span>
                          ) : (
                            <Link href={`/desk/members/${p.member.id}`} className="truncate font-medium hover:underline">
                              {name}
                            </Link>
                          )}
                          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {p.member.memberCode}
                            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={tierStyle(p.member.plan?.tier)}>
                              {p.member.plan?.name ?? "No plan"}
                            </span>
                            {!isCoach && p.coaches.length > 0 && <span>· {p.coaches.join(", ")}</span>}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">
                      {p.completed}
                      <span style={{ color: "var(--color-text-muted)" }}> / {p.total}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">
                      {p.attendancePct === null ? (
                        <span style={{ color: "var(--color-text-muted)" }}>—</span>
                      ) : (
                        <Pill tone={p.attendancePct >= 80 ? "success" : p.attendancePct >= 50 ? "warning" : "danger"}>{p.attendancePct}%</Pill>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.next ? (
                        formatDate(p.next, tz)
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>{p.last ? `Last ${formatDate(p.last, tz)}` : "—"}</span>
                      )}
                    </td>
                    <td className="hidden max-w-xs px-4 py-3 lg:table-cell">
                      {p.latestNote ? (
                        <p className="truncate text-xs" style={{ color: "var(--color-text-muted)" }} title={p.latestNote.content}>
                          {p.latestNote.content}
                        </p>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>No notes yet</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
