# LDXODOO — Sports Club Management System (Odoo Hackathon)
## Complete Project Context for AI-assisted end-to-end build

> **Purpose of this file:** This is the single source of truth for building this project. It contains the original problem statement, the product vision, the exact tech stack in place, the database schema, every page in the app with its features and flow, integrations, wow features, the build order, and the demo script. An AI agent reading this file should be able to build the entire project without asking clarifying questions. Where this file says "MUST", treat it as a hard requirement.

---

## 0. Current State of the Repo (what is ALREADY done — do not redo)

### ✅ Phase 0 — Foundation (Complete)

| Layer | Technology | Status |
|---|---|---|
| Framework | Next.js 15 (App Router), React 18+, TypeScript | ✅ Scaffolded & working |
| Styling | Vanilla CSS with CSS variables (`globals.css`), Lucide Icons | ✅ Done — dark/light mode synced across all pages |
| Database | PostgreSQL + Prisma ORM v7 (hosted on **Prisma Postgres** cloud — free tier) | ✅ Connected, migrations applied |
| Auth | `jose` (JWT in httpOnly cookie), `bcryptjs` (password hashing), `zod` (validation) | ✅ Done — register, login, logout, session, forgot/reset password |
| Email | Nodemailer (Gmail SMTP) | ✅ Done — used for password reset emails |
| Session | `getCurrentUser()` reads & verifies JWT from cookie. Every protected page calls it and redirects to `/login` if absent. | ✅ Done |
| Roles | `Role` enum: `ADMIN`, `MEMBER`. Checked server-side in middleware and server actions. | ✅ Basic roles done |
| Audit Log | `ActivityLog` model in DB tracks actions with old/new JSON snapshots, IP, userAgent | ✅ Schema done |

### ✅ Pages Built

| Route | Description | Status |
|---|---|---|
| `/` | Landing page — hero, features, value props, footer | ✅ Done (design only, placeholder content) |
| `/login` | Login form with validation | ✅ Done |
| `/register` | Registration form | ✅ Done |
| `/forgot-password` | Request password reset via email | ✅ Done |
| `/reset-password` | Reset password with token | ✅ Done |
| `/dashboard` | Main dashboard — stat cards, quick actions, recent activity | ✅ Done (UI scaffolded) |
| `/dashboard/settings` | User profile settings — name, DOB, gender, password reset link | ✅ Done |
| `/admin/health` | Admin-only system health page | ✅ Done |

### ✅ Database Schema (Current — actual schema in `prisma/schema.prisma`)

```prisma
model User {
  id           String    @id @default(cuid())
  hashId       Int       @unique @default(autoincrement())
  email        String    @unique
  passwordHash String
  name         String
  role         Role      @default(MEMBER)
  dob          DateTime? // optional profile field
  gender       String?   // optional profile field
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  activityLogs        ActivityLog[]
  passwordResetTokens PasswordResetToken[]
  @@map("users")
}

enum Role { ADMIN MEMBER }

model ActivityLog { ... }       // audit trail
model PasswordResetToken { ... } // for forgot-password flow
```

> **Note:** The full target schema (Section 5) describes the complete hackathon build. The current schema is only the auth foundation. New models will be added as phases progress.

### ✅ Conventions Already Established (continue these)
- All mutations are Server Actions in `lib/actions/`, validated with `zod`.
- Session is read with `getCurrentUser()` (`lib/auth.ts`). Uses `userId` field on the payload (NOT `id`).
- Prisma client is a singleton in `lib/db.ts`.
- Email goes through Nodemailer — reuse `lib/actions/password-reset.ts` as a pattern for all transactional email.
- CSS variables for theming defined in `app/globals.css`. Dark mode via `html.dark` class, toggled and persisted in `localStorage` under key `ldxodoo-theme`.
- `ThemeProvider` in `components/ThemeProvider.tsx` wraps the app and syncs theme across all pages.
- Shared dashboard layout in `components/shared/` — `Sidebar.tsx`, `Topbar.tsx`, `DashboardShell.tsx`, `CommandPalette.tsx`.

### ⚠️ Key Differences from Target Schema (Section 5)
- The target schema uses `clubId` (multi-tenant) — not yet added. Add it when building club-specific features.
- The target schema has `OWNER | MANAGER | FRONT_DESK | BAR_STAFF | KITCHEN | COACH | MEMBER` roles — currently only `ADMIN | MEMBER` exist. Extend the `Role` enum as each module is built.
- The landing page (`/`) has placeholder design content — copy/text is not final.

---

## 1. The Problem Statement (verbatim requirements from the Odoo Hackathon PDF)

### 1.1 The Challenge
Build **one unified software platform** that solves the real, day-to-day operational headaches of a modern sports club — the "digital backbone" of a thriving tennis, padel and badminton club. Each scene below is something that actually happens in an ordinary week; the system must make each of them easy.

### 1.2 Meet The Champions Club
- Busy club with **tennis and cricket courts** that members book.
- A **gear shop** selling rackets, balls, shoes, accessories and apparel.
- A **bar and cafeteria** serving food and drinks after matches.
- Member tiers: **Gold** (premium, full access), **Silver** (standard), **Junior** (under 18, discounted).
- A **front desk** handles walk-ins, phone calls and staff schedules.

### 1.3 How Things Run Today (the pain)
| Area | Today |
|---|---|
| Court bookings | Arranged over WhatsApp |
| Member lists | Kept in Excel sheets |
| Bar receipts | Written on paper |
| Court availability | Checked by phone calls |
| Revenue and operations | No visibility at all |

Result: the owner is losing money, members are frustrated, staff are overwhelmed.

### 1.4 A Week at the Club — the six scenes and their extracted requirements

#### Scene A — A new member walks in
PDF text: *"Someone signs up at the front desk. The club needs to know who they are, which plan they are on (Gold, Silver or Junior), and what that plan entitles them to, from court rates to discounts at the shop and the bar. Their membership will run out one day, and nobody should have to remember when. Whenever they turn up, any member of staff should be able to recognise them quickly and see their history with the club."*

Requirements:
- R-A1 Member registration at front desk with personal details.
- R-A2 Assign a plan: Gold / Silver / Junior. Plans define **court rate, shop discount, bar discount**.
- R-A3 Membership has a start and **expiry date**; system auto-reminds before expiry (nobody has to remember).
- R-A4 Any staff member can **instantly identify** a member (search by phone / name / QR) and see their **full history** (bookings, purchases, bar tabs, payments, notes).

#### Scene B — Booking a court on a busy evening
PDF text: *"It is 6 pm. Members are messaging the front desk, a walk-in is standing at the counter, and someone is on the phone asking what is free. Sessions last an hour, a new slot opens every half hour, and each member can play at most twice a day. Members pay less than walk-ins, or nothing at all, depending on their plan. Plans change, people cancel, and on Friday night the courts open up for social play where many people share one court. Through all of it, two people must never end up on the same court at the same time."*

Requirements:
- R-B1 Sessions are **60 minutes**; a new slot **starts every 30 minutes** (so slots overlap: 18:00–19:00, 18:30–19:30 …).
- R-B2 Each member can book **max 2 sessions per day**.
- R-B3 Pricing by plan: Gold = free, Silver = discounted, Junior = discounted, Walk-in = full price. Configurable per court type.
- R-B4 Plans can change mid-membership; price shown must reflect current plan at booking time.
- R-B5 Cancellation flow with configurable refund/credit rules.
- R-B6 **Friday social play**: a court is opened as a shared session where many members join one court (many-to-one booking).
- R-B7 **HARD INVARIANT: no two private bookings can overlap on the same court.** Must be enforced at the database level, not only in UI/JS.
- R-B8 Multiple booking channels: member self-service (web/PWA), front desk on behalf of member or walk-in, phone (voice agent — see integrations), WhatsApp.
- R-B9 Real-time availability view for staff ("what is free right now").

