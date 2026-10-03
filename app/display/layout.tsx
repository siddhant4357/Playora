/**
 * /display — court-side TV. No chrome at all; the page owns the viewport.
 */
export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>{children}</div>;
}
