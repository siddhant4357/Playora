import type { PaymentMode, TxDirection, TxSource } from "@/generated/prisma/client";
import type { Period } from "@/lib/finance/queries";
import { MODE_LABEL, SOURCE_LABEL } from "@/lib/finance/labels";

export interface LedgerUiFilters {
  source?: TxSource;
  mode?: PaymentMode;
  direction?: TxDirection;
  q?: string;
}

const SOURCES = Object.keys(SOURCE_LABEL) as TxSource[];
const MODES = Object.keys(MODE_LABEL) as PaymentMode[];

export function parseLedgerFilters(sp: Record<string, string | undefined>): LedgerUiFilters {
  return {
    source: SOURCES.includes(sp.source as TxSource) ? (sp.source as TxSource) : undefined,
    mode: MODES.includes(sp.mode as PaymentMode) ? (sp.mode as PaymentMode) : undefined,
    direction: sp.direction === "IN" || sp.direction === "OUT" ? sp.direction : undefined,
    q: sp.q?.trim() ? sp.q.trim().slice(0, 80) : undefined,
  };
}

const selectCls = "h-8 rounded-md border bg-transparent px-2 text-xs";

/** Plain GET form: the URL is the state, so filtered views are shareable and the CSV link inherits them. */
export function LedgerFilters({ period, filters }: { period: Period; filters: LedgerUiFilters }) {
  const style = { borderColor: "var(--color-border)", color: "var(--color-text)" };
  return (
    <form method="get" action="/owner/finance" className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="period" value={period} />
      <label className="sr-only" htmlFor="lf-direction">
        Direction
      </label>
      <select id="lf-direction" name="direction" defaultValue={filters.direction ?? ""} className={selectCls} style={style}>
        <option value="">In & out</option>
        <option value="IN">Money in</option>
        <option value="OUT">Money out</option>
      </select>
      <label className="sr-only" htmlFor="lf-source">
        Source
      </label>
      <select id="lf-source" name="source" defaultValue={filters.source ?? ""} className={selectCls} style={style}>
        <option value="">All sources</option>
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {SOURCE_LABEL[s]}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="lf-mode">
        Payment mode
      </label>
      <select id="lf-mode" name="mode" defaultValue={filters.mode ?? ""} className={selectCls} style={style}>
        <option value="">All modes</option>
        {MODES.map((m) => (
          <option key={m} value={m}>
            {MODE_LABEL[m]}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="lf-q">
        Search
      </label>
      <input id="lf-q" name="q" defaultValue={filters.q ?? ""} placeholder="Search description or ref" className="h-8 w-44 rounded-md border bg-transparent px-2 text-xs" style={style} />
      <button type="submit" className="h-8 rounded-md px-3 text-xs font-medium" style={{ background: "var(--color-primary-500)", color: "var(--color-primary-foreground)" }}>
        Apply
      </button>
    </form>
  );
}
