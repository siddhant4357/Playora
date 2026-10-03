/**
 * Integration test for the shop kernel. Run against the live DB:
 *   set -a && source /vercel/share/.env.project && set +a && npx tsx scripts/test-shop-engine.ts
 */
import { prisma } from "../lib/db";
import { KernelError } from "../lib/kernel";
import { adjustStock, advanceOrder, advanceServiceJob, counterSale, createServiceJob, placeOnlineOrder } from "../lib/shop/engine";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === undefined ? "" : `  → ${JSON.stringify(detail)}`}`);
}
async function expectError(name: string, code: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(name, false, "no error thrown");
  } catch (e) {
    check(name, e instanceof KernelError && e.code === code, e instanceof Error ? `${(e as KernelError).code ?? ""} ${e.message}` : e);
  }
}

const created: { orders: string[]; jobs: string[] } = { orders: [], jobs: [] };

async function main() {
  const club = await prisma.club.findUniqueOrThrow({ where: { slug: "champions" } });
  const clubId = club.id;
  const staff = await prisma.user.findFirstOrThrow({ where: { clubId, role: "FRONT_DESK" } });
  const gold = await prisma.member.findFirstOrThrow({ where: { clubId, plan: { shopDiscountPct: { gt: 0 } } }, include: { plan: true } });
  const balls = await prisma.product.findUniqueOrThrow({ where: { sku: "BAL-WUS4" } });
  const grip = await prisma.product.findUniqueOrThrow({ where: { sku: "ACC-GRIP" } });
  const restring = await prisma.product.findFirstOrThrow({ where: { clubId, isService: true } });
  const startBalls = balls.stockQty;
  const startGrip = grip.stockQty;

  // Counter sale, guest, exact cash
  const o1 = await counterSale({ clubId, guestName: "Walk-in", lines: [{ productId: balls.id, qty: 2 }], payments: [{ mode: "CASH", amount: balls.price * 2 }], byUserId: staff.id });
  created.orders.push(o1.id);
  check("counter sale completes", o1.status === "COMPLETED" && o1.channel === "COUNTER");
  check("order number assigned", /^SO-\d{8}-\d{4}$/.test(o1.orderNo), o1.orderNo);
  check("stock decremented", (await prisma.product.findUniqueOrThrow({ where: { id: balls.id } })).stockQty === startBalls - 2);
  check("ledger IN posted", (await prisma.transaction.count({ where: { refType: "ShopOrder", refId: o1.id, source: "SHOP" } })) === 1);
  check("stock movement recorded", (await prisma.stockMovement.count({ where: { refId: o1.id, reason: "SALE" } })) === 1);

  // Member discount auto-applied
  const pct = gold.plan!.shopDiscountPct;
  const expectedTotal = Math.round(grip.price * 3 * (1 - pct / 100));
  const o2 = await counterSale({ clubId, memberId: gold.id, lines: [{ productId: grip.id, qty: 3 }], payments: [{ mode: "UPI", amount: expectedTotal }], byUserId: staff.id });
  created.orders.push(o2.id);
  check(`member discount ${pct}% applied`, o2.discountPct === pct && o2.total === expectedTotal, { total: o2.total, expectedTotal });
  check("ledger carries memberId", (await prisma.transaction.findFirstOrThrow({ where: { refId: o2.id } })).memberId === gold.id);

  // Split payment must balance
  await expectError("unbalanced payment rejected", "UNBALANCED", () => counterSale({ clubId, lines: [{ productId: grip.id, qty: 1 }], payments: [{ mode: "CASH", amount: 100 }] }));
  const o3 = await counterSale({ clubId, lines: [{ productId: grip.id, qty: 1 }], payments: [{ mode: "CASH", amount: 20000 }, { mode: "CARD", amount: grip.price - 20000 }], byUserId: staff.id });
  created.orders.push(o3.id);
  check("split payment posts two ledger rows", (await prisma.transaction.count({ where: { refId: o3.id } })) === 2);

  // Oversell
  await expectError("qty > 50 rejected", "BAD_QTY", () => counterSale({ clubId, lines: [{ productId: grip.id, qty: 99 }], payments: [{ mode: "CASH", amount: 1 }] }));
  await prisma.product.update({ where: { id: balls.id }, data: { stockQty: 1 } });
  await expectError("oversell rejected", "OUT_OF_STOCK", () => counterSale({ clubId, lines: [{ productId: balls.id, qty: 2 }], payments: [{ mode: "CASH", amount: balls.price * 2 }] }));
  check("failed sale leaves stock untouched", (await prisma.product.findUniqueOrThrow({ where: { id: balls.id } })).stockQty === 1);
  await prisma.product.update({ where: { id: balls.id }, data: { stockQty: startBalls - 2 } });

  // Online order reserves stock, then fulfilment flow
  const gripBefore = (await prisma.product.findUniqueOrThrow({ where: { id: grip.id } })).stockQty;
  const on = await placeOnlineOrder({ clubId, memberId: gold.id, fulfilment: "CLICK_COLLECT", lines: [{ productId: grip.id, qty: 2 }] });
  created.orders.push(on.id);
  check("online order PAID with ONLINE mode", on.status === "PAID" && on.paymentMode === "ONLINE" && on.channel === "ONLINE");
  check("online order reserves stock immediately", (await prisma.product.findUniqueOrThrow({ where: { id: grip.id } })).stockQty === gripBefore - 2);
  check("online order linked to ledger txn", !!(await prisma.shopOrder.findUniqueOrThrow({ where: { id: on.id } })).transactionId);
  await expectError("delivery without address rejected", "NO_ADDRESS", () => placeOnlineOrder({ clubId, memberId: gold.id, fulfilment: "DELIVERY", lines: [{ productId: grip.id, qty: 1 }] }));
  await expectError("services cannot be ordered online", "SERVICE_ONLINE", () => placeOnlineOrder({ clubId, memberId: gold.id, fulfilment: "CLICK_COLLECT", lines: [{ productId: restring.id, qty: 1 }] }));

  await expectError("PAID → COMPLETED skipped step rejected", "BAD_TRANSITION", () => advanceOrder({ clubId, orderId: on.id, to: "COMPLETED" }));
  await advanceOrder({ clubId, orderId: on.id, to: "PREPARING", byUserId: staff.id });
  await expectError("C&C cannot go OUT_FOR_DELIVERY", "BAD_TRANSITION", () => advanceOrder({ clubId, orderId: on.id, to: "OUT_FOR_DELIVERY" }));
  await advanceOrder({ clubId, orderId: on.id, to: "READY_FOR_PICKUP", byUserId: staff.id });
  const done = await advanceOrder({ clubId, orderId: on.id, to: "COMPLETED", byUserId: staff.id });
  check("C&C flow PAID→PREPARING→READY→COMPLETED", done.status === "COMPLETED");

  // Cancel returns stock and refunds
  const on2 = await placeOnlineOrder({ clubId, guest: { name: "Guest G", phone: "9999999999" }, fulfilment: "DELIVERY", deliveryAddress: "12 Lake Road", lines: [{ productId: grip.id, qty: 1 }] });
  created.orders.push(on2.id);
  const beforeCancel = (await prisma.product.findUniqueOrThrow({ where: { id: grip.id } })).stockQty;
  await advanceOrder({ clubId, orderId: on2.id, to: "CANCELLED", reason: "test", byUserId: staff.id });
  check("cancel returns stock", (await prisma.product.findUniqueOrThrow({ where: { id: grip.id } })).stockQty === beforeCancel + 1);
  check("cancel posts refund OUT", (await prisma.transaction.count({ where: { refId: on2.id, direction: "OUT", source: "REFUND" } })) === 1);

  // Parallel race on the last unit
  await prisma.product.update({ where: { id: balls.id }, data: { stockQty: 1 } });
  const race = await Promise.allSettled([
    counterSale({ clubId, lines: [{ productId: balls.id, qty: 1 }], payments: [{ mode: "CASH", amount: balls.price }] }),
    counterSale({ clubId, lines: [{ productId: balls.id, qty: 1 }], payments: [{ mode: "CASH", amount: balls.price }] }),
  ]);
  const wins = race.filter((r) => r.status === "fulfilled");
  for (const r of race) if (r.status === "fulfilled") created.orders.push(r.value.id);
  check("race: exactly one sale of the last unit wins", wins.length === 1 && (await prisma.product.findUniqueOrThrow({ where: { id: balls.id } })).stockQty === 0, race.map((r) => r.status));
  await prisma.product.update({ where: { id: balls.id }, data: { stockQty: startBalls - 2 } });

  // Inventory adjustments
  await adjustStock({ clubId, productId: grip.id, delta: 10, reason: "RESTOCK", note: "test", byUserId: staff.id });
  check("restock adds stock", (await prisma.product.findUniqueOrThrow({ where: { id: grip.id } })).stockQty === startGrip - 3 - 1 - 2 + 10);
  await expectError("negative restock rejected", "BAD_QTY", () => adjustStock({ clubId, productId: grip.id, delta: -1, reason: "RESTOCK" }));
  await adjustStock({ clubId, productId: grip.id, delta: -10, reason: "ADJUSTMENT", note: "test undo", byUserId: staff.id });

  // Service job
  const price = Math.round(restring.price * (1 - pct / 100));
  const job = await createServiceJob({ clubId, productId: restring.id, memberId: gold.id, item: "Wilson Pro Staff — 24 lbs", payments: [{ mode: "CASH", amount: price }], byUserId: staff.id });
  created.jobs.push(job.id);
  check("service job created with member discount", job.status === "RECEIVED" && job.price === price && /^JOB-/.test(job.jobNo));
  check("service job posts to ledger", (await prisma.transaction.count({ where: { refType: "ServiceJob", refId: job.id } })) === 1);
  await expectError("job cannot skip to COLLECTED", "BAD_TRANSITION", () => advanceServiceJob({ clubId, jobId: job.id, to: "COLLECTED" }));
  await advanceServiceJob({ clubId, jobId: job.id, to: "IN_PROGRESS" });
  const ready = await advanceServiceJob({ clubId, jobId: job.id, to: "READY" });
  check("job READY stamps readyAt", ready.status === "READY" && !!ready.readyAt);

  // Final: stock back where it started
  check("grip stock back to start", (await prisma.product.findUniqueOrThrow({ where: { id: grip.id } })).stockQty === startGrip - 3 - 1 - 2);
}

async function cleanup() {
  const ids = created.orders;
  await prisma.transaction.deleteMany({ where: { OR: [{ refType: "ShopOrder", refId: { in: ids } }, { refType: "ServiceJob", refId: { in: created.jobs } }] } });
  await prisma.stockMovement.deleteMany({ where: { OR: [{ refId: { in: ids } }, { note: { in: ["test", "test undo"] } }] } });
  await prisma.activityLog.deleteMany({ where: { entityId: { in: [...ids, ...created.jobs] } } });
  await prisma.shopOrder.deleteMany({ where: { id: { in: ids } } });
  await prisma.serviceJob.deleteMany({ where: { id: { in: created.jobs } } });
  // Restore stock consumed by the test sales (3 + 1 + 2 grips, 2 + 1 balls)
  const grip = await prisma.product.findUniqueOrThrow({ where: { sku: "ACC-GRIP" } });
  const balls = await prisma.product.findUniqueOrThrow({ where: { sku: "BAL-WUS4" } });
  await prisma.product.update({ where: { id: grip.id }, data: { stockQty: grip.stockQty + 6 } });
  await prisma.product.update({ where: { id: balls.id }, data: { stockQty: balls.stockQty + 3 } });
}

main()
  .catch((e) => {
    fail++;
    console.error("FAIL  uncaught", e);
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n${pass} passed, ${fail} failed`);
    await prisma.$disconnect();
    process.exit(fail ? 1 : 0);
  });
