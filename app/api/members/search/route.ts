import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { searchMembers } from "@/lib/bar/queries";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const rows = await searchMembers(user.clubId, q);
  return NextResponse.json(rows.map((m) => ({ ...m, plan: m.plan?.name ?? null })));
}
