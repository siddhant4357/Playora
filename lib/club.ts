/**
 * lib/club.ts
 *
 * Tenant helpers. For the hackathon there is one club; everything still
 * goes through clubId so a second club is a seed row away, not a refactor.
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export const DEFAULT_CLUB_SLUG = "champions";

// The club row changes only from /owner/settings, which calls
// revalidatePath("/", "layout") and so purges these entries. Caching it
// across requests takes one DB round trip off every shell render.
const CLUB_TTL_SECONDS = 300;

const cachedClubById = unstable_cache(
  async (clubId: string) => prisma.club.findUnique({ where: { id: clubId } }),
  ["club-by-id"],
  { revalidate: CLUB_TTL_SECONDS, tags: ["club"] },
);

const cachedDefaultClub = unstable_cache(
  async () => prisma.club.findUnique({ where: { slug: DEFAULT_CLUB_SLUG } }),
  ["club-default"],
  { revalidate: CLUB_TTL_SECONDS, tags: ["club"] },
);

/** Also deduped per request so layouts and pages can both call it freely. */
export const getClub = cache(async (clubId: string) => cachedClubById(clubId));

export const getDefaultClub = cache(async () => cachedDefaultClub());
