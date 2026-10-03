/**
 * Ask AI safety guard — runs without the model so it works offline.
 *   npx tsx scripts/test-ask-guard.ts
 */
import { guardSql, AskError } from "../lib/ask/engine";
import { prisma } from "../lib/db";

const CLUB = "club_test_123";
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function rejects(name: string, sql: string, code = "UNSAFE") {
  try {
    guardSql(sql, CLUB);
    check(name, false, "was allowed");
  } catch (e) {
    check(name, e instanceof AskError && e.code === code, e instanceof Error ? e.message : String(e));
  }
}

async function main() {
  const good = guardSql(`SELECT source, SUM(amount) AS revenue FROM transactions WHERE "clubId" = '${CLUB}' AND direction = 'IN' GROUP BY source`, CLUB);
  check("allows scoped SELECT", good.startsWith("SELECT"));
  check("appends LIMIT when missing", /LIMIT 200$/.test(good));
  check("keeps explicit LIMIT", !/LIMIT 200$/.test(guardSql(`SELECT 1 FROM courts WHERE "clubId"='${CLUB}' LIMIT 5`, CLUB)));
  check("allows CTE", guardSql(`WITH t AS (SELECT amount FROM transactions WHERE "clubId"='${CLUB}') SELECT SUM(amount) FROM t`, CLUB).length > 0);

  rejects("blocks UPDATE", `UPDATE members SET status='ACTIVE' WHERE "clubId"='${CLUB}'`);
  rejects("blocks DELETE", `DELETE FROM bookings WHERE "clubId"='${CLUB}'`);
  rejects("blocks DROP", `DROP TABLE transactions`);
  rejects("blocks stacked statements", `SELECT 1 FROM courts WHERE "clubId"='${CLUB}'; DELETE FROM courts`);
  rejects("blocks missing clubId", `SELECT COUNT(*) FROM members`);
  rejects("blocks other club", `SELECT COUNT(*) FROM members WHERE "clubId" = 'someone_else'`);
  rejects("blocks users table", `SELECT email FROM users WHERE "clubId"='${CLUB}'`);
  rejects("blocks pg_catalog", `SELECT * FROM pg_tables WHERE '${CLUB}'='${CLUB}'`);
  rejects("blocks information_schema", `SELECT * FROM information_schema.tables WHERE '${CLUB}'='${CLUB}'`);
  rejects("blocks SET", `SET statement_timeout = 0; SELECT 1 WHERE '${CLUB}'='${CLUB}'`);
  rejects("blocks password_reset_tokens", `SELECT token FROM password_reset_tokens WHERE '${CLUB}'='${CLUB}'`);

  // Defence in depth: even if the guard passed something, the READ ONLY tx must refuse writes.
  const club = await prisma.club.findFirst({ select: { id: true } });
  if (club) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        await tx.$executeRawUnsafe(`UPDATE clubs SET name = name WHERE id = '${club.id}'`);
      });
      check("READ ONLY transaction refuses UPDATE", false, "update succeeded");
    } catch (e) {
      check("READ ONLY transaction refuses UPDATE", /read-only/i.test(String(e)), String(e).split("\n")[0].slice(0, 80));
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}

main();
