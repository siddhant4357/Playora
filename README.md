<p align="center">
  <img src="./public/playora-logo-transparent.png" alt="Playora" width="160" />
</p>

<h1 align="center">Playora — Sports Club Management Platform</h1>

---

Playora is a full-stack ERP built exclusively for sports clubs — court booking, memberships, a bar & cafeteria POS with a live kitchen display, pro shop, complete finance (invoices, payables, GST), HR (rota, attendance, leave, payroll), and a plain-English analytics console for the owner.

Built for **The Champions Club** (demo tenant), but **multi-tenant by design** — every row carries a `clubId`.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│          MEMBER / GUEST (Browser)                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NEXT.JS 15 APP ROUTER                          │
│  • Server Actions (role-checked, Zod-validated)                 │
│  • RSC pages — /me /desk /bar /shop-pos /owner /coach           │
│  • Middleware — JWT edge auth + role-based routing              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│ LIB/KERNEL   │  │  AI LAYER    │  │  INTEGRATION LAYER       │
│ • Ledger     │  │ • Ask AI     │  │  • Nodemailer (Gmail)    │
│ • Stock Mvmt │  │   NL→SQL     │  └──────────────────────────┘
│ • Doc Nums   │  │   (Groq LLM) │  
│ • Activity   │  └──────────────┘  
│   Log        │                    
└──────┬───────┘                    
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│           POSTGRESQL  ·  Prisma v7  ·  Multi-tenant             │
│  Booking (GIST exclusion constraint)  ·  Integer-paise ledger   │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ What Makes It Special

| Odoo Principle | How Playora Applies It |
|---|---|
| **Modules on one kernel** | `lib/kernel/` owns stock movement, ledger posting, activity log and doc numbering. All engines call into it. |
| **One contact record** | A `Member` is the same person at the front desk, the bar tab, the shop order and the member app. Discounts follow them everywhere. |
| **One ledger** | Every court fee, tab, shop sale, invoice, payable and payroll run is a single `Transaction` row. |
| **Multi-tenant** | Every model carries `clubId`; every server action is scoped by it. |
| **Auditability** | `logActivity` records who did what, when — including every Ask AI question. |

---

## 🚀 Key Features

### 🎾 Court Booking Engine
Live real-time availability with PostgreSQL `EXCLUDE USING gist` — double-booking is **structurally impossible**. Peak / off-peak / weekend pricing, plan discounts, and guest walk-in support built in.

### 🍺 Bar & Cafeteria POS + Kitchen Display
Full tab management with split payments. Food items auto-route to the **Kitchen Display System (KDS)** in real time. Bar staff see beverage orders instantly; chefs see food tickets the moment they are sent.

### 🛍️ Pro Shop
Counter sales, member online ordering (stock reserved at `PAID`), and service jobs (racket restringing, regrip) — all flowing through the same kernel ledger.

### 💰 Finance & GST
Revenue-by-source dashboard, court utilisation heatmap, GST output tax report, CSV ledger export, and tokenised shareable reports you can hand straight to your accountant.

### 👥 HR & Payroll
Rota builder, QR clock-in/out attendance, leave approvals workflow, payroll generation → payslip PDF — all without re-entering hours already tracked by attendance.

### 🤖 Ask Playora (AI Analytics)
Owner types a plain-English question → Groq LLM generates a guarded, read-only SQL query → live result + chart. Common questions have offline fallback "canned plans" so the AI answers even without a live API key.


---

## 🖥️ Modules at a Glance