#### Scene C — Gearing up before a match (Shop)
PDF text: *"A member's racket string snaps ten minutes before play. Another wants new shoes and would rather order them from home and collect them at the club, or have them delivered. The club sells rackets, balls, shoes, accessories and apparel, and it should always know what is in stock and when something is running low. What a member buys at the counter and what they order from their sofa come from the same shelf."*

Requirements:
- R-C1 Product catalogue: categories rackets, balls, shoes, accessories, apparel; variants (size/colour/grip).
- R-C2 **Single inventory** shared between counter POS and online store (one stock number).
- R-C3 Low-stock threshold per product with alerts to manager.
- R-C4 Counter sale (POS) with member discount auto-applied.
- R-C5 Online order with fulfilment options **Click & Collect** or **Home Delivery**, with order status tracking.
- R-C6 Services like racket restringing as sellable items (service with turnaround time).

#### Scene D — After the match, at the bar
PDF text: *"Twenty people arrive at once. Orders are scribbled on paper, tabs get lost, and the kitchen keeps asking who ordered what. Members expect their discount without having to ask, and some would rather run a tab and settle up before they leave. Guests pay by cash, card or UPI. Staff work in shifts, tables need to be tracked, and at closing time the owner wants to know what the bar actually earned that day."*

Requirements:
- R-D1 Bar/cafeteria POS with menu, modifiers, table map.
- R-D2 **Open tabs** per table or per member; add items over time; settle at the end.
- R-D3 **Kitchen Display Screen (KDS)**: orders flow to kitchen with status (new → preparing → ready → served).
- R-D4 Member discount **auto-applied** by identifying the member on the tab.
- R-D5 Payment modes: **Cash, Card, UPI**; support split payments.
- R-D6 **Staff shifts**: who is on duty, clock in/out.
- R-D7 **End-of-day close (Z-report)**: bar revenue by payment mode, tabs open, voids, cash in drawer.

#### Scene E — A stranger finds the club online (Website + CRM)
PDF text: *"Someone searches for a place to play near them. Today the club has no website, so they never find it. If they could see the club, its plans and prices, what is free this week, and what the shop sells, they might book a trial session on the spot. When a visitor reaches out, that enquiry should not vanish. Someone at the club should hear about it, follow up, send a quote and, hopefully, welcome a new member."*

Requirements:
- R-E1 Public SEO-friendly website: club info, courts, plans & prices, **live availability this week**, shop catalogue.
- R-E2 **Book a trial session** directly from the website (creates a lead + a booking).
- R-E3 Enquiry/contact form → **Lead** record; staff get notified.
- R-E4 **Lead pipeline**: New → Contacted → Quote Sent → Trial Booked → Converted / Lost, with follow-up reminders.
- R-E5 Send a **quote** (PDF/email) from the lead; one-click **convert lead to member**.

#### Scene F — The owner, at the end of the month (Finance / HR / Reports)
PDF text: *"The owner sits down and asks a simple question: how much did we earn, from where, and what do we owe? Money arrives from courts, the shop and the bar, by card, cash and online, and today none of it is in one place. There are memberships and business clients to invoice, employees to pay, leave to approve, and taxes to report. The owner wants to see how the club is doing today, this week and this month, and to share the numbers when needed."*

Requirements:
- R-F1 **Single ledger**: every rupee from courts, shop, bar, memberships lands in one `Transaction` table with `source` and `paymentMode`.
- R-F2 Dashboard: revenue **by source × by payment mode**, for **today / this week / this month**, with comparisons.
- R-F3 **Invoicing**: membership invoices and B2B/corporate client invoices (e.g., company court block bookings), with GST.
- R-F4 **Payroll**: employees, salary, shifts worked → monthly payslip.
- R-F5 **Leave management**: request → approve/reject.
- R-F6 **Tax report**: GST collected by rate, exportable.
- R-F7 **Share reports**: export CSV/PDF, shareable link, scheduled WhatsApp/email summary.
- R-F8 "What do we owe?" → payables view: pending salaries, supplier bills, refunds due.

---

## 2. Product Vision & Why This Wins

**Name:** CourtOS — *the operating system for sports clubs.*
**One line:** Clubs run on WhatsApp and Excel. We give them Odoo for sport, in one login, one ledger, one member record.

**Odoo-style design philosophy (judges are from Odoo — mirror their thinking):**
1. **Everything is a module** sharing one kernel: Contacts (Member), Ledger (Transaction), Inventory, Notifications, Audit Log, Roles.
2. **One contact record.** Lead → trial → member → staff are states/roles on one `Person`, so front desk sees everything a human ever did at the club.
3. **One ledger.** A court booking, a racket sale, a bar tab and a membership renewal are all `Transaction` rows. The owner dashboard is a `GROUP BY`.
4. **Multi-tenant from day one.** Every table carries `clubId`. One deployment = SaaS for many clubs.
5. **Append-only audit.** Every mutation writes an `AuditLog` row (who, what, before, after).

**Odoo Hackathon judging criteria and how we hit each:**
| Criterion | How CourtOS answers |
|---|---|
| Technical implementation | DB-level exclusion constraint for double-booking, transactional POS, offline-capable POS queue, role-based server actions |
| Innovation | Voice agent books courts by phone, WhatsApp agent, social-play matchmaker, churn radar, natural-language owner analytics |
| Problem understanding | Every scene in the PDF maps to a page and a requirement ID (R-A1 … R-F8) |
| UI/UX | Role-based home screens, ≤2 taps for every operational action, tablet-first POS, phone-first owner app, consistent with landing page |
| Team collaboration | Module ownership per team member, PRs reviewed, commits from everyone |
| Dynamic data | Everything from Postgres via Prisma; realistic seed script |
| Validation | zod on every server action; DB constraints as the last line |

---

## 3. Tech Stack (final — build with exactly this)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js App Router, React 18+, TypeScript | Server Components by default; `"use client"` only for interactive widgets |
| Styling | Tailwind CSS, Lucide icons | Follow landing page tokens; define CSS variables in `globals.css` |
| ORM / DB | Prisma v7 + PostgreSQL | Exclusion constraint added via raw SQL in a migration (Prisma schema cannot express it) |
| Auth | jose JWT cookie + bcryptjs + zod (done) | Extend `User` with `role` and `clubId` |
| Server logic | Server Actions + Route Handlers (for webhooks and public APIs) | Twilio/Vapi webhooks need Route Handlers |
| Live data | SWR polling (2–5 s) for court grid, KDS, dashboard | Simple and reliable; upgrade to SSE later if time |
| Email | Nodemailer (done) | Reuse for receipts, reminders, quotes, reports |
| WhatsApp | **Twilio WhatsApp API** | Booking confirmations, reminders, order-ready pings, inbound WhatsApp booking agent |
| Voice | **Vapi** | Phone agent that checks availability and books courts via our API tools |
| AI | **Vercel AI SDK via AI Gateway** | NL → SQL analytics for owner, WhatsApp/voice intent handling, product descriptions |
| Payments | UPI/Card recorded manually in POS for hackathon; Razorpay stub for online orders | Payment gateway can be mocked; record mode and reference |
| PDF | `@react-pdf/renderer` or `pdf-lib` | Invoices, quotes, payslips, Z-reports |
| QR | `qrcode` npm | Member QR, table QR for ordering |
| PWA | `next-pwa` or manual manifest + service worker | Installable member app; offline queue for POS |
| Charts | Recharts | Dashboard |
| Deployment | Vercel + Neon/any Postgres | |

