/**
 * Runs every suggested question through the Ask engine's offline path.
 *   npx tsx scripts/test-ask-canned.ts
 */
import { ask } from "../lib/ask/engine";
import { SUGGESTED_QUESTIONS } from "../lib/ask/labels";
import { prisma } from "../lib/db";

async function main() {
  // Force the offline path regardless of Gateway state.
  process.env.AI_GATEWAY_API_KEY = "invalid";
  const club = await prisma.club.findFirstOrThrow({ select: { id: true, timezone: true } });
  let fail = 0;
  for (const q of SUGGESTED_QUESTIONS) {
    try {
      const r = await ask(club.id, q, club.timezone);
      console.log(`ok   ${q}\n     → ${r.answer} [${r.rows.length} rows, chart=${r.chart?.kind ?? "none"}, fallback=${r.viaFallback}]`);
    } catch (e) {
      fail++;
      console.log(`FAIL ${q}\n     → ${e instanceof Error ? e.message : e}`);
    }
  }
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}

main();
