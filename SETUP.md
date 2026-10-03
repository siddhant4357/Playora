# Playora — setup & integrations

Everything the app needs to run, and the optional integrations that light up
WhatsApp, voice and Ask AI. The app works with **only the required vars**;
every integration degrades gracefully (console log / in-app / vetted offline
queries) when its keys are absent.

## 1. Required

| Var | What |
| --- | --- |
| `DATABASE_URL` | Postgres (Prisma Postgres, Neon, Supabase — anything with `btree_gist`). |
| `JWT_SECRET` | 32+ random bytes. `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | Public origin, e.g. `https://playora.vercel.app`. Used in QR codes, share links and WhatsApp deep links. |

```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts          # demo club, 7 roles, courts, plans, members, 6 weeks of ledger
npm run dev
```

Demo logins: `owner@champions.club`, `manager@`, `frontdesk@`, `bar@`, `kitchen@`, `coach@`, `member@` — all `demo1234`.

## 2. Email (password reset, invoices, receipts)

| Var | What |
| --- | --- |
| `GMAIL_USER` | Gmail address used as sender. |
| `GMAIL_APP_PASSWORD` | A Gmail **App Password** (Google Account → Security → 2-Step → App passwords). |

Without these, `lib/email.ts` logs the message to the server console instead of sending.

## 3. WhatsApp (Twilio sandbox) — outbound + inbound agent

Outbound confirmations and the inbound booking agent both use the free Twilio
WhatsApp **sandbox**; no business verification needed for a demo.

| Var | What |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Twilio console → Account Info. |
| `TWILIO_AUTH_TOKEN` | Same place. Also used to verify inbound webhook signatures in production. |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` (the sandbox number). |
| `TWILIO_WEBHOOK_URL` | Optional. Set to the exact public URL of the webhook if you're behind a proxy that rewrites the host (signature check uses it). |

Steps:

1. Twilio console → **Messaging → Try it out → Send a WhatsApp message**. Join the sandbox from your phone by sending the shown `join <word>` code to +1 415 523 8886.
2. In the sandbox settings, set **"When a message comes in"** to
   `https://<your-domain>/api/webhooks/twilio` (POST).
3. Message the sandbox: *"Is a padel court free tomorrow at 7pm?"* → the agent
   (`lib/agent/run.ts`) resolves you by phone, checks availability, books,
   applies your plan discount and replies in TwiML. Members are matched on the
   last 10 digits of their phone, so `+91 98200 00105` in the DB matches
   `whatsapp:+919820000105`.

The agent only has four tools — `checkAvailability`, `book`, `myBookings`,
`cancel` (`lib/agent/tools.ts`) — and they are the **same functions** the Vapi
voice endpoint uses. The booking itself goes through `lib/booking/engine.ts`,
so the Postgres `EXCLUDE` constraint still guarantees no double booking.

The notification service (`lib/notify.ts`) tries WhatsApp → email → in-app and
records which channel actually delivered.

## 4. Voice (Vapi) — "call the club and book a court"

| Var | What |
| --- | --- |
| `VAPI_SERVER_SECRET` | Any random string. Vapi sends it as `x-vapi-secret`; the endpoint rejects anything else. |

Steps:

1. Deploy, then open `https://<your-domain>/api/vapi/tools` in a browser. It
   returns the four tool definitions as JSON with the server URL already
   filled in.
2. In the Vapi dashboard → **Tools → Create**, paste each tool
   (`checkAvailability`, `book`, `myBookings`, `cancel`). Set the server URL
   to `https://<your-domain>/api/vapi/tools` and add header
   `x-vapi-secret: <VAPI_SERVER_SECRET>`.
3. Create an **Assistant** (any realtime model; GPT-4o-mini is plenty). Attach
   the four tools. Suggested first message: *"Hi, this is Playora at The
   Champions Club. Would you like to book a court?"*
   System prompt starter:

   > You are the front desk at The Champions Club, a tennis and padel club in
   > Mumbai. Help the caller check availability, book, view or cancel court
   > bookings using the tools. Dates are club-local. Confirm court, date, time
   > and price before booking. Keep answers short — this is a phone call.

4. Attach a Vapi phone number to the assistant, or use the web test call.
   The caller is identified by `call.customer.number`; a member who calls from
   their registered phone gets their plan discount automatically and the
   booking appears on the desk grid (`/desk`) immediately.

Local test without Vapi:

```bash
curl -s -X POST localhost:3000/api/vapi/tools -H 'content-type: application/json' -d '{
  "message": { "type": "tool-calls",
    "call": { "customer": { "number": "+919820000105" } },
    "toolCallList": [{ "id": "c1", "name": "book",
      "arguments": { "date": "tomorrow", "time": "7pm", "sport": "padel" } }] } }'
```

## 5. Ask AI (`/owner/ask`) and the WhatsApp agent — model access

Both use the **Vercel AI Gateway** via the AI SDK; there is no provider key
to set. On Vercel the OIDC token is injected automatically. Locally, run
`vercel env pull` or set `AI_GATEWAY_API_KEY` from the Vercel dashboard → AI.

> The Gateway requires a card on file for the team before it serves requests
> (it then unlocks free credits). Until then, Ask AI falls back to vetted
> queries for the six suggested questions and tells you so; the WhatsApp
> agent degrades to a **rule-based desk** (`lib/agent/fallback.ts`) that
> still understands "free padel tomorrow", "book tennis 7pm", "my bookings"
> and "cancel", and calls the same kernel tools — so bookings go through
> either way. Each reply is logged with `engine: "model" | "rules"`.
> The Vapi voice agent never needs the Gateway: Vapi hosts the LLM and only
> calls `/api/vapi/tools` for facts and actions.

How the agents run "in the background": there is no long-running process.
Twilio and Vapi POST to the two routes above on each message / tool call,
so they work on any deployment with a public URL (Vercel preview or
production). The v0 preview is not reachable by Twilio; set the webhook to
your deployed URL. `/owner/settings` shows which of the four integrations
has its variables set.

Ask AI safety model (`lib/ask/engine.ts`):

- The model sees only a hand-written table catalogue, never row data.
- Output must be a single `SELECT`/CTE over allow-listed tables and must
  contain the caller's `clubId` literal; anything else is rejected before it
  reaches the DB.
- The query runs inside `SET TRANSACTION READ ONLY` with a 4 s statement
  timeout, so even a guard miss cannot write.
- Every question is written to the activity log.

Tests: `npx tsx scripts/test-ask-guard.ts` (16 checks) and
`npx tsx scripts/test-ask-canned.ts` (all suggested questions, offline path).

## 6. Cron

| Var | What |
| --- | --- |
| `CRON_SECRET` | Protects `/api/cron/*` (reminders, expiry nudges). Vercel Cron sends it as a bearer token. |

## 7. Engine tests

```bash
npx tsx scripts/test-booking-engine.ts   # 16 checks incl. parallel race
npx tsx scripts/test-bar-engine.ts       # 29
npx tsx scripts/test-shop-engine.ts      # 30
npx tsx scripts/test-hr-engine.ts
npx tsx scripts/test-ask-guard.ts        # 16
npx tsx scripts/test-ask-canned.ts
npx tsx scripts/test-agent-fallback.ts  # 15 — WhatsApp desk without a model
```

All scripts need `DATABASE_URL`; run with
`set -a && source .env.local && set +a` (or `node --env-file`).