---

## 4. Roles & Access

| Role | Who | Home screen after login | Can access |
|---|---|---|---|
| `OWNER` | Club owner | `/owner` dashboard | Everything |
| `MANAGER` | Operations manager | `/desk` | Desk, bookings, members, shop, bar, HR, reports (no payroll approval) |
| `FRONT_DESK` | Reception | `/desk` | Members, bookings, leads, shop POS |
| `BAR_STAFF` | Bar/cafeteria | `/bar/pos` | Bar POS, tabs, tables, own shift |
| `KITCHEN` | Kitchen | `/bar/kds` | KDS only |
| `COACH` | Trainer | `/coach` | Own schedule, student list |
| `MEMBER` | Club member | `/me` | Own bookings, shop, bar tab, profile |
| `GUEST` | Not logged in | `/` | Public website, trial booking, enquiry |

Implementation: `User.role` enum. Middleware (`proxy.ts`/`middleware.ts`) redirects by role on `/app` entry. `requireRole()` inside every server action.

---

## 5. Database Schema (Prisma)

```prisma
// ---------- Tenant & People ----------
model Club {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  address     String?
  phone       String?
  email       String?
  gstin       String?
  timezone    String   @default("Asia/Kolkata")
  currency    String   @default("INR")
  openTime    String   @default("06:00")
  closeTime   String   @default("23:00")
  settings    Json     @default("{}")   // cancellation window, social play rules, etc.
  createdAt   DateTime @default(now())
  users       User[]
  members     Member[]
  courts      Court[]
  // ... relations to all other models
}

enum Role { OWNER MANAGER FRONT_DESK BAR_STAFF KITCHEN COACH MEMBER }

model User {                     // already exists — extend with role, clubId, memberId
  id           String   @id @default(cuid())
  clubId       String
  email        String   @unique
  passwordHash String
  name         String
  phone        String?
  role         Role     @default(MEMBER)
  memberId     String?  @unique
  member       Member?  @relation(fields: [memberId], references: [id])
  employee     Employee?
  resetToken   String?
  resetExpires DateTime?
  createdAt    DateTime @default(now())
  club         Club     @relation(fields: [clubId], references: [id])
}

enum PlanTier { GOLD SILVER JUNIOR }

model MembershipPlan {
  id               String   @id @default(cuid())
  clubId           String
  tier             PlanTier
  name             String
  priceMonthly     Int      // paise
  priceYearly      Int
  courtDiscountPct Int      // 100 = free courts
  shopDiscountPct  Int
  barDiscountPct   Int
  maxBookingsPerDay Int     @default(2)
  advanceBookingDays Int    @default(7)
  guestPassesPerMonth Int   @default(0)
  benefits         String[]
  isActive         Boolean  @default(true)
  members          Member[]
}

enum MemberStatus { LEAD TRIAL ACTIVE EXPIRED FROZEN CANCELLED }

model Member {                   // the single "contact" record (Odoo res.partner)
  id            String       @id @default(cuid())
  clubId        String
  memberCode    String       @unique     // CC-0001, printed on QR
  firstName     String
  lastName      String
  phone         String
  email         String?
  dateOfBirth   DateTime?
  gender        String?
  photoUrl      String?
  emergencyContact String?
  status        MemberStatus @default(LEAD)
  planId        String?
  plan          MembershipPlan? @relation(fields: [planId], references: [id])
  startDate     DateTime?
  expiryDate    DateTime?
  autoRenew     Boolean      @default(false)
  skillRating   Int          @default(3)   // 1-5, for social play matchmaking
  notes         String?
  tags          String[]
  qrToken       String       @unique @default(cuid())
  creditBalance Int          @default(0)   // paise, from cancellations
  createdAt     DateTime     @default(now())
  bookings      Booking[]
  transactions  Transaction[]
  tabs          BarTab[]
  orders        ShopOrder[]
  lead          Lead?
  user          User?
  @@index([clubId, phone])
  @@index([clubId, status])
}

// ---------- Courts & Booking ----------
enum CourtType { TENNIS CRICKET BADMINTON PADEL PICKLEBALL }
enum CourtSurface { HARD CLAY GRASS SYNTHETIC INDOOR }

model Court {
  id          String      @id @default(cuid())
  clubId      String
  name        String      // "Court 1"
  type        CourtType
  surface     CourtSurface?
  isIndoor    Boolean     @default(false)
  hasLights   Boolean     @default(true)
  capacity    Int         @default(4)
  isActive    Boolean     @default(true)
  pricing     CourtPricing[]
  bookings    Booking[]
}

model CourtPricing {
  id          String  @id @default(cuid())
  courtId     String
  court       Court   @relation(fields: [courtId], references: [id])
  dayType     String  // WEEKDAY | WEEKEND
  startHour   Int     // 6
  endHour     Int     // 17  (peak after 17)
  walkInPrice Int     // paise per 60 min
  label       String  // "Off-peak" / "Peak"
}

enum BookingKind   { PRIVATE SOCIAL COACHING MAINTENANCE TRIAL }
enum BookingStatus { CONFIRMED CANCELLED NO_SHOW COMPLETED WAITLISTED }
enum BookingSource { WEB APP FRONT_DESK PHONE WHATSAPP VOICE_AGENT }

model Booking {
  id           String        @id @default(cuid())
  clubId       String
  courtId      String
  court        Court         @relation(fields: [courtId], references: [id])
  memberId     String?       // null for walk-in
  member       Member?       @relation(fields: [memberId], references: [id])
  walkInName   String?
  walkInPhone  String?
  startsAt     DateTime
  endsAt       DateTime      // startsAt + 60 min
  kind         BookingKind   @default(PRIVATE)
  status       BookingStatus @default(CONFIRMED)
  source       BookingSource @default(WEB)
  priceCharged Int           // paise after plan discount
  listPrice    Int
  discountPct  Int           @default(0)
  transactionId String?
  participants SocialPlayParticipant[]   // for SOCIAL kind
  checkedInAt  DateTime?
  cancelledAt  DateTime?
  cancelReason String?
  createdById  String?       // staff user who created it
  createdAt    DateTime      @default(now())
  @@index([clubId, startsAt])
  @@index([courtId, startsAt])
  @@index([memberId, startsAt])
}

model SocialPlayParticipant {
  id        String  @id @default(cuid())
  bookingId String
  booking   Booking @relation(fields: [bookingId], references: [id])
  memberId  String
  joinedAt  DateTime @default(now())
  @@unique([bookingId, memberId])
}

model Waitlist {
  id        String   @id @default(cuid())
  clubId    String
  courtId   String?
  memberId  String
  startsAt  DateTime
  status    String   @default("WAITING") // WAITING | OFFERED | CONFIRMED | EXPIRED
  offeredAt DateTime?
  expiresAt DateTime?
  createdAt DateTime @default(now())
}

// ---------- Shop ----------
enum ProductCategory { RACKET BALL SHOES ACCESSORY APPAREL SERVICE FOOD BEVERAGE }

model Product {
  id          String   @id @default(cuid())
  clubId      String
  sku         String   @unique
  name        String
  description String?
  category    ProductCategory
  price       Int      // paise
  costPrice   Int?
  taxRatePct  Int      @default(18)
  imageUrl    String?
  isForBar    Boolean  @default(false)  // true = appears in bar POS menu
  isForShop   Boolean  @default(true)
  isService   Boolean  @default(false)  // restringing etc.
  trackStock  Boolean  @default(true)
  stockQty    Int      @default(0)      // SINGLE source of truth for counter + online
  lowStockAt  Int      @default(5)
  variants    ProductVariant[]
  isActive    Boolean  @default(true)
}

model ProductVariant {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id])
  name      String  // "Size 9 / Red"
  sku       String  @unique
  stockQty  Int     @default(0)
  priceDelta Int    @default(0)
}

model StockMovement {
  id        String   @id @default(cuid())
  clubId    String
  productId String
  variantId String?
  delta     Int      // +10 restock, -1 sale
  reason    String   // SALE | RESTOCK | ADJUSTMENT | RETURN | WASTAGE
  refId     String?  // order / tab id
  byUserId  String?
  createdAt DateTime @default(now())
}

enum OrderChannel { COUNTER ONLINE }
enum Fulfilment   { TAKEAWAY CLICK_COLLECT DELIVERY }
enum OrderStatus  { PENDING PAID PREPARING READY_FOR_PICKUP OUT_FOR_DELIVERY COMPLETED CANCELLED }

model ShopOrder {
  id            String       @id @default(cuid())
  clubId        String
  orderNo       String       @unique
  memberId      String?
  member        Member?      @relation(fields: [memberId], references: [id])
  guestName     String?
  guestPhone    String?
  channel       OrderChannel
  fulfilment    Fulfilment   @default(TAKEAWAY)
  deliveryAddress String?
  status        OrderStatus  @default(PENDING)
  subtotal      Int
  discount      Int          @default(0)
  tax           Int
  total         Int
  transactionId String?
  items         ShopOrderItem[]
  createdAt     DateTime     @default(now())
}

model ShopOrderItem {
  id        String    @id @default(cuid())
  orderId   String
  order     ShopOrder @relation(fields: [orderId], references: [id])
  productId String
  variantId String?
  name      String
  qty       Int
  unitPrice Int
  total     Int
}

// ---------- Bar & Cafeteria ----------
model BarTable {
  id        String   @id @default(cuid())
  clubId    String
  name      String   // "T1", "Patio 3"
  seats     Int      @default(4)
  zone      String?  // Indoor / Patio / Court-side
  qrToken   String   @unique @default(cuid())  // scan to order from phone
  isActive  Boolean  @default(true)
}

enum TabStatus { OPEN SETTLED VOID }

model BarTab {
  id          String    @id @default(cuid())
  clubId      String
  tabNo       String    @unique
  tableId     String?
  memberId    String?
  member      Member?   @relation(fields: [memberId], references: [id])
  guestName   String?
  status      TabStatus @default(OPEN)
  openedById  String
  openedAt    DateTime  @default(now())
  settledAt   DateTime?
  subtotal    Int       @default(0)
  discount    Int       @default(0)
  tax         Int       @default(0)
  total       Int       @default(0)
  items       BarTabItem[]
  payments    Payment[]
  shiftId     String?
}

enum KitchenStatus { NEW PREPARING READY SERVED CANCELLED }

model BarTabItem {
  id            String        @id @default(cuid())
  tabId         String
  tab           BarTab        @relation(fields: [tabId], references: [id])
  productId     String
  name          String
  qty           Int
  unitPrice     Int
  modifiers     String[]      // "no ice", "extra cheese"
  notes         String?
  kitchenStatus KitchenStatus @default(NEW)
  sentToKitchenAt DateTime    @default(now())
  readyAt       DateTime?
  servedAt      DateTime?
}

model Shift {
  id         String    @id @default(cuid())
  clubId     String
  employeeId String
  area       String    // BAR | FRONT_DESK | KITCHEN | COACHING
  startsAt   DateTime
  endsAt     DateTime?
  openingCash Int?
  closingCash Int?
  notes      String?
}

// ---------- Money (single ledger) ----------
enum PaymentMode   { CASH CARD UPI ONLINE CREDIT COMPLIMENTARY }
enum TxSource      { COURT SHOP BAR MEMBERSHIP COACHING EVENT REFUND OTHER }
enum TxDirection   { IN OUT }

model Transaction {
  id          String      @id @default(cuid())
  clubId      String
  memberId    String?
  member      Member?     @relation(fields: [memberId], references: [id])
  source      TxSource
  direction   TxDirection @default(IN)
  amount      Int         // paise, gross
  tax         Int         @default(0)
  paymentMode PaymentMode
  reference   String?     // UPI txn id, card last4
  refType     String?     // Booking | ShopOrder | BarTab | Invoice
  refId       String?
  description String
  byUserId    String?
  createdAt   DateTime    @default(now())
  @@index([clubId, createdAt])
  @@index([clubId, source])
}

model Payment {        // supports split payments on a tab/order
  id        String      @id @default(cuid())
  tabId     String?
  tab       BarTab?     @relation(fields: [tabId], references: [id])
  orderId   String?
  invoiceId String?
  mode      PaymentMode
  amount    Int
  reference String?
  createdAt DateTime    @default(now())
}

enum InvoiceStatus { DRAFT SENT PAID OVERDUE VOID }

model Invoice {
  id          String        @id @default(cuid())
  clubId      String
  invoiceNo   String        @unique
  memberId    String?
  businessClientId String?
  type        String        // MEMBERSHIP | CORPORATE | COACHING | OTHER
  status      InvoiceStatus @default(DRAFT)
  issueDate   DateTime      @default(now())
  dueDate     DateTime
  lineItems   Json          // [{desc, qty, unitPrice, taxPct}]
  subtotal    Int
  tax         Int
  total       Int
  paidAmount  Int           @default(0)
  pdfUrl      String?
}

model BusinessClient {
  id       String @id @default(cuid())
  clubId   String
  name     String
  gstin    String?
  contact  String
  phone    String
  email    String
  address  String?
}

// ---------- Leads / CRM ----------
enum LeadStage { NEW CONTACTED QUOTE_SENT TRIAL_BOOKED CONVERTED LOST }

model Lead {
  id          String    @id @default(cuid())
  clubId      String
  memberId    String?   @unique      // becomes the Member on convert
  member      Member?   @relation(fields: [memberId], references: [id])
  name        String
  phone       String
  email       String?
  interest    String?   // Tennis, Cricket, Membership, Coaching
  source      String    // WEBSITE | WALK_IN | PHONE | WHATSAPP | REFERRAL | INSTAGRAM
  stage       LeadStage @default(NEW)
  message     String?
  assignedToId String?
  nextFollowUp DateTime?
  quoteId     String?
  activities  LeadActivity[]
  createdAt   DateTime  @default(now())
}

model LeadActivity {
  id        String   @id @default(cuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id])
  type      String   // NOTE | CALL | WHATSAPP | EMAIL | QUOTE | STAGE_CHANGE
  content   String
  byUserId  String?
  createdAt DateTime @default(now())
}

// ---------- HR ----------
model Employee {
  id          String   @id @default(cuid())
  clubId      String
  userId      String?  @unique
  user        User?    @relation(fields: [userId], references: [id])
  name        String
  phone       String
  designation String   // Front Desk, Bartender, Chef, Coach, Groundsman
  department  String
  salaryMonthly Int    // paise
  hourlyRate  Int?
  joinedAt    DateTime
  leaveBalance Int     @default(12)
  isActive    Boolean  @default(true)
  bankDetails Json?
}

enum LeaveStatus { PENDING APPROVED REJECTED }

model LeaveRequest {
  id         String      @id @default(cuid())
  clubId     String
  employeeId String
  from       DateTime
  to         DateTime
  type       String      // CASUAL | SICK | PAID | UNPAID
  reason     String?
  status     LeaveStatus @default(PENDING)
  decidedById String?
  decidedAt  DateTime?
}

model Payslip {
  id         String   @id @default(cuid())
  clubId     String
  employeeId String
  month      String   // "2026-10"
  baseSalary Int
  hoursWorked Int?
  overtime   Int      @default(0)
  deductions Int      @default(0)
  netPay     Int
  status     String   @default("DRAFT") // DRAFT | APPROVED | PAID
  paidAt     DateTime?
  pdfUrl     String?
  @@unique([employeeId, month])
}

// ---------- System ----------
model Notification {
  id        String   @id @default(cuid())
  clubId    String
  userId    String?
  memberId  String?
  channel   String   // IN_APP | EMAIL | WHATSAPP | SMS
  template  String   // BOOKING_CONFIRMED | EXPIRY_7D | ORDER_READY ...
  payload   Json
  status    String   @default("QUEUED") // QUEUED | SENT | FAILED
  sentAt    DateTime?
  createdAt DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  clubId    String
  userId    String?
  action    String   // booking.create, tab.void, member.plan_change
  entity    String
  entityId  String
  before    Json?
  after     Json?
  ip        String?
  createdAt DateTime @default(now())
  @@index([clubId, createdAt])
}
```

