import Link from "next/link";
import { Trophy } from "lucide-react";
import { cn } from "cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Yolla home"
      className={cn("inline-flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-foreground", className)}
    >
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
      >
        <Trophy size={18} strokeWidth={2.5} />
      </span>
      Yolla
    </Link>
  );
}
