# Yolla — Implementation Plan & Status

Sports Club Management System for The Champions Club (Odoo Hackathon).
Branch: `v0/landing-courtos`. Spec and single source of truth: `CONTEXT.md`.
Detailed per-step notes live in `docs/IMPLEMENTATION_PLAN.md`; this file is the status board.

Legend: `[x]` done · `[~]` partial · `[ ]` not started

## Summary

| Phase | Scope | Status |
|---|---|---|
| 0 | Landing, auth, roles, shells, seed | `[x]` Complete |
| 1 | Booking engine | `[~]` Core done; waitlist auto-promote + live landing grid left |
| 2 | Members | `[x]` Complete |
| 3 | Bar & cafeteria | `[~]` Done except offline queue |
| 4 | Shop & inventory | `[~]` Done except product CRUD with images |
| 5 | Public site & leads | `[x]` Complete |
| 6 | Owner & finance | `[~]` Done except `/owner/settings` and scheduled report emails |
| 7 | HR | `[ ]` Not started |
| 8 | Integrations (WhatsApp, voice, Ask-AI) | `[~]` Email notifications + expiry cron only |
| 9 | Wow features | `[~]` `/display` stub only |
| 10 | Polish | `[ ]` Not started |

---

## Phase 0 — Foundation `[x]`

- `[x]` 0.1 Landing page (`components/landing/*`, `app/landing.css`)
- `[x]` 0.2 `Club` model, 7 roles on `User` (OWNER MANAGER FRONT_DESK BAR_STAFF KITCHEN COACH MEMBER)
- `[x]` 0.3 Auth: jose JWT, `getCurrentUser`, `requireRole`, password reset flow
- `[x]` 0.4 Role-aware routing (`lib/roles.ts` homeFor/canAccess, `/app` entry)
- `[x]` 0.5 Role shells `app/(staff)/*`, `app/(member)/me`, `lib/nav.ts`
- `[x]` 0.6 Seed script — club, 7 demo users, courts, plans, members, menu, products, leads, 6 weeks of finance history

## Phase 1 — Booking engine `[~]`

- `[x]` 1.1 Schema: `Court`, `CourtPricing`, `Booking`, `Waitlist`; Postgres `EXCLUDE USING gist` no-overlap constraint
- `[x]` 1.2 Slot generation (`lib/booking/slots.ts`)
- `[x]` 1.3 Pricing — peak/off-peak, member plan discounts (`lib/booking/price.ts`)
- `[x]` 1.4 `book()` / `cancel()` kernel with race-safe transactions (`lib/booking/engine.ts`, 16-check integration test)
- `[x]` 1.5 Member UI `/me/book`, `/me/bookings`
- `[x]` 1.6 Desk board `/desk` with walk-in booking and check-in
- `[ ]` 1.7 Cancel → waitlist auto-promotion with one-tap confirm (model + policy exist; promotion flow not wired)
- `[ ]` 1.8 Landing hero grid + "Free this week" read live data (still `components/landing/data.ts`)

## Phase 2 — Members `[x]`

- `[x]` 2.1 Schema: `MembershipPlan`, `Member`, `Payment`, `CheckIn`, `MemberNote`
- `[x]` 2.2 `/desk/members/new` registration with plan, first payment, QR
- `[x]` 2.3 `/desk/members` table with filters
- `[x]` 2.4 `/desk/members/[id]` Member 360 with unified timeline
- `[x]` 2.5 `/me` home (QR card, expiry, next booking), `/me/profile`
- `[x]` 2.6 `/desk/checkin` camera QR scan (`@zxing/browser`)
- `[x]` 2.7 Expiry reminders — `/api/cron/membership-expiry` (daily via `vercel.json`), email via Nodemailer

## Phase 3 — Bar & cafeteria `[~]`

- `[x]` 3.1 Schema: `BarTable`, `BarTab`, `BarTabItem`, `Shift`; kernel `moveStock` / `postTransaction` / `logActivity`
- `[x]` 3.2 `/bar/pos` table map → tab, member attach with discount, send to kitchen
- `[x]` 3.3 `/bar/kds` ticket board with timers
- `[x]` 3.4 Settle with split payments, void with reason (audit log)
- `[x]` 3.5 `/bar/tabs`, `/bar/tabs/[id]`, `/bar/menu` with 86'd toggle
- `[x]` 3.6 `/bar/shift` open/close → ledger
- `[x]` 3.7 `/t/[token]` guest QR ordering
- `[ ]` 3.8 Offline order queue (IndexedDB replay)

## Phase 4 — Shop & inventory `[~]`

