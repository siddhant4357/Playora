"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Link2, Trash2 } from "lucide-react";
import { createReportShareAction, revokeReportShareAction } from "@/lib/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Share {
  id: string;
  token: string;
  label: string;
  period: string;
  expiresAt: string;
  createdAt: string;
}

const selectCls = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function ReportShares({ shares }: { shares: Share[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("");
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function copy(token: string) {
    const url = `${origin}/r/${token}`;
    navigator.clipboard?.writeText(url).then(
      () => toast.success("Link copied."),
      () => toast.message(url)
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await createReportShareAction({ label, period, days: 30 });
            if (!res.success) return void toast.error(res.error);
            toast.success(res.message);
            setLabel("");
            copy(res.data.token);
            router.refresh();
          });
        }}
      >
        <div className="grid grid-cols-[1fr_8rem] gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-label">Label</Label>
            <Input id="rs-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="CA · monthly review" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-period">Shows</Label>
            <select id="rs-period" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className={selectCls} style={{ borderColor: "var(--color-border)" }}>
              <option value="month">This month</option>
              <option value="week">This week</option>
              <option value="today">Today</option>
            </select>
          </div>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          <Link2 className="h-4 w-4" /> {pending ? "Creating…" : "Create 30-day link"}
        </Button>
      </form>

      {shares.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          No active links. Anyone with a link sees the revenue summary for that period, read-only, no login.
        </p>
      ) : (
        <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
          {shares.map((s) => (
            <li key={s.id} className="flex items-center gap-2 py-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{s.label}</span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {s.period === "today" ? "Today" : s.period === "week" ? "This week" : "This month"} · expires {new Date(s.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
              <Button variant="ghost" size="icon" aria-label="Copy link" onClick={() => copy(s.token)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Revoke link"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await revokeReportShareAction(s.id);
                    if (!res.success) return void toast.error(res.error);
                    toast.success(res.message);
                    router.refresh();
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