### 5.1 The double-booking guarantee (MUST — raw SQL migration)

Prisma cannot express exclusion constraints. After `prisma migrate dev --create-only`, append this to the generated migration SQL:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "courtId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED' AND "kind" IN ('PRIVATE','COACHING','TRIAL','MAINTENANCE'));
```

- Social play (`kind = 'SOCIAL'`) is excluded from the constraint because many members share that one booking via `SocialPlayParticipant`; capacity is enforced in the server action.
- When the constraint fires, Prisma throws `P2010`/raw error with constraint name `booking_no_overlap`. Catch it and return `{ ok:false, error:"Court was just booked by someone else. Pick another slot." }`.
- Also enforce in the server action (fast path): check overlap + `maxBookingsPerDay` inside a `prisma.$transaction` with `SELECT ... FOR UPDATE` on the court row to serialise bookings per court.

### 5.2 Slot generation rule
- Slots start on every `:00` and `:30` between `club.openTime` and `club.closeTime - 60min`.
- Each slot is `[start, start+60min)`.
- A slot is **available** if no CONFIRMED non-social booking on that court overlaps it.
- Price = `CourtPricing.walkInPrice` for that court/day type/hour × `(100 - plan.courtDiscountPct)/100`. Gold = 100% → free.

---

## 6. Application Map — every page, its purpose, features and flow

Design rule for all pages: match the landing page's visual language. Operational screens (desk, POS, KDS) are dense, high-contrast, large touch targets (≥44px). Member and owner screens are mobile-first.

### 6.1 Public website (`/`) — Scene E
| Route | Page | Features |
|---|---|---|
| `/` | Landing (done) | Hero, courts, plans, shop teaser, testimonials, CTA "Book a trial", live "Free this week" strip pulling real availability |
| `/courts` | Courts & availability | Public 7-day grid per court (read-only), tap slot → "Book as guest / Login to book" |
| `/plans` | Membership plans | Gold / Silver / Junior cards with benefits & prices, "Join" → lead form or signup |
| `/shop` | Public catalogue | Grid by category, product page `/shop/[sku]`, add to cart, checkout as guest or member, choose Click & Collect / Delivery |
| `/trial` | Book a trial | Form: name, phone, sport, preferred slot (shows real free slots) → creates `Lead(stage=TRIAL_BOOKED)` + `Booking(kind=TRIAL)` + WhatsApp confirmation |
| `/contact` | Enquiry | Form → `Lead(stage=NEW, source=WEBSITE)` → notifies front desk (in-app + WhatsApp) |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth (done) | |

### 6.2 Member app (`/me`) — Scenes A, B, C, D — PWA, mobile-first
| Route | Page | Features |
|---|---|---|
| `/me` | Home | Greeting, membership card with **QR**, expiry countdown, next booking, quick actions: Book court · Shop · My tab · Social play |
| `/me/book` | Book a court | Date picker → sport filter → **slot grid** (30-min starts, 60-min sessions) with live availability and *your* price (Gold shows "Free"); shows "2/2 used today" when cap reached; Join waitlist on full slot |
| `/me/bookings` | My bookings | Upcoming / past, cancel (shows refund/credit rule), add to calendar, invite friend (share link) |
| `/me/social` | Friday social play | See open social sessions, join/leave, see generated pairings, record result → updates `skillRating` |
| `/me/shop` + `/me/orders` | Shop & orders | Same catalogue with member price, order tracking (Preparing → Ready for pickup) |
| `/me/tab` | My bar tab | Live tab items; **scan table QR to order from phone**; "Settle now" with UPI |
| `/me/stats` | My game | Hours played, favourite court, win/loss, "You saved ₹X this month as Gold" |
| `/me/profile` | Profile | Details, plan, renew/upgrade, payment history, notification preferences (WhatsApp/email) |

### 6.3 Front desk (`/desk`) — Scenes A, B, E — tablet/desktop
| Route | Page | Features |
|---|---|---|
| `/desk` | Today board | Left: **live court grid for today** (all courts × slots, colour by status). Right: **member search** (phone / name / scan QR) and "Who's here" check-ins. Alerts: expiring memberships, new leads, low stock |
| `/desk/book` | Quick book | Pick member or "Walk-in", pick court+slot, price auto-computed, take payment (cash/card/UPI), prints/sends confirmation. Handles the "someone on the phone" case in under 20 seconds |
| `/desk/members` | Members list | Filter by status/plan/expiry, bulk reminder, export |
| `/desk/members/new` | Register member | Form (zod) → plan → start date → first payment → QR generated → welcome WhatsApp/email |
| `/desk/members/[id]` | Member 360 | Header card (photo, plan, expiry, credit) + **timeline** of bookings, orders, tabs, payments, notes, leads; actions: renew, change plan, freeze, add note, check-in |
| `/desk/leads` | Lead pipeline | **Kanban** New → Contacted → Quote Sent → Trial Booked → Converted / Lost; drag to move; follow-up due badges |
| `/desk/leads/[id]` | Lead detail | Activity log, call/WhatsApp buttons, **Send quote** (generates PDF, emails/WhatsApps), **Book trial**, **Convert to member** (pre-fills registration) |
| `/desk/checkin` | Scanner | Camera QR scan → member card + today's bookings → one-tap check-in |
| `/desk/shifts` | Staff schedule | Weekly rota, clock in/out, who's on now |

### 6.4 Shop POS (`/shop-pos`) — Scene C
| Route | Page | Features |
|---|---|---|
| `/shop-pos` | Counter sale | Product grid with search/barcode, cart, attach member (discount auto), pay cash/card/UPI/split, receipt (print/WhatsApp). Decrements `stockQty` via `StockMovement` |
| `/shop-pos/orders` | Online orders queue | Click & Collect / Delivery orders to fulfil, status buttons, "Notify ready" (WhatsApp) |
| `/shop-pos/inventory` | Inventory | Stock levels, low-stock list, restock, adjustments, movement history |
| `/shop-pos/products` | Product admin | CRUD, variants, images, tax, flags (shop/bar/service) |
| `/shop-pos/services` | Service jobs | Restringing queue with turnaround and "ready" notify |

### 6.5 Bar & cafeteria (`/bar`) — Scene D
| Route | Page | Features |
|---|---|---|
| `/bar/pos` | Bar POS | **Table map** (zones) → tap table → tab. Menu by category, modifiers, notes. Attach member by phone/QR → **discount auto-applied, badge shown**. Send to kitchen. Split bill by item or amount; pay cash/card/UPI. Void with reason (audit). Works **offline** (queue in IndexedDB, replay on reconnect) |
| `/bar/tabs` | Open tabs | All open tabs, age, amount; transfer table; merge tabs |
| `/bar/kds` | Kitchen Display | Full-screen cards per ticket: NEW → PREPARING → READY → SERVED; timers turn amber at 8 min, red at 15; sound on new ticket; "Ready" triggers WhatsApp to member if ordered from phone |
| `/bar/menu` | Menu admin | Items, prices, availability toggle (86'd), categories |
| `/bar/shift` | Shift & close | Clock in, opening cash, **End-of-day Z-report**: sales by payment mode, item sales, voids, discounts, open tabs, cash expected vs counted; export PDF; posted to ledger |
| `/t/[qrToken]` | Guest table ordering | Scan QR on table → menu → order → lands on that table's tab and KDS (login optional; members log in for discount) |

### 6.6 Owner (`/owner`) — Scene F — phone-first
| Route | Page | Features |
|---|---|---|
| `/owner` | Dashboard | **Today / Week / Month** toggle. KPI cards: revenue, bookings, court utilisation %, new members, bar covers. Charts: revenue **by source** (Court / Shop / Bar / Membership) and **by payment mode** (Cash / Card / UPI / Online). Court utilisation heatmap (court × hour). Alerts: expiring, low stock, pending leaves, payables due |
| `/owner/ask` | Ask your club (AI) | Natural-language question → safe read-only SQL over the ledger (scoped to `clubId`) → answer + chart + "show SQL". Examples: "Bar revenue on Fridays this month vs last", "Which court is least used after 8pm?" |
| `/owner/finance` | Ledger | Filter transactions by source/mode/date; export CSV; reconcile cash |
| `/owner/invoices` | Invoices | Membership & corporate invoices; create, send (email/WhatsApp), mark paid, PDF with GST |
| `/owner/payables` | What we owe | Pending salaries, supplier bills (manual entry), refunds/credits due |
| `/owner/tax` | Tax report | GST collected by rate and source, by month, export |
| `/owner/hr` | Employees | List, designation, salary; shifts summary |
| `/owner/hr/leave` | Leave approvals | Pending requests, approve/reject, calendar view |
| `/owner/hr/payroll` | Payroll | Generate month payslips from salary + shifts/overtime − deductions; approve; mark paid → ledger OUT; PDF payslips |
| `/owner/reports` | Share | Scheduled daily/weekly summary to WhatsApp/email; shareable read-only report link |
| `/owner/settings` | Club settings | Courts & pricing, plans, cancellation rules, social-play rules, tax rates, staff & roles, WhatsApp/Vapi config |

### 6.7 Display & misc
| Route | Page | Features |
|---|---|---|
| `/display` | Court-side TV | No-interaction screen: today's grid, now playing, next up, social-play pairings, bar specials. Auto-refresh |
| `/coach` | Coach home | Own sessions, students, mark attendance |
| `/api/webhooks/twilio` | WhatsApp inbound | Route handler for WhatsApp agent |
| `/api/vapi/tools` | Voice agent tools | Route handler Vapi calls to check availability / book / cancel |

---

## 7. Core Flows (step-by-step for implementation)

### 7.1 Register a member (front desk)
1. `/desk/members/new` form → zod validate → `createMember` server action.
2. Create `Member(status=ACTIVE, planId, startDate, expiryDate = start + plan period)`, generate `memberCode` (CC-####) and `qrToken`.
3. Take first payment → `Transaction(source=MEMBERSHIP, mode)` + `Invoice(type=MEMBERSHIP, status=PAID)`.
4. Optionally create `User(role=MEMBER)` with temp password → email/WhatsApp welcome with login link + QR image.
5. `AuditLog(member.create)`.
6. Nightly cron (Vercel Cron `/api/cron/daily`): members expiring in 7/3/1 days → `Notification` WhatsApp + email; expired → `status=EXPIRED`.

### 7.2 Book a court (any channel)
1. Input: `courtId, startsAt, memberId | walkIn, kind, source`.
2. Validate: slot aligned to :00/:30, inside opening hours, not in past, within `advanceBookingDays`.
3. `prisma.$transaction`:
   a. `SELECT id FROM "Court" WHERE id=$1 FOR UPDATE` (serialise per court).
   b. If member: count today's CONFIRMED bookings; reject if ≥ `plan.maxBookingsPerDay` (default 2). Reject if membership expired.
   c. Compute price from `CourtPricing` × plan discount.
   d. Insert `Booking`. If DB raises `booking_no_overlap` → return friendly conflict error.
   e. If `priceCharged > 0` and paid now → `Transaction(source=COURT)`.
4. Queue `Notification(BOOKING_CONFIRMED)` → WhatsApp + email.
5. SWR revalidate on grid clients.

### 7.3 Cancel + waitlist promotion
1. Member/staff cancels → check cancellation window from `club.settings` (e.g., ≥2h before = full credit, else 50%).
2. `status=CANCELLED`, create `Transaction(direction=OUT, source=REFUND)` or add to `member.creditBalance`.
3. Find first `Waitlist(WAITING)` for that court/slot → set `OFFERED`, `expiresAt = now+10min`, WhatsApp "Court 2 at 7pm is free — tap to confirm". Confirm link → `book()`; expiry cron moves to next.

### 7.4 Friday social play
1. Manager creates `Booking(kind=SOCIAL, capacity from court.capacity*N)` for a court/time.
2. Members join via `/me/social` → `SocialPlayParticipant` (capacity check).
3. At start, **matchmaker** generates balanced doubles pairings by `skillRating` (greedy: sort by rating, pair top with bottom, rotate every 20 min). Shown on `/display` and `/me/social`.
4. Members record results → ELO-lite update of `skillRating`.

### 7.5 Bar tab lifecycle
1. Staff taps table → `openTab` (or scan member QR → tab linked to member, discount badge).
2. Add items → `BarTabItem(kitchenStatus=NEW)`; KDS polls and shows ticket.
3. Kitchen advances NEW → PREPARING → READY → SERVED; READY triggers WhatsApp if the order came from a phone.
4. Settle: compute subtotal, apply `plan.barDiscountPct`, tax; record `Payment[]` (split allowed); on full payment → `TabStatus=SETTLED`, `Transaction(source=BAR, mode per payment)`, `StockMovement` for tracked items.
5. Offline: POS client writes actions to IndexedDB queue; a sync worker replays them to server actions when online; server operations are idempotent via client-generated ids.

### 7.6 Shop order (online)
1. Cart → checkout → `ShopOrder(channel=ONLINE, fulfilment)`; payment via Razorpay stub (or "Pay at pickup").
2. Stock decrement at payment; low-stock check → notify manager.
3. Staff queue `/shop-pos/orders` moves status; READY_FOR_PICKUP → WhatsApp to customer.

### 7.7 Lead → Member
1. Website enquiry / trial / WhatsApp inbound → `Lead`. Notify desk.
2. Desk works the Kanban; every call/WhatsApp logged as `LeadActivity`.
3. **Send quote**: pick plan → PDF generated → emailed/WhatsApped → `stage=QUOTE_SENT`.
4. **Convert**: pre-filled member form → creates `Member`, links `lead.memberId`, `stage=CONVERTED`.

### 7.8 End of day & month
1. Bar shift close → Z-report → PDF → owner WhatsApp.
2. Dashboard reads from `Transaction` grouped by `source`, `paymentMode`, period.
3. Monthly: payroll generate → approve → pay (`Transaction OUT`), tax report export, invoices for corporate clients.

---

## 8. Integrations

### 8.1 WhatsApp — Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`)
**Outbound templates** (via `lib/whatsapp.ts`): booking confirmed, booking reminder (1h before), cancellation + credit, waitlist offer, membership expiring 7/3/1 days, order ready, tab receipt, lead follow-up, daily owner summary, Z-report.
**Inbound WhatsApp agent** (`/api/webhooks/twilio`): parse message → AI SDK with tools `getAvailability(date, sport)`, `bookCourt(...)`, `cancelBooking(id)`, `myBookings()`, `clubInfo()`. Identify member by phone. Confirms in chat. Unknown numbers → create `Lead(source=WHATSAPP)`. This directly replaces the club's current "bookings over WhatsApp" with a WhatsApp that actually works.

