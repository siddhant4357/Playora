# Playora — Sports Club Management System

> **Odoo Hackathon Submission** · One kernel, seven roles, every rupee in one ledger.

Playora is a full ERP for sports clubs — court booking, memberships, bar & cafeteria POS with a kitchen display, pro shop, finance (invoices, payables, GST), HR (rota, attendance, leave, payroll), a WhatsApp/voice booking agent, and a plain-English analytics console for the owner.

Built for **The Champions Club** (demo tenant) but **multi-tenant by design** — every row carries a `clubId`.

- Full product spec & data model: [`CONTEXT.md`](./CONTEXT.md)
- Integration setup (Twilio, Vapi, email): [`SETUP.md`](./SETUP.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router + Server Actions) |
| **Language** | TypeScript |
| **Database** | PostgreSQL (local) via `@prisma/adapter-pg` |
| **ORM** | Prisma v7 |
| **Auth** | `jose` JWT in HttpOnly cookie + bcryptjs |
| **Validation** | Zod |
| **Styling** | Tailwind v4 + Vanilla CSS tokens |
| **UI Components** | shadcn/ui (base-nova) + Lucide icons |
| **Charts** | Recharts |
| **AI / Voice** | Vercel AI SDK · Vapi |
| **Notifications** | Twilio WhatsApp · Nodemailer (Gmail) |

> Money is stored as **integer paise** (`lib/money.ts`). Club-local time is handled in `lib/time.ts`.

---

## Why It's Built Like Odoo

| Odoo Principle | How Playora Applies It |
|---|---|
| **Modules on one kernel** | `lib/kernel/` owns stock movement, ledger posting, activity log and doc numbering. All engines call into it. |
| **One contact record** | A `Member` is the same person at the front desk, the bar tab, the shop order, and the member app. Discounts follow them everywhere. |
| **One ledger** | Every court fee, tab, shop sale, invoice, payable and payroll run is a single `Transaction` row. |
| **Multi-tenant** | Every model has `clubId`; every server action is scoped by it. |
| **Auditability** | `logActivity` records who did what, when — including every Ask AI question. |

---

## Modules

| Module | Routes | Highlights |
|---|---|---|
| **Public website** | `/`, `/courts`, `/plans`, `/shop`, `/trial`, `/contact` | Landing page, live court availability, trial booking, public shop catalogue |
| **Auth & roles** | `/login`, `/register`, `/forgot-password` | 7 roles, JWT cookie, bcrypt, middleware enforces role-based routing |
| **Booking engine** | `/me/book`, `/me/bookings`, `/desk` | PostgreSQL `EXCLUDE USING gist` makes double-booking **impossible**; peak/off-peak pricing + plan discounts |
| **Members** | `/desk/members`, `/desk/checkin`, `/desk/leads` | Member 360-view, QR check-in, leads → quotes → conversion |
| **Bar & cafeteria** | `/bar/pos`, `/bar/kds`, `/bar/menu`, `/bar/shift` | Tabs, split payments, kitchen display system, shift reconciliation, guest QR ordering |
| **Pro shop** | `/shop-pos`, `/shop-pos/orders`, `/me/shop` | Counter sales, online orders (stock reserved at PAID), service jobs (restringing, regrip) |
| **Finance** | `/owner/finance`, `/owner/invoices`, `/owner/tax`, `/owner/reports` | Revenue by source, court heatmap, GST report, CSV export, shareable tokenised reports |
| **HR** | `/owner/hr`, `/owner/hr/leave`, `/owner/hr/payroll` | Rota, clock-in/out, leave approvals, payroll → payslip PDF |
| **AI Agents** | `/api/webhooks/twilio`, `/api/vapi/tools` | WhatsApp & voice booking agent via shared AI tools |
| **Ask AI** | `/owner/ask` | Natural language → guarded read-only SQL → answer + chart |

---

## Run Locally

