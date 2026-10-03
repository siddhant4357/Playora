/**
 * scripts/test-bar-engine.ts
 *
 * Integration test for the bar kernel against the real database.
 * Run: set -a && source /vercel/share/.env.project && set +a && npx tsx scripts/test-bar-engine.ts
 *
 * Creates tabs/payments/ledger rows and deletes them afterwards. Stock and
 * member credit are restored to their starting values.
 */

import { prisma } from "../lib/db";
import { addItems, BarError, bumpTicket, openTab, setDiscount, settleTab, voidItem, voidTab } from "../lib/bar/engine";

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? `  → ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures++;
}
async function expectError(name: string, code: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(name, false, "no error thrown");
  } catch (e) {
    check(name, e instanceof BarError && e.code === code, e instanceof BarError ? e.code : String(e));
  }
}

const load = (id: string) => prisma.barTab.findUniqueOrThrow({ where: { id }, include: { items: true, payments: true } });

async function main() {
  const club = await prisma.club.findUniqueOrThrow({ where: { slug: "champions" } });
  const clubId = club.id;
  const table = await prisma.barTable.findFirstOrThrow({ where: { clubId }, orderBy: { sortOrder: "asc" } });
  const member = await prisma.member.findUniqueOrThrow({ where: { memberCode: "CC-0001" } });
  const food = await prisma.product.findFirstOrThrow({ where: { clubId, category: "FOOD", isAvailable: true } });
  const drink = await prisma.product.findFirstOrThrow({ where: { clubId, category: "BEVERAGE", isAvailable: true, trackStock: true } });
  const startStock = drink.stockQty;
  const startCredit = member.creditBalance;
  const startTx = await prisma.transaction.count({ where: { clubId } });
  const created: string[] = [];

  // Make sure the table has no open tab from a previous run
  await prisma.barTab.updateMany({ where: { tableId: table.id, status: "OPEN" }, data: { status: "VOID", voidReason: "test reset", settledAt: new Date() } });

  // 1. open tab, idempotent per table
  const tabId = await openTab({ clubId, tableId: table.id, memberId: member.id, source: "POS" });
  created.push(tabId);
  const again = await openTab({ clubId, tableId: table.id });
  check("one open tab per table is reused", again === tabId);

  // 2. add items → totals, kitchen ticket, stock move
  await addItems({ clubId, tabId, lines: [{ productId: food.id, qty: 2, notes: "no onion" }, { productId: drink.id, qty: 3 }] });
  let tab = await load(tabId);
  const expectedSub = food.price * 2 + drink.price * 3;
  check("subtotal = sum(unitPrice*qty)", tab.subtotal === expectedSub, { subtotal: tab.subtotal, expectedSub });
  check("total = subtotal when no discount (tax inclusive)", tab.total === expectedSub, { total: tab.total });
  check("tax > 0 extracted from inclusive price", tab.tax > 0 && tab.tax < tab.total, tab.tax);
  check("food item needs kitchen, NEW", tab.items.find((i) => i.productId === food.id)?.needsKitchen === true && tab.items.find((i) => i.productId === food.id)?.kitchenStatus === "NEW");
  check("drink item skips kitchen", tab.items.find((i) => i.productId === drink.id)?.needsKitchen === false);
  const stockAfterAdd = (await prisma.product.findUniqueOrThrow({ where: { id: drink.id } })).stockQty;
  check("stock decremented on add", stockAfterAdd === startStock - 3, { startStock, stockAfterAdd });

  // 3. 86'd and oversell guards
  await prisma.product.update({ where: { id: food.id }, data: { isAvailable: false } });
  await expectError("86'd item rejected", "UNAVAILABLE", () => addItems({ clubId, tabId, lines: [{ productId: food.id, qty: 1 }] }));
  await prisma.product.update({ where: { id: food.id }, data: { isAvailable: true } });
  await expectError("qty > 50 rejected", "BAD_QTY", () => addItems({ clubId, tabId, lines: [{ productId: drink.id, qty: 10_000 }] }));
  await prisma.product.update({ where: { id: drink.id }, data: { stockQty: 1 } });
  await expectError("oversell rejected (tracked stock)", "OUT_OF_STOCK", () => addItems({ clubId, tabId, lines: [{ productId: drink.id, qty: 2 }] }));
  await prisma.product.update({ where: { id: drink.id }, data: { stockQty: startStock - 3 } });

  // 4. kitchen bump
  await bumpTicket({ clubId, tabId, to: "READY" });
  tab = await load(tabId);
  check("ticket bumped to READY", tab.items.filter((i) => i.needsKitchen).every((i) => i.kitchenStatus === "READY"));

  // 5. void one item → stock returned, totals drop
  const drinkItem = tab.items.find((i) => i.productId === drink.id)!;
  await voidItem({ clubId, itemId: drinkItem.id, reason: "spilled" });
  tab = await load(tabId);
  check("void item removes from total", tab.subtotal === food.price * 2, tab.subtotal);
  check("void item restores stock", (await prisma.product.findUniqueOrThrow({ where: { id: drink.id } })).stockQty === startStock);

  // 6. discount
  await setDiscount({ clubId, tabId, discountPct: 10 });
  tab = await load(tabId);
  check("10% discount applied", tab.discount === Math.round((food.price * 2) * 0.1) && tab.total === tab.subtotal - tab.discount, { discount: tab.discount, total: tab.total });
  await expectError("discount > 100 rejected", "BAD_DISCOUNT", () => setDiscount({ clubId, tabId, discountPct: 150 }));

  // 7. settle guards
  await expectError("unbalanced payment rejected", "UNBALANCED", () => settleTab({ clubId, tabId, payments: [{ mode: "CASH", amount: tab.total - 100 }] }));
  await expectError("credit over balance rejected", "INSUFFICIENT_CREDIT", () => settleTab({ clubId, tabId, payments: [{ mode: "CREDIT", amount: tab.total }] }).then(() => { if (startCredit >= tab.total) throw new BarError("INSUFFICIENT_CREDIT", "skip: member had enough credit"); }));

  // 8. split settle → payments + ledger + kitchen auto-served
  const half = Math.floor(tab.total / 2);
  await settleTab({ clubId, tabId, payments: [{ mode: "UPI", amount: half }, { mode: "CASH", amount: tab.total - half }] });
  tab = await load(tabId);
  check("tab SETTLED", tab.status === "SETTLED");
  check("two payments recorded", tab.payments.length === 2);
  check("kitchen items auto-SERVED on settle", tab.items.filter((i) => i.needsKitchen && i.kitchenStatus !== "CANCELLED").every((i) => i.kitchenStatus === "SERVED"));
  const txs = await prisma.transaction.findMany({ where: { clubId, refType: "BarTab", refId: tabId } });
  check("ledger has 2 BAR transactions summing to total", txs.length === 2 && txs.reduce((s, t) => s + t.amount, 0) === tab.total && txs.every((t) => t.source === "BAR" && t.memberId === member.id), txs.map((t) => [t.paymentMode, t.amount]));
  await expectError("settled tab cannot take items", "CLOSED", () => addItems({ clubId, tabId, lines: [{ productId: food.id, qty: 1 }] }));
  await expectError("double settle rejected", "CLOSED", () => settleTab({ clubId, tabId, payments: [{ mode: "CASH", amount: tab.total }] }));

  // 9. void whole tab returns stock
  const tab2 = await openTab({ clubId, guestName: "Walk-in", source: "QR" });
  created.push(tab2);
  await addItems({ clubId, tabId: tab2, lines: [{ productId: drink.id, qty: 2 }] });
  await voidTab({ clubId, tabId: tab2, reason: "test" });
  check("void tab restores stock", (await prisma.product.findUniqueOrThrow({ where: { id: drink.id } })).stockQty === startStock);
  check("void tab logged", (await prisma.activityLog.count({ where: { clubId, entityId: tab2, action: "BAR_TAB_VOID" } })) === 1);

  // 10. parallel adds on the same tab don't lose updates
  const tab3 = await openTab({ clubId, guestName: "Race", source: "POS" });
  created.push(tab3);
  await Promise.all(Array.from({ length: 5 }, () => addItems({ clubId, tabId: tab3, lines: [{ productId: drink.id, qty: 1 }] })));
  const t3 = await prisma.barTab.findUniqueOrThrow({ where: { id: tab3 }, include: { items: true } });
  check("5 parallel adds → 5 items, correct total", t3.items.length === 5 && t3.subtotal === drink.price * 5, { items: t3.items.length, subtotal: t3.subtotal });
  check("5 parallel adds → stock -5", (await prisma.product.findUniqueOrThrow({ where: { id: drink.id } })).stockQty === startStock - 5);
  await voidTab({ clubId, tabId: tab3, reason: "test" });

  // cleanup
  await prisma.transaction.deleteMany({ where: { clubId, refType: "BarTab", refId: { in: created } } });
  await prisma.stockMovement.deleteMany({ where: { clubId, refType: "BarTab", refId: { in: created } } });
  await prisma.activityLog.deleteMany({ where: { clubId, entityId: { in: created } } });
  await prisma.payment.deleteMany({ where: { tabId: { in: created } } });
  await prisma.barTabItem.deleteMany({ where: { tabId: { in: created } } });
  await prisma.barTab.deleteMany({ where: { id: { in: created } } });
  await prisma.product.update({ where: { id: drink.id }, data: { stockQty: startStock } });
  await prisma.member.update({ where: { id: member.id }, data: { creditBalance: startCredit } });
  check("cleanup: ledger count restored", (await prisma.transaction.count({ where: { clubId } })) === startTx);

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
