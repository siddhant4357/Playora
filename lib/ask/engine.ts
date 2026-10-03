
import { z } from "zod";
import { prisma } from "@/lib/db";

/**
 * Ask AI — natural-language analytics for the owner.
 *
 * Flow: question → model writes ONE SELECT against the whitelisted catalogue
 * → guard (read-only, club-scoped, bounded) → run inside a READ ONLY
 * transaction with a statement timeout → optional chart spec.
 *
 * The model never sees row data; it only sees the schema catalogue and the
 * question. The clubId is injected by us, not the model, and the guard
 * rejects any query that forgets to filter on it.
 */

export const ASK_MODEL = "openai/gpt-4o-mini";

/** Tables the model may read, with the columns that matter for analytics. */
export const CATALOGUE = `
transactions("clubId", "memberId", source, direction, amount, tax, "paymentMode", description, "createdAt")
  -- the single ledger. amount/tax are integer paise. direction IN/OUT.
  -- source: COURT | SHOP | BAR | MEMBERSHIP | COACHING | EVENT | CORPORATE | REFUND | PAYROLL | SUPPLIER | OTHER
  -- paymentMode: CASH | CARD | UPI | ONLINE | CREDIT | COMPLIMENTARY
bookings("clubId", "courtId", "memberId", "walkInName", "startsAt", "endsAt", kind, status, source, "listPrice", "discountPct", "priceCharged", "creditIssued", "checkedInAt", "cancelledAt", "createdAt")
  -- status: CONFIRMED | COMPLETED | CANCELLED | NO_SHOW ; source: WEB | APP | FRONT_DESK | PHONE | WHATSAPP
courts("clubId", id, name, type, "isIndoor", "isActive")
  -- type: TENNIS | PADEL | BADMINTON | CRICKET | PICKLEBALL
members("clubId", id, "memberCode", "firstName", "lastName", status, "planId", "startDate", "expiryDate", "creditBalance", "createdAt")
  -- status: LEAD | TRIAL | ACTIVE | EXPIRED | FROZEN | CANCELLED
membership_plans("clubId", id, tier, name, "priceMonthly", "courtDiscountPct")
bar_tabs("clubId", id, "tabNo", "memberId", status, subtotal, discount, tax, total, "openedAt", "settledAt")
bar_tab_items("tabId", "productId", name, qty, "unitPrice")  -- line total = qty * "unitPrice"
shop_orders("clubId", id, "orderNo", "memberId", channel, status, total, "createdAt")
  -- channel: COUNTER | ONLINE ; status: PENDING | PAID | PREPARING | READY_FOR_PICKUP | OUT_FOR_DELIVERY | COMPLETED | CANCELLED
bar_tabs status: OPEN | SETTLED | VOID
shop_order_items("orderId", "productId", name, qty, "unitPrice", total)
products("clubId", id, sku, name, category, price, "stockQty", "lowStockAt", "isForBar", "isForShop")
invoices("clubId", id, "invoiceNo", status, total, "dueDate", "paidAt", "createdAt")
payables("clubId", id, category, payee, amount, status, "dueDate", "paidAt")
employees("clubId", id, "employeeNo", designation, department, "monthlySalary")
attendance("clubId", "employeeId", date, "clockIn", "clockOut", minutes)
leave_requests("clubId", "employeeId", type, "fromDate", "toDate", days, status)
`.trim();

const ALLOWED_TABLES = ["transactions", "bookings", "courts", "members", "membership_plans", "bar_tabs", "bar_tab_items", "shop_orders", "shop_order_items", "products", "invoices", "payables", "employees", "attendance", "leave_requests"];

const FORBIDDEN = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|analyze|lock|call|do|execute|prepare|set|reset|show|listen|notify|refresh|reindex|cluster|comment|security|pg_|information_schema|current_setting|dblink|lo_)\b/i;

export interface AskResult {
  answer: string;
  sql: string;
  rows: Record<string, unknown>[];
  columns: string[];
  chart: { kind: "bar" | "line" | "none"; x: string; y: string; yIsPaise: boolean } | null;
  ms: number;
  /** True when answered from a vetted canned plan because the model was unavailable. */
  viaFallback: boolean;
}

