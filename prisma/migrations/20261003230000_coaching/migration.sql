-- Coaching sessions are bookings (kind = COACHING) owned by a staff user with role COACH.
ALTER TABLE "bookings" ADD COLUMN "coachId" TEXT;

CREATE INDEX "bookings_coachId_startsAt_idx" ON "bookings"("coachId", "startsAt");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_coachId_fkey"
  FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