### 8.2 Voice — Vapi (`VAPI_API_KEY`, `VAPI_ASSISTANT_ID`)
Scene B explicitly has "someone on the phone asking what is free". Configure a Vapi assistant whose tools call `/api/vapi/tools` with the same `getAvailability / bookCourt / cancelBooking` functions. Caller is identified by phone number → member → correct price. Front desk never has to pick up for availability questions. Show the call transcript landing as a `LeadActivity`/booking in the demo.

### 8.3 AI — Vercel AI SDK via AI Gateway
- `/owner/ask`: NL → SQL. Provide schema summary in system prompt; only allow `SELECT`; always inject `WHERE "clubId" = $club`; run with a read-only Postgres role; return rows + chart spec.
- WhatsApp/voice intent handling (above).
- Product description generator in product admin.
- Churn radar explanation ("Rahul used to play 3×/week, 12 days inactive").

### 8.4 Email — Nodemailer (exists)
Welcome, receipts, invoices, quotes, payslips, reports. Templates in `lib/email-templates/`.

### 8.5 Payments
Hackathon scope: POS records mode + reference (UPI txn id / card last4). Online orders: Razorpay test mode if time; else "Pay at pickup". Never hardcode prices client-side; totals always recomputed server-side.

### 8.6 Cron (Vercel Cron → `/api/cron/daily`, `/api/cron/every-10-min`)
Daily: expiry reminders, expire memberships, owner summary. Every 10 min: booking reminders, waitlist offer expiry, follow-up due alerts.

