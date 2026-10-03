# Yolla — Implementation Plan

Small, ordered steps. Each step is one commit-sized piece of work with a clear "done" check.
`CONTEXT.md` stays the source of truth for schema and page specs; this file is the *order of work*.

Legend: `[x]` done · `[ ]` todo · **Done when** = acceptance check.

---

## Phase 0 — Landing + auth + role foundation

### 0.1 Landing page `[x]`
- `app/page.tsx` split into `components/landing/*` (Nav, Hero, LiveStrip, Scenes, Plans, Modules, Owner, Shift, Cta, Footer, Reveal).
- Copy rewritten around The Champions Club's six scenes. Styles in `app/landing.css` (scoped under `.landing`, dark mode via `html.dark`).
- Middleware no longer redirects signed-in users away from `/`.
- **Done when:** page renders light/dark, mobile/desktop, no hydration warnings.

### 0.2 Roles + club on `User` `[x]`
- Extend `enum Role { OWNER MANAGER FRONT_DESK BAR_STAFF KITCHEN COACH MEMBER }` (drop `ADMIN`; map existing admins → `OWNER`).
- Add `model Club { id hashId name slug timezone currency ... }` and `clubId` on `User`, `ActivityLog`.
- `prisma migrate dev --name roles_and_club`. Seed one club: "The Champions Club".
- **Done when:** `pnpm prisma studio` shows the club and users carry `clubId`.

### 0.3 Auth helpers `[x]`
- `lib/auth.ts`: `SessionPayload` gains `clubId`. Add `requireUser()` (throws/redirects when absent) and `requireRole(...roles)`.
- `lib/roles.ts`: `homeFor(role)` map (see "After sign-in" below) and `canAccess(role, pathPrefix)`.
- Every server action in `lib/actions/*` starts with `const user = await requireRole(...)`.
- **Done when:** calling a desk action as `MEMBER` throws `FORBIDDEN`.

### 0.4 Role-aware routing `[x]`
- `middleware.ts`: protect `/me`, `/desk`, `/shop-pos`, `/bar`, `/coach`, `/owner`, `/dashboard`; redirect by `canAccess`; add `/app` entry route that sends the user to `homeFor(role)`.
- `/login` success → `redirect(callbackUrl ?? homeFor(role))`. `/register` creates a `MEMBER` of the seeded club and lands on `/me`.
- Replace `/dashboard` with a redirect to `/app` (keep `/dashboard/settings` → move to `/me/profile` later).
- **Done when:** seven seeded users log in and each lands on their own home.

### 0.5 Layout shells per role `[x]`
- `app/(member)/me/layout.tsx` — mobile-first, bottom tab bar (Home · Book · Shop · Tab · Profile).
- `app/(staff)/desk/layout.tsx`, `shop-pos/layout.tsx`, `bar/layout.tsx` — reuse `components/shared/DashboardShell` (Sidebar + Topbar + CommandPalette) with role-specific nav items.
- `app/(owner)/owner/layout.tsx` — phone-first, same shell collapsed.
- `app/display/layout.tsx` — no chrome (TV).
- **Done when:** each home route renders an empty page inside the correct shell.

### 0.6 Seed script `[~]` (club + 7 users done; courts/plans/members land with their schemas)
- `prisma/seed.ts`: 1 club · 7 users (one per role, password `demo1234`) · 5 courts · 3 plans · 40 members · 2 weeks of bookings · 30 products · bar menu · 7 leads · 3 employees.
- **Done when:** `pnpm db:seed` is idempotent and the landing "Free this week" strip can read real slots.

---

## Phase 1 — Booking engine (Scene B)

### 1.1 Schema `[ ]`
`Court`, `Sport`, `PricingRule` (plan × hour band → price), `Slot`, `Booking` (kind: NORMAL | TRIAL | SOCIAL | MAINT), `Waitlist`. Raw SQL migration: `EXCLUDE USING gist (court_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (status <> 'CANCELLED')`.
**Done when:** inserting two overlapping bookings for one court fails at the DB.

### 1.2 Slot generation `[ ]`
`lib/booking/slots.ts`: 30-min starts, 60-min sessions, per court opening hours; cron `/api/cron/daily` rolls the 14-day window forward.