### Prerequisites
- Node.js 18+
- PostgreSQL installed locally ([download here](https://www.postgresql.org/download/windows/))

### Setup

```bash
# 1. Clone and install dependencies
npm install

# 2. Create a PostgreSQL database
# Open SQL Shell (psql) and run:
#   CREATE DATABASE playora;

# 3. Copy env file and fill in your values
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/playora"
JWT_SECRET="any-long-random-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional — email notifications
GMAIL_USER="your@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"
```

```bash
# 4. Apply database migrations
npx prisma migrate deploy

# 5. Seed the database with demo data
npx prisma db seed

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Accounts

> **All accounts use the password:** `demo1234`

| Role | Email | Redirects To | What They See |
|---|---|---|---|
| 👑 **Owner** | `owner@champions.club` | `/owner` | Full financial dashboard, HR, Ask AI, all reports |
| 👔 **Manager** | `manager@champions.club` | `/desk` | Same as Front Desk + staff management |
| 🛎️ **Front Desk** | `desk@champions.club` | `/desk` | Member 360, check-in, bookings, leads |
| 🍺 **Bar Staff** | `bar@champions.club` | `/bar/pos` | POS, tabs, open/close shift |
| 🍳 **Kitchen** | `kitchen@champions.club` | `/bar/kds` | Kitchen Display System (KDS) — order queue |
| 🎾 **Coach** | `coach@champions.club` | `/coach` | Schedule, session management |
| 👤 **Member** | `member@champions.club` | `/me` | Book courts, shop online, view orders |

---

## Seed Data (what's in the database after `npx prisma db seed`)

| Data | Count |
|---|---|
| Club | 1 (The Champions Club) |
| Users (demo accounts) | 7 (one per role) |
| Membership Plans | 3 (Gold ₹5,000/mo · Silver ₹2,500/mo · Junior ₹1,200/mo) |
| Courts | 6 (4 Tennis · 2 Padel) with peak/off-peak/weekend pricing |
| Members | 10 (mix of Gold/Silver/Junior/Trial/Lead status) |
| Products | 28 (rackets, shoes, apparel, accessories, beverages) |
| Bar Tables | 9 |
| Leads | 6 (in various kanban stages) |
| Ledger history | ~2,159 historical transactions |
| Invoices | 4 |
| Payables | 6 |
| Employees | 5 (with rota, attendance, leave records) |

---

## Integration Scripts (Tests)

```bash
npx tsx scripts/test-booking-engine.ts   # 16 checks — including double-booking race
npx tsx scripts/test-bar-engine.ts       # 29 checks
npx tsx scripts/test-shop-engine.ts      # 30 checks
npx tsx scripts/test-hr-engine.ts
npx tsx scripts/test-ask-guard.ts        # 16 checks — SQL injection guard
npx tsx scripts/test-ask-canned.ts       # Offline analytics plans
```

---

## Repository Layout

```
app/
  (public)/    website, catalogue, trial booking
  (auth)/      login, register, forgot-password
  (member)/    /me/* — member app
  (staff)/     /desk /bar /shop-pos /owner /coach
  api/         twilio + vapi webhooks, cron jobs
  print/       invoice, payslip, quote print views
components/    per-module UI (booking, bar, shop, owner, members, hr, shared)
lib/
  kernel/      stock, ledger, activity log, doc numbers
  booking/     booking engine + queries
  bar/         bar engine + queries
  shop/        shop engine + queries
  finance/     finance engine + queries
  hr/          HR engine + queries
  agent/       shared AI booking tools + WhatsApp runner
  ask/         Natural language → SQL engine + guard
  actions/     server actions (thin, role-checked wrappers)
prisma/        schema.prisma, migrations/, seed.ts
scripts/       integration tests + maintenance scripts
public/        images, product photos, logos
```

---

## Integrations

| Service | Purpose | Default |
|---|---|---|
| Twilio WhatsApp | AI booking agent via WhatsApp | `WHATSAPP_ENABLED=false` |
| Vapi | Voice booking agent (web widget) | `VAPI_ENABLED=false` |
| Nodemailer | Email notifications | Needs `GMAIL_USER` + `GMAIL_APP_PASSWORD` |
| Vercel AI SDK | Ask AI + agent tools | Needs AI Gateway key |

> **Dev safety:** `WHATSAPP_ENABLED` and `VAPI_ENABLED` default to `false` so no quota is ever consumed accidentally during development.

---

## Known Limits

- Online payments are simulated (`paymentMode: ONLINE`, no payment gateway integrated).
- WhatsApp & voice agents need `WHATSAPP_ENABLED=true` / `VAPI_ENABLED=true` and their respective API keys.
- Email falls back to in-app notification only if Gmail credentials are not set.
- Twilio sandbox has a ~100 message limit; all demo phones must opt-in by texting `join <sandbox-code>`.
