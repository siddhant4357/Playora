import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export const metadata: Metadata = { title: "Home" };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function MemberHomePage() {
  const user = await getCurrentUser();
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {greeting()},
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{firstName}</h1>
      </header>
      <PagePlaceholder
        title="Your club, in your pocket"
        phase="Phase 2 — Members"
        description="Your membership card, expiry countdown and next booking live here, with one-tap shortcuts to book a court or open your bar tab."
        bullets={["QR membership card for check-in", "Next booking and quick re-book", "Plan, renew and payment history under Profile"]}
      />
    </div>
  );
}