### 1.3 Pricing `[ ]`
`lib/booking/price.ts`: `priceFor(member, court, startAt)` → `{ amount, reason }` (Gold → 0, "Free"). Pure function, unit-tested.

### 1.4 `book()` server action `[ ]`
Transaction: check 2/day cap → check plan window → insert booking → create `LedgerEntry` if paid → `ActivityLog`. Map the exclusion-constraint error to a friendly "Slot just got taken".

### 1.5 Member UI `/me/book`, `/me/bookings` `[ ]`
Date → sport → slot grid with *your* price; cap badge; join waitlist on full slot; cancel with refund rule shown.

### 1.6 Desk UI `/desk` grid + `/desk/book` `[ ]`
Today board: courts × slots coloured by status; quick-book modal (member search or walk-in, price auto, payment mode). Target: under 20 seconds.

### 1.7 Cancel → waitlist promotion `[ ]`
`cancel()` frees slot, first waitlister gets a 10-minute hold + notification (email now, WhatsApp in Phase 8).

### 1.8 Landing hook-up `[ ]`
`components/landing/data.ts` → real queries for hero grid and "Free this week" (cached 60 s with `unstable_cache` / `"use cache"`).

**Phase done when:** two parallel bookings → one fails cleanly; Gold price shows Free; strip is live.

---

## Phase 2 — Members (Scene A)

2.1 Schema: `Member` (1:1 with `User`, `planId`, `startAt`, `expiresAt`, `qrToken`, `creditBalance`, `skillRating`), `Plan`, `Payment`.
2.2 `/desk/members/new`: zod form → plan → start date → first payment → QR → welcome email.
2.3 `/desk/members` list with filters, bulk reminder, CSV export.
2.4 `/desk/members/[id]` Member 360: header card + unified timeline (bookings, orders, tabs, payments, notes, leads) from one query.
2.5 `/me` home: QR card, expiry countdown, next booking, quick actions. `/me/profile`.
2.6 `/desk/checkin`: camera QR scan (`@zxing/browser`) → member card → one-tap check-in (`CheckIn` model).
2.7 Expiry cron: 7d / 1d / day-of reminders via notification fallback chain (email now).

**Done when:** scanning a QR shows full history; expiring members receive reminders.

---

## Phase 3 — Bar & cafeteria (Scene D)

3.1 Schema: `Zone`, `Table` (qrToken), `Tab`, `TabItem`, `MenuItem`, `Modifier`, `KitchenTicket`, `Shift`, `ZReport`.
3.2 `/bar/pos`: table map → tab; menu by category; attach member → discount badge; send to kitchen.
3.3 `/bar/kds`: ticket cards NEW → PREPARING → READY → SERVED, timers amber 8 min / red 15 min, sound.
3.4 Split bill (by item / by amount), pay cash/card/UPI, void with reason (audit).
3.5 `/bar/tabs` open tabs, transfer, merge. `/bar/menu` admin with 86'd toggle.
3.6 `/bar/shift`: clock in, opening cash, Z-report → `LedgerEntry` rows.
3.7 `/t/[qrToken]` guest ordering from phone → tab + KDS.
3.8 Offline queue (IndexedDB, replay on reconnect) — only if time allows.

**Done when:** 20 items on 3 tabs flow through kitchen and the day closes to the ledger.

---

## Phase 4 — Shop & inventory (Scene C)

4.1 Schema: `Product`, `Variant`, `StockMovement`, `Order`, `OrderItem`, `ServiceJob`.
4.2 `/shop-pos` counter sale: search/barcode, cart, attach member (discount), pay, receipt.
4.3 `/shop-pos/inventory`: levels, low-stock, restock, adjustments, movement history.
4.4 `/shop-pos/products` CRUD with images (Blob) and flags (shop / bar / service).
4.5 Public `/shop`, `/shop/[sku]`, cart, checkout (guest or member), Click & Collect / Delivery.
4.6 `/shop-pos/orders` fulfilment queue + "Notify ready". `/shop-pos/services` restringing queue.

**Done when:** a counter sale and an online order decrement the same stock row.

---

## Phase 5 — Public site & leads (Scene E)