---

## 9. Wow Features (ranked by demo-impact ÷ effort — build in this order)

1. **DB-level double-booking impossibility** — race two browsers on one slot live; show the exclusion constraint. (Core, must)
2. **Voice agent books a court** — call the number on stage, ask "what's free at 7?", book it, watch it appear on the desk grid. (Vapi)
3. **WhatsApp agent** — message the club, get availability and book. The exact tool they use today, made intelligent. (Twilio + AI SDK)
4. **Tap-to-tab** — member QR opens bar tab, discount badge appears, settle with court bill in one payment.
5. **Offline-first bar POS** — kill WiFi mid-demo, keep ordering, reconnect, everything syncs. (Odoo judges reward offline)
6. **Waitlist auto-promotion** — cancellation turns into a sale in 10 seconds.
7. **Social-play matchmaker** — balanced doubles pairings on the court-side TV.
8. **Ask your club (NL analytics)** — owner asks a question in plain English, gets a chart.
9. **Churn radar** — flags members whose play frequency dropped; one-tap "send guest pass".
10. **Court-side display mode** — `/display` on a TV makes the club look premium.
11. **Dynamic off-peak pricing** — auto-discount empty slots 3h before and push to Silver/Junior members.
12. **Member "My game" stats** — hours, wins, money saved by plan → justifies upgrades.

