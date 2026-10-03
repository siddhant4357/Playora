"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, Code2, Loader2, Sparkles } from "lucide-react";
import { askAction, type AskState } from "@/lib/actions/ask";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/shared/Primitives";

export function AskPanel({ suggestions }: { suggestions: string[] }) {
  const [state, action, pending] = useActionState<AskState | null, FormData>(askAction, null);
  const [question, setQuestion] = useState("");
  const [showSql, setShowSql] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setShowSql(false);
  }, [state]);

  const submitSuggestion = (q: string) => {
    setQuestion(q);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  };

  return (
    <div className="flex flex-col gap-5">
      <form ref={formRef} action={action} className="flex flex-col gap-3">
        <label htmlFor="ask-q" className="sr-only">
          Ask a question about the club
        </label>
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: "var(--color-primary-500)" }} aria-hidden />
          <input
            id="ask-q"
            name="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229 && !pending) formRef.current?.requestSubmit();
            }}
            placeholder="e.g. Which court made the most money last month?"
            className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
            autoComplete="off"
            maxLength={400}
            required
          />
          <Button type="submit" size="sm" disabled={pending || question.trim().length < 3}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Ask"}
          </Button>
        </div>
        {!state && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submitSuggestion(s)}
                className="rounded-full border px-3 py-1 text-xs transition-colors hover:border-[var(--color-primary-500)]"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>

      {pending && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Writing the query and running it against the ledger…
        </p>
      )}

      {state && !state.ok && !pending && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: "color-mix(in oklch, var(--color-danger) 40%, transparent)", background: "color-mix(in oklch, var(--color-danger) 8%, transparent)" }}
          role="alert"
        >
          <b>{state.code === "UNSAFE" ? "Blocked for safety: " : state.code === "MODEL" ? "AI unavailable: " : ""}</b>
          {state.error}
        </div>
      )}

      {state?.ok && !pending && (
        <>
          <Panel>
            <p className="text-base leading-relaxed">{state.result.answer}</p>
            <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {state.result.rows.length} row{state.result.rows.length === 1 ? "" : "s"} · {state.result.ms} ms · read-only, scoped to this club
              {state.result.viaFallback && " · answered from a vetted query (AI Gateway offline)"}
            </p>
          </Panel>

          {state.result.chart && <ResultChart result={state.result} />}

          {state.result.rows.length > 0 && (
            <Panel title="Results">
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {state.result.columns.map((c) => (
                        <th key={c} className="whitespace-nowrap py-2 pr-4 font-medium">
                          {c.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.result.rows.slice(0, 50).map((r, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--color-border)" }}>
                        {state.result.columns.map((c) => (
                          <td key={c} className="whitespace-nowrap py-2 pr-4">
                            {formatCell(r[c], c, state.result.chart)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowSql((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--color-text-muted)" }}
              aria-expanded={showSql}
            >
              <Code2 className="h-3.5 w-3.5" aria-hidden />
              {showSql ? "Hide" : "Show"} SQL
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSql ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {showSql && (
              <pre
                className="mt-2 overflow-x-auto rounded-xl border p-4 font-mono text-xs leading-relaxed"
                style={{ background: "var(--color-surface-2, var(--color-surface))", borderColor: "var(--color-border)" }}
              >
                {state.result.sql}
              </pre>
            )}
          </div>
        </>
      )}
    </div>
  );
}

type AskOk = Extract<AskState, { ok: true }>["result"];

function formatCell(v: unknown, col: string, chart: AskOk["chart"]) {
  if (v == null) return "—";
  if (typeof v === "number") {
    const isMoney = (chart?.yIsPaise && chart.y === col) || /amount|revenue|total|price|paise|net|gross|credit|salary|spend|sales/i.test(col);
    return isMoney && Number.isInteger(v) && Math.abs(v) >= 100 ? formatPaise(v) : v.toLocaleString("en-IN");
  }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  return String(v);
}

function ResultChart({ result }: { result: AskOk }) {
  const chart = result.chart!;
  const data = result.rows.slice(0, 60).map((r) => ({ x: String(r[chart.x]).slice(0, 10), y: Number(r[chart.y] ?? 0) }));
  const fmt = (v: number) => (chart.yIsPaise ? formatPaise(v) : v.toLocaleString("en-IN"));
  const Chart = chart.kind === "line" ? LineChart : BarChart;
  return (
    <Panel title={chart.y.replace(/_/g, " ")}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => (chart.yIsPaise ? `₹${Math.round(v / 100).toLocaleString("en-IN")}` : String(v))} />
            <Tooltip
              formatter={(v) => fmt(Number(v))}
              contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
            />
            {chart.kind === "line" ? (
              <Line type="monotone" dataKey="y" stroke="var(--color-primary-500)" strokeWidth={2} dot={false} />
            ) : (
              <Bar dataKey="y" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} />
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