5.1 Schema: `Lead` (stage, source, followUpAt), `LeadActivity`, `Quote`.
5.2 `/courts` public 7-day grid (read-only) → "Book as guest / Login to book".
5.3 `/plans` (reuse landing `Plans` with real data) · `/contact` enquiry → `Lead(NEW)`.
5.4 `/trial`: real free slots → `Lead(TRIAL_BOOKED)` + `Booking(kind=TRIAL)` + confirmation.
5.5 `/desk/leads` kanban (dnd-kit) with follow-up badges; `/desk/leads/[id]` detail.
5.6 Send quote (PDF via `@react-pdf/renderer`) · Convert to member (pre-fills 2.2).
5.7 Point landing CTAs at `/trial` instead of `/register`.

**Done when:** stranger → lead → quote → trial → member without leaving the app.

---

## Phase 6 — Owner (Scene F)

6.1 Schema: `LedgerEntry` (source, mode, direction, amount, tax, refs), `Invoice`, `Payable`, `TaxRate`.
6.2 `/owner`: Today / Week / Month toggle; KPI cards; revenue by source + by payment mode (Recharts); utilisation heatmap; alerts.
6.3 `/owner/finance` ledger filters + CSV; cash reconcile. `/owner/invoices` with GST PDF.
6.4 `/owner/payables`, `/owner/tax`.
6.5 `/owner/settings`: courts & pricing, plans, cancellation and social-play rules, tax rates, staff & roles.
6.6 `/owner/reports`: scheduled summary + shareable read-only link.

**Done when:** dashboard numbers reconcile with seed ledger to the rupee.

---

## Phase 7 — HR `[x]`

7.1 Schema: `Employee`, `ShiftSchedule`, `Attendance`, `LeaveRequest`, `PayrollRun`, `Payslip` (migration `hr`). Engine `lib/hr/engine.ts`, queries `lib/hr/queries.ts`, actions `lib/actions/hr.ts`.
7.2 `/desk/shifts` rota + clock in/out. 7.3 `/owner/hr`, `/owner/hr/leave` approvals. 7.4 `/owner/hr/payroll` generate → approve → mark paid → ledger OUT (`TxSource.PAYROLL`) + `/print/payslip/[id]`.
Test: `npx tsx scripts/test-hr-engine.ts`.

---

## Phase 8 — Integrations `[x]`

8.1 `lib/notify.ts` fallback chain WhatsApp (`lib/whatsapp.ts`, Twilio REST) → email (`lib/email.ts`) → in-app; records the delivering channel.
8.2 Shared agent tools `lib/agent/tools.ts` (`checkAvailability`, `book`, `myBookings`, `cancel`) → `lib/booking/engine.ts`. Caller resolved by last-10-digits phone match (digits-only compare in SQL). Inbound Twilio webhook `/api/webhooks/twilio` → `lib/agent/run.ts` (AI SDK tool loop, TwiML reply, signature verified in prod).
8.3 Vapi `/api/vapi/tools`: POST executes tool calls (`x-vapi-secret`), GET emits the tool definitions to paste into the dashboard.
8.4 `/owner/ask` (`lib/ask/engine.ts`): NL → `Output.object` plan → `guardSql` (single SELECT, allow-listed tables, must contain `clubId`, auto-LIMIT) → `READ ONLY` tx + 4 s statement timeout → answer, bar/line chart, result table, "Show SQL". Vetted canned plans answer the six suggested questions when the Gateway is unavailable. Tests: `scripts/test-ask-guard.ts` (16), `scripts/test-ask-canned.ts`.

Setup walkthrough for Twilio / Vapi / Gateway: `SETUP.md`.

**Done when:** a phone call books a court that appears on the desk grid. ✓ (verified via the Vapi endpoint; live voice needs the dashboard steps in SETUP.md.)

**Open:** the Vercel team's AI Gateway needs a card on file before model calls succeed — until then the WhatsApp agent answers with the front-desk fallback and Ask AI uses canned plans.

---

## Phase 9 — Wow features (in demo-impact order)

9.1 Waitlist auto-promote with one-tap confirm · 9.2 Friday social matchmaker (`skillRating` pairings, result → rating) · 9.3 `/display` court-side TV · 9.4 Churn radar (no visit 21 days + expiring) · 9.5 Dynamic off-peak pricing suggestion · 9.6 Offline POS.

