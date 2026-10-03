/**
 * Instant placeholder rendered by each area's loading.tsx while the server
 * component for the route streams in. Keeps sidebar navigation feeling
 * immediate instead of leaving the previous page frozen on screen.
 */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6 animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-2">
        <div className="h-7 w-56 rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
