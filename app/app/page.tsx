/**
 * /app — single entry point after sign-in.
 * Middleware normally redirects before this renders; this is the fallback
 * for environments where middleware does not run (e.g. static export).
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homeFor } from "@/lib/roles";

export default async function AppEntryPage() {
  const user = await getCurrentUser();
  redirect(user ? homeFor(user.role) : "/login");
}
