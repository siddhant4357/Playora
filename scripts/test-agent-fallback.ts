/**
 * WhatsApp agent without a language model: parser + full desk flow through the
 * real kernel (availability → book → my bookings → cancel) for a guest phone.
 *   npx tsx scripts/test-agent-fallback.ts
 */
import { parseIntent, runRuleBasedAgent } from "../lib/agent/fallback";
import { runWhatsAppAgent } from "../lib/agent/run";
import { resolveContext } from "../lib/agent/tools";
import { prisma } from "../lib/db";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `\n     → ${detail}` : ""}`);
}

async function main() {
  process.env.AI_GATEWAY_API_KEY = "invalid"; // force the model call to fail

  // Parser
  const cases: [string, string][] = [
    ["hi", "help"],
    ["what's free tomorrow for padel", "availability"],
    ["any badminton slots on sunday after 6pm", "availability"],
    ["book tennis 7pm tomorrow", "book"],
    ["Book court 2 at 18:30", "book"],
    ["my bookings", "myBookings"],
    ["cancel my booking", "cancel"],
  ];
  for (const [text, kind] of cases) check(`parse "${text}" → ${kind}`, parseIntent(text).kind === kind, JSON.stringify(parseIntent(text)));
  const b = parseIntent("book padel 7pm tomorrow, I'm Ravi Kumar");
  check("parse extracts time/sport/date/name", b.kind === "book" && b.time === "7pm" && b.sport === "padel" && b.date === "tomorrow" && b.guestName === "Ravi Kumar", JSON.stringify(b));

  // Flow on the live kernel, guest phone (no member match)
  const club = await prisma.club.findFirstOrThrow({ select: { id: true } });
  const phone = "+91 90000 12345";
  const ctx = await resolveContext(club.id, phone, "WHATSAPP");

  const avail = await runRuleBasedAgent(ctx, "what's free tomorrow");
  check("availability reply lists courts", /Free on|nothing free/i.test(avail), avail.split("\n")[0]);

  const freeLine = avail.split("\n").find((l) => /^Court/.test(l));
  const court = freeLine?.match(/^(Court \d+)/)?.[1];
  const time = freeLine?.match(/:\s*([0-9:]+\s*[ap]m)/i)?.[1]?.replace(/\s+/g, "");
  check("found a free court+time to book", Boolean(court && time), `${court} ${time}`);

  const booked = await runRuleBasedAgent(ctx, `book ${court} ${time} tomorrow, I'm Test Guest`);
  check("book reply confirms", /Booked/.test(booked), booked.split("\n")[0]);

  const mine = await runRuleBasedAgent(ctx, "my bookings");
  check("my bookings shows the new one", mine.includes(court ?? "Court"), mine.split("\n")[1]);

  const cancelled = await runRuleBasedAgent(ctx, "cancel");
  check("cancel succeeds", /Cancelled/.test(cancelled), cancelled);

  // Full runner falls back when the model is unavailable and logs engine=rules
  const viaRunner = await runWhatsAppAgent(club.id, phone, "hello");
  check("runWhatsAppAgent degrades to rules", /I can help with courts/.test(viaRunner), viaRunner.split("\n")[0]);
  const last = await prisma.activityLog.findFirst({ where: { action: "WA_OUT", entityId: ctx.phone }, orderBy: { createdAt: "desc" } });
  check("audit log records engine=rules", (last?.newData as { engine?: string } | null)?.engine === "rules");

  // Clean up test rows
  await prisma.booking.deleteMany({ where: { walkInPhone: phone } });
  await prisma.activityLog.deleteMany({ where: { entityId: ctx.phone, action: { in: ["WA_IN", "WA_OUT"] } } });

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}

main();