- `[x]` 4.1 Schema: `Product`, `StockMovement`, `ShopOrder`, `ShopOrderItem`, `ServiceJob`
- `[x]` 4.2 `/shop-pos` counter sale with member discount and split payment
- `[x]` 4.3 `/shop-pos/inventory` levels, low-stock, adjustments, movement history
- `[ ]` 4.4 `/shop-pos/products` CRUD with image upload (Blob) — products are seed-only today
- `[x]` 4.5 Public `/shop`, `/shop/[sku]`, member cart `/me/shop`, Click & Collect / Delivery (payment simulated, no gateway)
- `[x]` 4.6 `/shop-pos/orders` fulfilment queue, `/shop-pos/services` restringing jobs, `/me/orders`

## Phase 5 — Public site & leads `[x]`

- `[x]` 5.1 Schema: `Lead`, `LeadActivity`
- `[x]` 5.2 `/courts` public 7-day availability grid
- `[x]` 5.3 `/plans`, `/contact` → `Lead(NEW)`
- `[x]` 5.4 `/trial` real free slots → lead + trial booking + confirmation
- `[x]` 5.5 `/desk/leads` kanban (`@dnd-kit`), `/desk/leads/[id]` detail
- `[x]` 5.6 Printable quote `/print/quote/[leadId]`, convert lead → member
- `[x]` 5.7 Landing CTAs point at `/trial`

## Phase 6 — Owner & finance `[~]`

- `[x]` 6.1 Schema: `Transaction` ledger (source, mode, direction, amount, tax), `Invoice`, `InvoiceItem`, `Payable`, `ReportShare`
- `[x]` 6.2 `/owner` dashboard — today/week/month with like-for-like deltas, revenue chart, source × payment-mode matrix, court heatmap, alerts
- `[x]` 6.3 `/owner/finance` ledger with filters + CSV export; `/owner/invoices` issue / mark paid / void; printable GST invoice `/print/invoice/[id]` (CGST/SGST split)
- `[x]` 6.4 `/owner/payables` (paying posts ledger OUT), `/owner/tax` GST by slab and source
- `[ ]` 6.5 `/owner/settings` — courts & pricing, plans, booking rules, tax rates, staff & roles (all seed-driven today)
- `[~]` 6.6 `/owner/reports` — shareable read-only link `/r/[token]` done; scheduled email summary not built

## Phase 7 — HR `[ ]`

- `[ ]` 7.1 Schema: `Employee`, `ShiftSchedule`, `LeaveRequest`, `PayrollRun`, `Payslip`
- `[ ]` 7.2 `/desk/shifts` rota + clock in/out
- `[ ]` 7.3 `/owner/hr`, `/owner/hr/leave` approvals
- `[ ]` 7.4 `/owner/hr/payroll` generate → approve → mark paid → ledger OUT + payslip

## Phase 8 — Integrations `[~]`

- `[~]` 8.1 Notification service with fallback chain — email only today
- `[ ]` 8.2 WhatsApp (Twilio) inbound agent with `checkAvailability` / `book` / `cancel` / `myBookings` tools
- `[ ]` 8.3 Voice (Vapi) tools reusing the same functions
- `[ ]` 8.4 `/owner/ask` natural-language questions → scoped read-only SQL → answer + chart

## Phase 9 — Wow features `[~]`

- `[ ]` 9.1 Waitlist auto-promote (same as 1.7)
- `[ ]` 9.2 Friday social matchmaker by `skillRating`
- `[~]` 9.3 `/display` court-side TV — placeholder page only
- `[ ]` 9.4 Churn radar (no visit in 21 days + expiring)
- `[ ]` 9.5 Dynamic off-peak pricing suggestions
- `[ ]` 9.6 Offline POS (same as 3.8)

## Phase 10 — Polish `[ ]`

- `[ ]` PWA manifest + icons
- `[ ]` README demo script
- `[ ]` Lighthouse pass on `/`, `/me`, `/desk`
- `[ ]` Rehearse demo ×3

---

## Suggested order for what's left

1. **6.5 `/owner/settings`** — judges will ask "where do I change a price?"; everything is seed-only right now.
2. **1.7 / 9.1 Waitlist auto-promote** — model and policy already exist; small engine change, big demo moment.
3. **1.8 Live landing grid** — makes the first screen real.
4. **9.3 `/display`** — reuse the desk board read-only; cheap and visible.
5. **8.4 `/owner/ask`** — highest wow-per-hour of the AI items.
6. **4.4 Product CRUD**, then **Phase 7 HR**, then **8.2 / 8.3** if time allows.
7. **Phase 10** before the demo.

## Verification

- `npx tsc --noEmit`
- `npx tsx scripts/test-booking-engine.ts` (16 checks) · `scripts/test-bar-engine.ts` (29) · `scripts/test-shop-engine.ts` (30)
- Seed: `npx tsx prisma/seed.ts` · reset finance history: `npx tsx scripts/reset-seed-history.ts`
- Demo logins: `owner|manager|desk|bar|kitchen|coach|member@champions.club` / `demo1234`
