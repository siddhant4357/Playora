# Yolla — Sports Club Management System

**Odoo Hackathon submission.** One kernel, seven roles, every rupee in one ledger.

Yolla runs a multi-sport club end to end: court booking, memberships, bar & cafeteria POS with a kitchen display, pro shop with click-and-collect, finance (invoices, payables, GST), HR (rota, attendance, leave, payroll), a WhatsApp / voice booking agent, and a plain-English analytics console for the owner. Built for **The Champions Club** (demo tenant) but multi-tenant by design — every row carries a `clubId`.

- Full product spec and data model: [`CONTEXT.md`](./CONTEXT.md)
- Build order and architecture decisions: [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md)
- Integration setup (Twilio, Vapi, AI Gateway, email): [`SETUP.md`](./SETUP.md)

---

## Why it is built like Odoo

| Odoo principle | How Yolla applies it |
| --- | --- |
| Modules on one kernel | `lib/kernel/` owns stock movement (row-locked), ledger posting, activity log and document numbering. Booking, bar, shop, finance and HR engines call into it instead of touching tables directly. |
| One contact record | A `Member` is the same person at the front desk, the bar tab, the shop order, the WhatsApp agent and the member app. Discounts, credit and plan status follow them everywhere. |
| One ledger | Every court fee, tab settlement, shop sale, invoice payment, payable and payroll run is a `Transaction` row. Owner dashboards, tax reports and Ask AI all read from the same place. |
| Multi-tenant | Every model has `clubId`; every server action and SQL query is scoped by it. |
| Auditability | `logActivity` records who did what, when — including every Ask AI question. |

---

## Modules

| Module | Routes | Highlights |
| --- | --- | --- |
| **Public website** | `/`, `/courts`, `/plans`, `/shop`, `/shop/[sku]`, `/trial`, `/contact` | Landing with hand-drawn doodle layers, live court availability, trial booking, public catalogue with click-and-collect or delivery |
| **Auth & roles** | `/login`, `/register`, `/forgot-password`, `/app` | `jose` JWT in HttpOnly cookie, bcrypt, 7 roles (`OWNER MANAGER FRONT_DESK BAR_STAFF KITCHEN COACH MEMBER`), `requireRole`, `/app` routes each role to its home |
| **Booking engine** | `/me/book`, `/me/bookings`, `/desk` | Postgres `EXCLUDE USING gist` constraint makes double booking impossible under concurrency; peak/off-peak pricing, plan discounts, cancellation policy that issues credit |
| **Members** | `/desk/members`, `/desk/members/[id]`, `/desk/checkin`, `/desk/leads` | Member 360, QR check-in, leads → quotes (`/print/quote/[leadId]`) → conversion |
| **Bar & cafeteria** | `/bar/pos`, `/bar/tabs`, `/bar/kds`, `/bar/menu`, `/bar/shift`, `/t/[token]` | Tabs, split payments, kitchen display, shift open/close with cash reconciliation, guest QR ordering |
| **Pro shop** | `/shop-pos`, `/shop-pos/orders`, `/shop-pos/inventory`, `/shop-pos/services`, `/me/shop`, `/me/orders` | Counter sales, online orders (stock reserved at PAID), fulfilment pipeline, stock adjustments, restringing / regrip service jobs |
| **Finance** | `/owner`, `/owner/finance`, `/owner/invoices`, `/owner/payables`, `/owner/tax`, `/owner/reports`, `/print/invoice/[id]`, `/r/[token]` | Revenue by source vs previous period, court heatmap, invoices, payables, CGST/SGST report, CSV export, tokenised shareable reports |
| **HR** | `/desk/shifts`, `/owner/hr`, `/owner/hr/leave`, `/owner/hr/payroll`, `/print/payslip/[id]` | Rota, clock in/out, leave approvals, payroll generate → approve → pay (posts to ledger) |
| **Agents** | `/api/webhooks/twilio`, `/api/vapi/tools` | WhatsApp and voice booking via shared AI SDK tools (`checkAvailability`, `book`, `myBookings`, `cancel`); caller recognised by phone |
| **Ask AI** | `/owner/ask` | Natural language → guarded read-only SQL (allow-listed tables, forced `clubId`, 4 s timeout) → answer + chart + "Show SQL"; vetted offline plans for the suggested questions |

---

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Prisma 7 + Postgres · `jose` JWT · bcryptjs · zod · Tailwind v4 + vanilla CSS tokens · shadcn (base-nova) · Lucide · Recharts · Vercel AI SDK · Nodemailer · Twilio · Vapi

Money is stored as integer paise (`lib/money.ts`); club-local time is handled in `lib/time.ts`.

---

## Run locally

```bash
pnpm install
cp .env.example .env            # or set the variables below
npx prisma migrate deploy
npx tsx prisma/seed.ts          # idempotent — safe to re-run
pnpm dev
```

Required: `DATABASE_URL`, `JWT_SECRET`. Optional (email, WhatsApp, voice, AI): see [`SETUP.md`](./SETUP.md).

### Demo accounts

All passwords are `demo1234`.

| Role | Email | Lands on |
| --- | --- | --- |
| Owner | `owner@champions.club` | `/owner` |
| Manager | `manager@champions.club` | `/desk` |
| Front desk | `desk@champions.club` | `/desk` |
| Bar staff | `bar@champions.club` | `/bar/pos` |
| Kitchen | `kitchen@champions.club` | `/bar/kds` |
| Coach | `coach@champions.club` | `/coach` |
| Member | `member@champions.club` | `/me` |

The seed also creates ~20 members with phone numbers (for the WhatsApp/voice agent), six weeks of ledger history, courts, plans, products with catalogue images, employees, rota and payables.

---

## Tests

Integration tests run against the live database and exercise the engines end to end, including a parallel race on the booking constraint.

```bash
npx tsx scripts/test-booking-engine.ts   # 16 checks
npx tsx scripts/test-bar-engine.ts       # 29 checks
npx tsx scripts/test-shop-engine.ts      # 30 checks
npx tsx scripts/test-hr-engine.ts
npx tsx scripts/test-ask-guard.ts        # 16 checks — SQL guard + READ ONLY tx
npx tsx scripts/test-ask-canned.ts       # the 6 offline analytics plans
```

---

## Repository layout

```
app/
  (public)/   website, catalogue, trial
  (auth)/     login, register, reset
  (member)/   /me/* member app
  (staff)/    /desk /bar /shop-pos /owner /coach shells
  api/        twilio + vapi webhooks, cron
  print/      invoice, payslip, quote
components/   per-module UI (booking, bar, shop, owner, members, public, shared)
lib/
  kernel/     stock, ledger, activity log, doc numbers
  booking/ bar/ shop/ finance/ hr/   domain engines + queries
  agent/      shared AI tools and WhatsApp runner
  ask/        NL → SQL engine and guard
  actions/    server actions (thin, role-checked)
prisma/       schema, migrations, seed
scripts/      integration tests and maintenance
```

---

## Known limits

- Online payments are simulated (`paymentMode: ONLINE`, no gateway).
- The WhatsApp agent and model-written Ask AI queries need Vercel AI Gateway enabled on the team; until then the agent replies with a front-desk fallback and Ask AI uses the vetted plans.
- Email uses Gmail SMTP via Nodemailer; without `GMAIL_USER`/`GMAIL_APP_PASSWORD` notifications fall through to in-app only.