---

## 10. UX Principles
- **Role = home screen.** Nobody sees modules they don't use.
- **≤2 taps** for book, check-in, order, settle.
- **Touch targets ≥44px**, high contrast, legible in a dim bar; KDS readable from 3 m.
- **Mobile-first** for `/me` and `/owner`; **tablet-first** for `/desk`, `/bar/pos`, `/shop-pos`; **TV** for `/display`, `/bar/kds`.
- **Consistency with landing page**: reuse its colour tokens, type scale, radius, button styles. One accent colour family drawn from the sport (court green / clay) — no purple gradients, no generic SaaS look.
- **Empty states, loading skeletons, optimistic updates** on grid and POS.
- **Every destructive action** (void, cancel, delete) asks for a reason → AuditLog.
- **Accessibility**: semantic HTML, aria labels, keyboard support on desk screens.

---

## 11. Project Structure

```
app/
  (public)/            # /, /courts, /plans, /shop, /trial, /contact
  (auth)/              # login, register, forgot, reset  (done)
  me/                  # member PWA
  desk/                # front desk
  shop-pos/
  bar/                 # pos, tabs, kds, menu, shift
  owner/
  coach/
  display/
  t/[qrToken]/         # table QR ordering
  api/
    webhooks/twilio/route.ts
    vapi/tools/route.ts
    cron/daily/route.ts
    cron/every-10-min/route.ts
    availability/route.ts   # public JSON for widgets
components/
  ui/                  # buttons, inputs, dialog, sheet, badge, table …
  booking/             # SlotGrid, CourtColumn, SlotCell, BookingDialog
  members/             # MemberCard, MemberSearch, Timeline
  pos/                 # ProductGrid, Cart, PaymentDialog, SplitPay
  bar/                 # TableMap, TabPanel, KdsTicket
  dashboard/           # KpiCard, RevenueBySource, RevenueByMode, Heatmap
  leads/               # Kanban, LeadCard
lib/
  prisma.ts  auth.ts (done)  mail.ts (done)  whatsapp.ts  vapi.ts  ai.ts
  booking/slots.ts  booking/pricing.ts  booking/book.ts
  money.ts (paise helpers, GST)  pdf/  qr.ts  audit.ts  notifications.ts
  offline/queue.ts (IndexedDB)  
prisma/
  schema.prisma  migrations/  seed.ts
```

---

## 12. Seed Data (required for a convincing demo)
- 1 club "The Champions Club", GSTIN, hours 06:00–23:00.
- Courts: Tennis 1–3 (hard, lights), Cricket Net 1–2, Badminton 1–2.
- Pricing: off-peak ₹400/hr, peak ₹700/hr tennis; cricket ₹600/₹900; badminton ₹300/₹500.
- Plans: Gold ₹4,999/mo (courts free, shop 15%, bar 20%), Silver ₹2,499/mo (courts 50%, shop 10%, bar 10%), Junior ₹999/mo (courts 60%, shop 10%, bar 5%, under 18).
- 60 members across tiers with realistic Indian names, phones, varied expiry (some expiring this week), skill ratings, 3 months of booking history.
- 40 shop products with stock (a few below threshold), 2 services (restringing).
- Bar menu: 30 items (food, beverages), 12 tables across Indoor/Patio/Court-side.
- 8 employees (desk ×2, bar ×3, kitchen ×2, coach ×1) with shifts and one pending leave.
- 15 leads across stages, 3 corporate clients with invoices.
- 3 months of `Transaction` rows so the dashboard has trends.
- Users: owner@, manager@, desk@, bar@, kitchen@, coach@, and 3 member logins — all password `Password123!`.

---

## 13. Build Order (phases — follow strictly)

| Phase | Deliverable | Acceptance |
|---|---|---|
| 0 | Extend `User` with role/clubId, full Prisma schema, migration incl. exclusion constraint, seed, role middleware, layout shells per role | All roles log in and land on their home |
| 1 | Booking engine: slots, pricing, `book()` with transaction + constraint, `/me/book`, `/desk` grid, `/desk/book`, cancel, 2/day cap | Two parallel bookings → one fails cleanly; Gold price shows Free |
| 2 | Members: register, Member 360 timeline, QR, check-in scanner, expiry cron + WhatsApp/email reminders | Scan QR → see full history |
| 3 | Bar: table map, tabs, KDS, member discount, split pay, Z-report → ledger | 20 items on 3 tabs, kitchen flow, close day |
| 4 | Shop: POS, inventory, online catalogue, click & collect, low-stock alerts | Counter sale and online order hit the same stock |
| 5 | Public site pages, trial booking, enquiry → lead Kanban, quote PDF, convert | Stranger → lead → quote → member |
| 6 | Owner dashboard (source × mode, periods, heatmap), ledger, invoices, tax, payables | Numbers reconcile with seed |
| 7 | HR: employees, shifts, leave, payroll + payslip PDF | Payroll month generated |
| 8 | Integrations: Twilio WhatsApp (out + agent), Vapi voice tools, `/owner/ask` NL analytics | Phone call books a court |
| 9 | Wow: waitlist, social matchmaker, `/display`, offline POS, churn radar, dynamic pricing | Each demoable in <30 s |
| 10 | Polish, PWA manifest, seed refresh, README, demo rehearsal ×3 | |

