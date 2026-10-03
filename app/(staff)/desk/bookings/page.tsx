import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { listDeskBookings, type BookingRange, type BookingStatusFilter } from "@/lib/booking/queries";
import { formatPaise } from "@/lib/money";
import { PageHeader } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { BookingsToolbar } from "@/components/booking/BookingsToolbar";
import { BookingsTable } from "@/components/booking/BookingsTable";

export const metadata: Metadata = { title: "Bookings" };

const RANGES: BookingRange[] = ["today", "upcoming", "past"];
const STATUSES: BookingStatusFilter[] = ["ALL", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

interface PageProps {
  searchParams: Promise<{ range?: string; status?: string; q?: string }>;
}

export default async function DeskBookingsPage({ searchParams }: PageProps) {
  const user = await requireRole("FRONT_DESK", "MANAGER", "OWNER");
  const club = await getClub(user.clubId);
  const tz = club?.timezone ?? "Asia/Kolkata";

  const sp = await searchParams;
  const range = RANGES.includes(sp.range as BookingRange) ? (sp.range as BookingRange) : "today";
  const status = STATUSES.includes(sp.status as BookingStatusFilter) ? (sp.status as BookingStatusFilter) : "ALL";
  const q = sp.q ?? "";

  const { rows, counts } = await listDeskBookings(user.clubId, { range, status, q }, tz);
  const revenue = rows.filter((b) => b.status !== "CANCELLED").reduce((n, b) => n + b.priceCharged, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Front desk"
        title="Bookings"
        subtitle={`${rows.length} shown · ${formatPaise(revenue)} court revenue in view`}
        actions={
          <Button render={<Link href="/desk" />} nativeButton={false}>
            <CalendarPlus className="h-4 w-4" />
            Book a court
          </Button>
        }
      />
      <BookingsToolbar range={range} status={status} q={q} counts={counts} />
      <BookingsTable rows={rows} timezone={tz} />
    </div>
  );
}