| Module | Routes | Highlights |
|---|---|---|
| **Public website** | `/`, `/courts`, `/plans`, `/shop`, `/trial` | Landing page, live availability, trial booking, public catalogue |
| **Auth & roles** | `/login`, `/register`, `/forgot-password` | 7 roles, JWT cookie, bcrypt, middleware enforces RBAC |
| **Booking engine** | `/me/book`, `/me/bookings`, `/desk` | GIST exclusion, peak pricing, plan discounts, walk-in support |
| **Members** | `/desk/members`, `/desk/checkin`, `/desk/leads` | Member 360-view, QR check-in scanner, leads → quotes → conversion |
| **Bar & cafeteria** | `/bar/pos`, `/bar/kds`, `/bar/menu`, `/bar/shift` | Tabs, split pay, live KDS, shift reconciliation, guest QR ordering |
| **Pro shop** | `/shop-pos`, `/shop-pos/orders`, `/me/shop` | Counter & online sales, stock reservations, service jobs |
| **Finance** | `/owner/finance`, `/owner/invoices`, `/owner/tax` | Revenue heatmap, GST report, CSV export, shareable token links |
| **HR** | `/owner/hr`, `/owner/hr/leave`, `/owner/hr/payroll` | Rota, clock-in/out, leave approvals, payroll → payslip PDF |
| **Ask AI** | `/owner/ask` | Natural language → guarded read-only SQL → answer + chart |

---

## 📸 Screenshots

### 👑 Owner Dashboard

![Owner Dashboard](./public/Screenshots/owner-1.png)

---

### 👤 Member App

| | |
|---|---|
| ![Member Home](./public/Screenshots/user-1.png) | ![Member Book](./public/Screenshots/user-2.png) |
| ![Member Shop](./public/Screenshots/user-3.png) | ![Member Tab](./public/Screenshots/user-4.png) |

---

### 🛎️ Front Desk

| | |
|---|---|
| ![Front Desk Today](./public/Screenshots/fd-1.png) | ![Front Desk Members](./public/Screenshots/fd-2.png) |
| ![Front Desk Bookings](./public/Screenshots/fd-3.png) | ![Front Desk Leads](./public/Screenshots/fd-4.png) |

---

### 🍺 Bar POS

![Bar POS](./public/Screenshots/bar-1.png)

---

### 🍳 Kitchen Display

![Kitchen Display](./public/Screenshots/kitchen-1.png)

---

### 🎾 Coach

![Coach Schedule](./public/Screenshots/coach-1.png)

---

### 👔 Manager

| | |
|---|---|
| ![Manager Overview](./public/Screenshots/mg-1.png) | ![Manager HR](./public/Screenshots/mg-2.png) |
| ![Manager Payroll](./public/Screenshots/mg-3.png) | ![Manager Staff](./public/Screenshots/mg-4.png) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router + Server Actions) |
| **Language** | TypeScript |
| **Database** | PostgreSQL via `@prisma/adapter-pg` |
| **ORM** | Prisma v7 |
| **Auth** | `jose` JWT in HttpOnly cookie + bcryptjs |
| **Validation** | Zod |
| **Styling** | Tailwind v4 + Vanilla CSS tokens |
| **UI Components** | shadcn/ui (base-nova) + Lucide icons |
| **Charts** | Recharts |
| **AI / LLM** | Groq API (qwen3.8-27b) |
| **Notifications** | Nodemailer (Gmail) |

