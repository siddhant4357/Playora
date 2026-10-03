import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { bookCourt, cancelBooking, checkAvailability, myBookings, resolveContext, TOOL_DEFS } from "@/lib/agent/tools";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Vapi "tool-calls" server URL. Vapi's LLM decides to call a function; we
 * execute the SAME functions the WhatsApp agent uses and speak the result back.
 * Request/response shape: https://docs.vapi.ai/tools/custom-tools
 */
interface VapiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown> | string;
}
interface VapiBody {
  message?: {
    type?: string;
    toolCallList?: VapiToolCall[];
    call?: { customer?: { number?: string }; phoneNumber?: { number?: string } };
    customer?: { number?: string };
  };
}

function authorised(req: Request) {
  const secret = process.env.VAPI_SERVER_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const given = req.headers.get("x-vapi-secret") ?? "";
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorised(req)) return new NextResponse("Unauthorised", { status: 401 });
  const body = (await req.json()) as VapiBody;
  const msg = body.message;
  if (!msg || msg.type !== "tool-calls" || !msg.toolCallList?.length) return NextResponse.json({ results: [] });

  const phone = msg.call?.customer?.number ?? msg.customer?.number ?? "+910000000000";
  const club = await prisma.club.findFirst({ select: { id: true } });
  if (!club) return NextResponse.json({ results: [] }, { status: 500 });
  const ctx = await resolveContext(club.id, phone, "PHONE");

  const results = await Promise.all(
    msg.toolCallList.map(async (call) => {
      const args = (typeof call.arguments === "string" ? safeJson(call.arguments) : call.arguments) ?? {};
      try {
        const result = await dispatch(call.name, args, ctx);
        return { toolCallId: call.id, result: JSON.stringify(result) };
      } catch (e) {
        console.error("[vapi tool]", call.name, e);
        return { toolCallId: call.id, result: JSON.stringify({ ok: false, error: "Something went wrong. Please try again." }) };
      }
    }),
  );
  return NextResponse.json({ results });
}

function safeJson(s: string) {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function dispatch(name: string, args: Record<string, unknown>, ctx: Awaited<ReturnType<typeof resolveContext>>) {
  const str = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : undefined);
  switch (name) {
    case "checkAvailability":
      return checkAvailability(ctx, { date: str("date"), sport: str("sport"), fromTime: str("fromTime") });
    case "book":
      return bookCourt(ctx, { date: str("date"), time: str("time") ?? "", court: str("court"), sport: str("sport"), guestName: str("guestName") });
    case "myBookings":
      return myBookings(ctx);
    case "cancel":
      return cancelBooking(ctx, { bookingId: str("bookingId") });
    default:
      return { ok: false, error: `Unknown tool ${name}` };
  }
}

/** GET returns the tool definitions so you can paste them into the Vapi dashboard (see SETUP.md). */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const tools = Object.entries(TOOL_DEFS).map(([name, def]) => ({
    type: "function",
    function: {
      name,
      description: def.description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(Object.entries(def.params).map(([k, d]) => [k, { type: "string", description: d }])),
        required: name === "book" ? ["time"] : [],
      },
    },
    server: { url: `${origin}/api/vapi/tools` },
  }));
  return NextResponse.json({ tools });
}
