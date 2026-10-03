import type { ReactNode } from "react";

export default function PrintLayout({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: "100vh", background: "var(--color-bg, #f6f6f8)" }}>{children}</div>;
}