## Phase 10 — Polish

PWA manifest + icons · seed refresh · README with demo script · rehearse ×3 · Lighthouse pass on `/`, `/me`, `/desk`.

---

## Authentication — how it works end to end

**Stack:** `jose` JWT in an httpOnly cookie `ldxodoo_session` (7 days), `bcryptjs` password hashing, `zod` validation, Nodemailer for reset emails. No third-party auth.

```
Register (/register)                      Login (/login)
  zod validate → bcrypt hash               zod validate → find user → bcrypt compare
  → create User(role=MEMBER, clubId)       → createSession({userId,email,name,role,clubId})
  → create Member (Phase 2)                → setSessionCookie(jwt)
  → createSession + setSessionCookie       → ActivityLog(LOGIN)
  → redirect("/me")                        → redirect(callbackUrl ?? homeFor(role))

Every request                              Every server action
  middleware.ts verifies the JWT             const user = await requireRole("FRONT_DESK","MANAGER","OWNER")
  (Edge, jose) and checks canAccess()        → every query filtered by user.clubId
  → redirect to /login?callbackUrl=…         → mutation wrapped with ActivityLog(old/new JSON)

Forgot password                            Logout
  token row (hashed, 1 h expiry) → email     POST /api/logout → clearSessionCookie → "/"
  → /reset-password?token → set new hash
```

Staff accounts are **created by the owner** in `/owner/settings` → Staff (no public staff signup). `/register` only ever creates a `MEMBER`.

### After sign-in — where each role lands

| Role | Lands on | Shell | Can also open |
|---|---|---|---|
| `OWNER` | `/owner` | phone-first owner shell | everything |
| `MANAGER` | `/desk` | staff shell | `/desk/**`, `/shop-pos/**`, `/bar/**`, `/owner/hr`, `/owner/reports` |
| `FRONT_DESK` | `/desk` | staff shell | `/desk/**`, `/shop-pos/**` |
| `BAR_STAFF` | `/bar/pos` | staff shell (bar nav) | `/bar/**` except `/bar/menu` |
| `KITCHEN` | `/bar/kds` | full-screen KDS | `/bar/kds` only |
| `COACH` | `/coach` | staff shell (coach nav) | `/coach/**`, own bookings |
| `MEMBER` | `/me` | member app (bottom tabs) | `/me/**`, public site, `/t/[qr]` |
| guest | `/` | landing | `/courts`, `/plans`, `/shop`, `/trial`, `/contact`, `/t/[qr]` |

`/app` is the single entry: it reads the session and redirects to the row above. Deep links are preserved via `callbackUrl`. A signed-in user may always browse `/` (public site) — the nav shows "Open app" instead of "Sign in".

### Member flow after login (`/me`)
1. Home — greeting, QR membership card, expiry countdown, next booking, quick actions.
2. Book — `/me/book` date → sport → slot grid → confirm (hold 2 min) → `/me/bookings`.
3. Shop — `/me/shop` → cart → Click & Collect → `/me/orders`.
4. Tab — `/me/tab` live items; scan table QR to order; settle with UPI.
5. Profile — `/me/profile` plan, renew/upgrade, payment history, notification preferences.

### Staff flow after login (`/desk`)
1. Today board (court grid + who's here + alerts) is the home screen.
2. Quick book in a modal — never leave the board.
3. Member search / QR scan → Member 360 → actions (renew, check-in, note).
4. Leads kanban for the day's follow-ups.

### Owner flow after login (`/owner`)
Today/Week/Month KPIs → drill into finance, invoices, HR; `/owner/ask` for ad-hoc questions; `/owner/settings` to change the rules everyone else reads.

---

## Conventions (unchanged)
- Server actions in `lib/actions/`, zod-validated, start with `requireRole`.
- Every model: `id cuid`, `hashId autoincrement`, `clubId`, `createdAt/updatedAt`.
- Money in integer paise. Times in UTC, displayed in `club.timezone`.
- One `LedgerEntry` per rupee moved; one `ActivityLog` per mutation.
- UI: dense + ≥44 px targets on staff screens; mobile-first on member/owner. Reuse the landing tokens (`--plum`, `--mint`, `--coral`, `--mustard`, `--sky`).
