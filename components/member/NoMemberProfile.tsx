import Link from "next/link";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown on member-only pages when the signed-in user has no Member record —
 * staff accounts browsing /me, or a self-registered user the desk hasn't linked yet.
 */
export function NoMemberProfile({ feature }: { feature: string }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl p-10 text-center"
      style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border-strong)" }}
    >
      <span className="flex size-10 items-center justify-center rounded-full" style={{ background: "var(--color-surface-2)" }}>
        <UserX className="h-5 w-5" style={{ color: "var(--color-text-muted)" }} />
      </span>
      <p className="text-sm font-medium">No member profile on this account</p>
      <p className="max-w-sm text-sm text-pretty" style={{ color: "var(--color-text-muted)" }}>
        {`This login isn't linked to a club membership yet, so there's nothing to show for ${feature}. Ask the front desk to link it, or sign in with a member account.`}
      </p>
      <Button variant="outline" size="sm" render={<Link href="/me" />} nativeButton={false}>
        Back to home
      </Button>
    </div>
  );
}