> Money is stored as **integer paise** (`lib/money.ts`). Club-local time is handled in `lib/time.ts`.

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL installed locally ([download](https://www.postgresql.org/download/windows/))
- A Groq API key ([console.groq.com](https://console.groq.com))

### 1. Clone & Install

```bash
npm install
```

### 2. Create the Database

Open psql and run:
```sql
CREATE DATABASE playora;
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/playora"
JWT_SECRET="any-long-random-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI (required for Ask Playora)
GROQ_API_KEY="gsk_..."

# Optional — email notifications
GMAIL_USER="your@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"
```

### 4. Migrate, Seed & Run

```bash
npx prisma migrate deploy   # Apply schema migrations
npx prisma db seed           # Seed demo data
npm run dev                  # Start on http://localhost:3000
```

---

## 👤 Demo Accounts

> **All accounts use the password:** `demo1234`

| Role | Email | Home | Access |
|---|---|---|---|
| 👑 **Owner** | `owner@champions.club` | `/owner` | Full financial dashboard, HR, Ask AI, all reports |
| 👔 **Manager** | `manager@champions.club` | `/desk` | Front desk + HR & payroll management |
| 🛎️ **Front Desk** | `desk@champions.club` | `/desk` | Member 360, check-in, bookings, leads |
| 🍺 **Bar Staff** | `bar@champions.club` | `/bar/pos` | POS, tabs, open/close shift |
| 🍳 **Kitchen** | `kitchen@champions.club` | `/bar/kds` | Kitchen Display System — live order queue |
| 🎾 **Coach** | `coach@champions.club` | `/coach` | Schedule, session management |
| 👤 **Member** | `member@champions.club` | `/me` | Book courts, shop online, view tab & orders |

---

## 🗄️ Seed Data

What is in the database after `npx prisma db seed`:

| Data | Count |
|---|---|
| Club | 1 (The Champions Club) |
| Users (demo accounts) | 7 (one per role) |
| Membership Plans | 3 (Gold ₹9,999/mo · Silver ₹2,500/mo · Junior ₹1,200/mo) |
| Courts | 6 (4 Tennis · 2 Padel) with peak/off-peak/weekend pricing |
| Members | 10 (mix of Gold/Silver/Junior/Trial/Lead) |
| Products | 28 (rackets, shoes, apparel, accessories, beverages, food) |
| Bar Tables | 9 |
| Leads | 6 (in various Kanban stages) |
| Ledger history | ~2,159 historical transactions |
| Invoices | 4 |
| Payables | 6 |
| Employees | 5 (with rota, attendance, leave records) |

---

## 🧪 Integration Tests

```bash
npx tsx scripts/test-booking-engine.ts   # 16 checks — including double-booking race condition
npx tsx scripts/test-bar-engine.ts       # 29 checks — tab lifecycle, kitchen routing, split pay
npx tsx scripts/test-shop-engine.ts      # 30 checks — stock reservation, service jobs
npx tsx scripts/test-hr-engine.ts        # Rota, attendance, leave, payroll pipeline
npx tsx scripts/test-ask-guard.ts        # 16 checks — SQL injection guard
npx tsx scripts/test-ask-canned.ts       # Offline analytics fallback plans
```

---

## 📁 Repository Layout

```
app/
  (public)/    website, catalogue, trial booking
  (auth)/      login, register, forgot-password
  (member)/    /me/* — member app (booking, shop, tab, profile)
  (staff)/     /desk /bar /shop-pos /owner /coach
  api/         cron jobs
  print/       invoice, payslip, quote print views

components/    per-module UI (booking, bar, shop, owner, members, hr, shared)

lib/
  kernel/      stock, ledger, activity log, doc numbers
  booking/     booking engine + queries
  bar/         bar engine + queries
  shop/        shop engine + queries
  finance/     finance engine + queries
  hr/           HR engine + queries
  agent/       shared AI booking tools
  ask/         natural language → SQL engine + guard
  actions/     server actions (thin, role-checked wrappers)

prisma/        schema.prisma, migrations/, seed.ts
scripts/       integration tests + maintenance scripts
public/        images, product photos, logos
```

---

## 🔌 Integrations

| Service | Purpose | Enabled By |
|---|---|---|
| **Nodemailer** | Email notifications | `GMAIL_USER` + `GMAIL_APP_PASSWORD` |
| **Groq API** | Ask Playora LLM (NL→SQL) | `GROQ_API_KEY` |


---

## ⚠️ Known Limits

- Online payments are simulated (`paymentMode: ONLINE`) — no payment gateway integrated.
- Email falls back to in-app notification if Gmail credentials are not set.

---

## 📜 License

MIT License — see [`LICENSE`](./LICENSE) for details.

---

## 🙏 Acknowledgments

- **[Odoo](https://odoo.com)** — for the architectural philosophy this project is inspired by.
- **[Groq](https://groq.com)** — for ultra-fast LLM inference powering Ask Playora.
- **[Prisma](https://prisma.io)** — for a world-class ORM and migration system.