export class AskError extends Error {
  constructor(message: string, readonly code: "UNSAFE" | "MODEL" | "DB" | "EMPTY") {
    super(message);
  }
}

/** Reject anything that is not a single, club-scoped SELECT over allowed tables. */
export function guardSql(sql: string, clubId: string): string {
  const cleaned = sql.trim().replace(/;+\s*$/, "");
  if (cleaned.includes(";")) throw new AskError("Only one statement is allowed.", "UNSAFE");
  if (!/^\s*(with\b[\s\S]*?\bselect\b|select\b)/i.test(cleaned)) throw new AskError("Only SELECT queries are allowed.", "UNSAFE");
  if (FORBIDDEN.test(cleaned)) throw new AskError("Query uses a forbidden keyword.", "UNSAFE");
  if (!cleaned.includes(clubId)) throw new AskError("Query must be scoped to this club.", "UNSAFE");

  // Extract CTE alias names so they aren't treated as real tables
  const cteNames = new Set(
    [...cleaned.matchAll(/\bwith\b[\s\S]*?(\w+)\s+as\s*\(/gi)].map((m) => m[1].toLowerCase())
  );

  const tables = [...cleaned.matchAll(/\b(?:from|join)\s+"?([a-z_]+)"?/gi)].map((m) => m[1].toLowerCase());
  const bad = tables.filter(
    (t) => !ALLOWED_TABLES.includes(t) && !cteNames.has(t) && !/^[a-z]$|^[a-z]{1,3}\d?$/.test(t)
  );
  if (bad.length) throw new AskError(`Table not allowed: ${bad.join(", ")}`, "UNSAFE");

  return /\blimit\s+\d+/i.test(cleaned) ? cleaned : `${cleaned}\nLIMIT 200`;
}

const planSchema = z.object({
  sql: z.string().describe("One PostgreSQL SELECT. Must filter every table on \"clubId\" = the given club id literal. Money columns are integer paise; return them as paise (do not divide). Alias output columns with short snake_case names."),
  chart: z.object({
    kind: z.enum(["bar", "line", "none"]),
    x: z.string().describe("alias of the category/time column"),
    y: z.string().describe("alias of the numeric column"),
    yIsPaise: z.boolean(),
  }),
  summaryTemplate: z.string().describe("One sentence answering the question in plain English, using {{row_count}} and {{first.<alias>}} placeholders where useful."),
});

type Plan = z.infer<typeof planSchema>;

/**
 * Vetted plans for the suggested questions. Used when the model is
 * unavailable so the demo never dead-ends; the result still goes through
 * the same guard + READ ONLY transaction as a model-written query.
 */
const CANNED: { match: RegExp; plan: (clubId: string, tz: string) => Plan }[] = [
  {
    match: /revenue by source/i,
    plan: (c, tz) => ({
      sql: `SELECT source, CASE WHEN ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE '${tz}')::date >= date_trunc('month', (now() AT TIME ZONE '${tz}'))::date THEN 'this_month' ELSE 'last_month' END AS period, SUM(amount) AS revenue FROM transactions WHERE "clubId" = '${c}' AND direction = 'IN' AND ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE '${tz}')::date >= (date_trunc('month', (now() AT TIME ZONE '${tz}')) - interval '1 month')::date GROUP BY source, period ORDER BY period DESC, revenue DESC`,
      chart: { kind: "bar", x: "source", y: "revenue", yIsPaise: true },
      summaryTemplate: "{{row_count}} source × period rows; the largest line is {{first.source}} ({{first.period}}) at {{first.revenue}}.",
    }),
  },
  {
    match: /court.*(most|per hour)/i,
    plan: (c) => ({
      sql: `SELECT co.name AS court, co.type, COUNT(b.id) AS bookings, SUM(b."priceCharged") AS revenue, ROUND(SUM(b."priceCharged")::numeric / NULLIF(SUM(EXTRACT(EPOCH FROM (b."endsAt" - b."startsAt")) / 3600), 0)) AS revenue_per_hour FROM bookings b JOIN courts co ON co.id = b."courtId" WHERE b."clubId" = '${c}' AND co."clubId" = '${c}' AND b.status IN ('CONFIRMED','COMPLETED') GROUP BY co.name, co.type ORDER BY revenue_per_hour DESC NULLS LAST`,
      chart: { kind: "bar", x: "court", y: "revenue_per_hour", yIsPaise: true },
      summaryTemplate: "{{first.court}} earns the most per booked hour at {{first.revenue_per_hour}}, across {{row_count}} courts.",
    }),
  },
  {
    match: /cancel/i,
    plan: (c, tz) => ({
      sql: `SELECT COUNT(*) AS cancelled, COALESCE(SUM("creditIssued"), 0) AS credit_issued FROM bookings WHERE "clubId" = '${c}' AND status = 'CANCELLED' AND ("cancelledAt" AT TIME ZONE 'UTC' AT TIME ZONE '${tz}')::date >= date_trunc('week', (now() AT TIME ZONE '${tz}'))::date`,
      chart: { kind: "none", x: "", y: "credit_issued", yIsPaise: true },
      summaryTemplate: "{{first.cancelled}} bookings were cancelled this week and {{first.credit_issued}} of credit was issued.",
    }),
  },
  {
    match: /bar items|top.*bar/i,
    plan: (c) => ({
      sql: `SELECT i.name AS item, SUM(i.qty) AS qty, SUM(i.qty * i."unitPrice") AS revenue FROM bar_tab_items i JOIN bar_tabs t ON t.id = i."tabId" WHERE t."clubId" = '${c}' AND t.status = 'SETTLED' AND t."settledAt" >= now() - interval '30 days' GROUP BY i.name ORDER BY revenue DESC LIMIT 10`,
      chart: { kind: "bar", x: "item", y: "revenue", yIsPaise: true },
      summaryTemplate: "Top bar item in the last 30 days is {{first.item}} at {{first.revenue}} ({{first.qty}} sold).",
    }),
  },
  {
    match: /expir/i,
    plan: (c) => ({
      sql: `SELECT m."memberCode" AS code, m."firstName" || ' ' || m."lastName" AS member, p.name AS plan, m."expiryDate"::date AS expires_on FROM members m LEFT JOIN membership_plans p ON p.id = m."planId" WHERE m."clubId" = '${c}' AND m.status = 'ACTIVE' AND m."expiryDate" BETWEEN now() AND now() + interval '14 days' ORDER BY m."expiryDate"`,
      chart: { kind: "none", x: "", y: "", yIsPaise: false },
      summaryTemplate: "{{row_count}} active memberships expire in the next 14 days; the soonest is {{first.member}} on {{first.expires_on}}.",
    }),
  },
  {
    match: /staff hours|hours per day|attendance/i,
    plan: (c, tz) => ({
      sql: `SELECT e.department, ROUND(AVG(a.minutes) / 60.0, 1) AS avg_hours_per_shift, COUNT(*) AS shifts FROM attendance a JOIN employees e ON e.id = a."employeeId" WHERE a."clubId" = '${c}' AND e."clubId" = '${c}' AND a.minutes IS NOT NULL AND a.date >= to_char(date_trunc('month', (now() AT TIME ZONE '${tz}')), 'YYYY-MM-DD') GROUP BY e.department ORDER BY avg_hours_per_shift DESC`,
      chart: { kind: "bar", x: "department", y: "avg_hours_per_shift", yIsPaise: false },
      summaryTemplate: "{{first.department}} averages {{first.avg_hours_per_shift}} hours per shift this month; {{row_count}} departments clocked in.",
    }),
  },
];

function cannedPlan(clubId: string, question: string, tz: string): Plan | null {
  const hit = CANNED.find((c) => c.match.test(question));
  return hit ? hit.plan(clubId, tz) : null;
}

function isGroqMissingOrInvalid(e: unknown) {
  return /GROQ_API_KEY is not set|Unauthorized|401/i.test(e instanceof Error ? e.message : String(e));
}

export async function ask(clubId: string, question: string, timezone: string): Promise<AskResult> {
  const started = Date.now();
  let plan: Plan;
  let viaFallback = false;
  try {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set. Get one for free at console.groq.com");

    const systemPrompt = [
      "You are the analytics engine for a sports club management system (Postgres).",
      `Club id: '${clubId}'. Club timezone: ${timezone}. Today is ${new Date().toISOString().slice(0, 10)}.`,
      "Write exactly one SELECT. Every table you touch must be filtered with \"clubId\" = the club id literal.",
      "Quote camelCase identifiers with double quotes. Use timezone-aware date math: (\"createdAt\" AT TIME ZONE 'UTC' AT TIME ZONE '" + timezone + "')::date.",
      "Revenue = transactions with direction = 'IN'. Net = IN minus OUT. Prefer the transactions table for any money question.",
      "Never divide paise by 100; the UI formats money. Keep result sets small (aggregate, LIMIT 200).",
      "Schema:",
      CATALOGUE,
      "You MUST return ONLY valid JSON matching this exact schema:",
      `{
  "sql": "string (One PostgreSQL SELECT. Must filter every table on clubId = the given club id literal. Money columns are integer paise. Alias output columns with short snake_case names.)",
  "chart": {
    "kind": "bar" | "line" | "none",
    "x": "string (alias of the category/time column)",
    "y": "string (alias of the numeric column)",
    "yIsPaise": true|false
  },
  "summaryTemplate": "string (One sentence answering the question in plain English, using {{row_count}} and {{first.<alias>}} placeholders where useful.)"
}`
    ].join("\n");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq API error: ${await res.text()}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new AskError("The model returned no plan.", "MODEL");
    
    plan = planSchema.parse(JSON.parse(content));
  } catch (e) {
    if (e instanceof AskError) throw e;
    const canned = isGroqMissingOrInvalid(e) ? cannedPlan(clubId, question, timezone) : null;
    if (!canned) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new AskError(isGroqMissingOrInvalid(e) ? "Groq API key is missing or invalid. Add GROQ_API_KEY to your .env file." : msg, "MODEL");
    }
    plan = canned;
    viaFallback = true;
  }

  const sql = guardSql(plan.sql, clubId);
  let rows: Record<string, unknown>[];
  try {
    rows = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '4000ms'");
        return tx.$queryRawUnsafe<Record<string, unknown>[]>(sql);
      },
      { timeout: 6000 },
    );
  } catch (e) {
    throw new AskError(`Query failed: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`, "DB");
  }

  // Normalise driver types: bigint (COUNT), Decimal/numeric (ROUND, AVG) and Date → plain JSON.
  rows = rows.map((r) =>
    Object.fromEntries(
      Object.entries(r).map(([k, v]) => {
        if (typeof v === "bigint") return [k, Number(v)];
        if (v instanceof Date) return [k, v.toISOString()];
        if (v !== null && typeof v === "object" && "toNumber" in v && typeof (v as { toNumber: unknown }).toNumber === "function") return [k, (v as { toNumber: () => number }).toNumber()];
        if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) return [k, Number(v)];
        return [k, v];
      }),
    ),
  );
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  const first = rows[0] ?? {};
  const answer = plan.summaryTemplate
    .replace(/\{\{\s*row_count\s*\}\}/g, String(rows.length))
    .replace(/\{\{\s*first\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, k: string) => {
      const v = first[k];
      if (v == null) return "—";
      if (typeof v === "number" && (plan.chart.yIsPaise && k === plan.chart.y || /revenue|amount|total|credit|price|net|salary/i.test(k))) return `₹${(v / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
      return String(v);
    });

  const chartOk = plan.chart.kind !== "none" && columns.includes(plan.chart.x) && columns.includes(plan.chart.y) && rows.length > 1;
  return { answer, sql, rows, columns, chart: chartOk ? plan.chart : null, ms: Date.now() - started, viaFallback };
}

export { SUGGESTED_QUESTIONS } from "@/lib/ask/labels";
