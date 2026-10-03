import type { CSSProperties } from "react";

/** Badge colours per membership tier. Plain module so both RSC and client components can use it. */
export function tierStyle(tier?: string | null): CSSProperties {
  switch (tier) {
    case "GOLD":
      return { background: "rgba(245,158,11,0.15)", color: "#b45309" };
    case "SILVER":
      return { background: "rgba(136,136,136,0.15)", color: "var(--color-text)" };
    case "JUNIOR":
      return { background: "rgba(0,160,157,0.12)", color: "var(--color-accent-600)" };
    default:
      return { background: "var(--color-bg)", color: "var(--color-text-muted)" };
  }
}