Team split (4): (1) booking + display + voice/WhatsApp tools; (2) bar POS/KDS/shop + offline; (3) members/leads/public site/notifications; (4) owner dashboard/finance/HR/AI/devops. Everyone commits in Phase 0.

---

## 13.x Free-tier Constraints & Fallback Chain (MUST follow)

### Twilio WhatsApp — Sandbox mode (free)

**Limits**
- Trial account: ~100 total messages (inbound + outbound). Do not spam during development.
- Every recipient phone must opt in by sending `join <sandbox-code>` to the sandbox number. Opt-in expires after 72 hours → all team phones and the demo phone **must re-join on demo day**.
- Free-form messages only inside a 24-hour window after the user's last inbound message. Outside the window, Meta requires approved templates, which the sandbox does not reliably support.
- No Meta business verification needed; no custom branding/number.

**Implementation rules**
- Env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (sandbox number, format `whatsapp:+14155238886`), `WHATSAPP_ENABLED=true|false`.
- `lib/notify/whatsapp.ts` must: (1) no-op and `console.log` when `WHATSAPP_ENABLED=false`; (2) check `member.whatsappOptInAt` and `member.lastInboundAt` — if last inbound is older than 24h, skip WhatsApp and fall through to email; (3) never throw — return `{sent:false, reason}`.
- Add columns to `Member`: `whatsappOptInAt DateTime?`, `lastInboundAt DateTime?`. Update `lastInboundAt` on every inbound webhook.
- Inbound webhook `app/api/webhooks/twilio/whatsapp/route.ts`: validate `X-Twilio-Signature`, parse `From`/`Body`, route to the AI booking agent, reply via TwiML or REST.
- **Demo prep:** all demo phones message the bot once in the morning so reminder/waitlist pushes are inside the 24h window.

---

### Vapi — Voice agent ($5 one-time credit, no free tier)

**Limits**
- ~$0.05/min platform fee + STT/LLM/TTS pass-through ≈ $0.10–$0.20/min total → $5 ≈ 25–45 minutes of talk time.
- Included phone numbers are US-only. Indian numbers require a Twilio number import (extra cost). **Do not rely on a phone number.**
- Implementation rules

**Implementation rules**
- Use the web call widget (`@vapi-ai/web`) on the landing page and member PWA: "Call the club" button → browser mic → agent. No telephony cost, no number needed.
- Env vars: `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_SERVER_SECRET`, `VAPI_ENABLED=true|false`. Hide the button when disabled.
- Assistant tools (server URL `app/api/vapi/tools/route.ts`, verify `VAPI_SERVER_SECRET`): `check_availability(date, courtType)`, `book_court(memberPhone, date, startTime, courtId)`, `cancel_booking(bookingId)`, `get_my_bookings(memberPhone)`. Each tool calls the same server actions used by the UI — **no duplicate logic**.
- Cap every call at 3 minutes via `assistant.maxDurationSeconds=180`. Add an end-of-call webhook to log transcript to `AuditLog`.
- Rehearse at most 3 full calls before demo. Keep a second Vapi account (another teammate) as backup credit.

---

### Notification Fallback Chain (applies to every event — MUST follow)

```
event → write Notification row (in-app bell, always)
      → if WHATSAPP_ENABLED && optedIn && within24h → Twilio WhatsApp
      → else if member.email → Nodemailer email
      → log result in Notification.channel + Notification.status
```

- `lib/notify/send.ts` is the **only** entry point. Modules never call Twilio/Nodemailer directly.
- Dev default: `WHATSAPP_ENABLED=false`, `VAPI_ENABLED=false` so quota is never consumed by accident.
- **The demo must work end-to-end with both external providers disabled.** WhatsApp and voice are additive wow moments, not dependencies.

---

### Production Cost Note (for the pitch)
- **WhatsApp:** ~$0.005/msg Twilio + Meta conversation fee (India ≈ ₹0.3–₹0.9/conversation). Negligible at club scale; bundled into the Pro tier.
- **Voice:** ~₹10–15/min; offered as an Enterprise add-on, or replaced by WhatsApp-only booking for Starter/Pro.

---

## 14. Business Model (for the pitch)

| Tier | Price | Includes |
|---|---|---|
| Starter | ₹1,999/mo | ≤4 courts, bookings, members, website |
| Pro | ₹4,999/mo | + shop POS, bar POS/KDS, dashboard, WhatsApp |
| Enterprise | ₹9,999/mo + 2% online bookings | multi-location, payroll, voice agent, API |

Add-ons: WhatsApp message packs, payment-gateway margin, Phase-2 public "find a court near me" marketplace across all tenant clubs (Playtomic model: subscription + commission). Market: racket-sport booking SaaS ≈ $0.45B (2026) → ~$4.5B (2036), ~26% CAGR; India has 10k+ clubs on WhatsApp + Excel paying ₹0 for software today.

---

## 15. Demo Script (4 minutes, every PDF scene in order)

1. **Stranger** finds `/`, sees free slots this week, books a trial → lead appears on desk Kanban with WhatsApp ping.
2. **Front desk** converts her to Gold in one click; QR appears on her phone.
3. **6 pm rush**: two browsers race for Court 1 at 19:00 → one succeeds, other gets "just booked" error. Then **call the club** → Vapi agent books 19:30 → appears on grid live.
4. Someone cancels → **waitlist** member gets WhatsApp → confirms in 5 s.
5. **Shop**: racket restring sold at counter; online stock for the same string drops live.
6. **Social play**: pairings appear on `/display`.
7. **Bar**: scan member QR → tab opens with Gold 20% badge; 6 items → KDS lights up; **WiFi off**, 3 more items, WiFi on → synced; split UPI + cash; receipt on WhatsApp.
8. **Owner** on phone: dashboard shows tonight's number moving; asks "how much did the bar make tonight by payment mode?" → chart. Shift close Z-report arrives on WhatsApp.

End on the owner's phone.

---

## 16. Judge Q&A Cheat Sheet
- *How do you prevent double booking?* Postgres exclusion constraint on `(courtId, tstzrange)` + `FOR UPDATE` per court in the transaction. App check is the fast path; DB is the guarantee.
- *Why Prisma if it can't do that constraint?* Prisma for 99% of typed access; one raw SQL migration for the constraint. Shown in `prisma/migrations`.
- *How is this different from a booking app?* One member record, one ledger across courts/shop/bar/membership — Odoo-style modules on a shared kernel. The dashboard is a `GROUP BY`, not an integration.
- *Multi-tenant?* `clubId` on every table, enforced in every server action; AI queries are injected with the club filter and run on a read-only role.
- *Offline?* POS actions queued in IndexedDB with client-generated ids; server actions idempotent; replay on reconnect.
- *Security?* JWT httpOnly cookie (jose), bcrypt, zod validation on every action, role checks server-side, audit log, server-side price recomputation.
- *Revenue?* SaaS tiers + message packs + marketplace commission; comps charge $63–$549/mo abroad; India greenfield.
