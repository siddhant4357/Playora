import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchMembers } from "@/lib/bar/queries";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role === "MEMBER") return NextResponse.json([], { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json(await searchMembers(user.clubId, q));
}
