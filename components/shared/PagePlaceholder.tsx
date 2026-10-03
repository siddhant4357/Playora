/**
 * components/shared/PagePlaceholder.tsx
 *
 * Honest "not built yet" state for routes that exist in the nav but whose
 * phase has not landed. Shows what the page will do and which phase ships it
 * so the product shape is visible during development and demos.
 */

import { Construction } from "lucide-react";

interface PagePlaceholderProps {
  title: string;
  description: string;
  phase: string;
  bullets?: string[];
}

export function PagePlaceholder({ title, description, phase, bullets }: PagePlaceholderProps) {
  return (
    <section
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl p-6 sm:p-8"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "rgba(113,75,103,0.12)", color: "#714B67" }}
        >
          <Construction className="h-5 w-5" />
        </span>
        <div className="flex flex-col">
          <h1
            className="text-lg font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            {title}
          </h1>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Ships in {phase}
          </span>
        </div>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        {description}
      </p>
      {bullets && bullets.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm" style={{ color: "var(--color-text)" }}>
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span aria-hidden style={{ color: "#714B67" }}>
                –
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
