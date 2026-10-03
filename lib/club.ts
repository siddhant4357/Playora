/**
 * lib/club.ts
 *
 * Tenant helpers. For the hackathon there is one club; everything still
 * goes through clubId so a second club is a seed row away, not a refactor.
 */

import { cache } from "react";
import { prisma } from "@/lib/db";

export const DEFAULT_CLUB_SLUG = "champions";

/** Cached per request so layouts and pages can both call it freely. */
export const getClub = cache(async (clubId: string) => {
  return prisma.club.findUnique({ where: { id: clubId } });
});

export const getDefaultClub = cache(async () => {
  return prisma.club.findUnique({ where: { slug: DEFAULT_CLUB_SLUG } });
});
