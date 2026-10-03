"use client";

import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/shared/Primitives";

export function TableQrSheet({ tables }: { tables: { id: string; name: string; zone: string; url: string }[] }) {
  return (
    <Panel
      title="Table QR codes"
      actions={
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print sheet
        </Button>
      }
    >
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Guests scan to see the live menu and order to their table without an app. Orders land on the POS floor map and the kitchen screen.
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-3">
        {tables.map((t) => (
          <li key={t.id} className="flex flex-col items-center gap-1 rounded-2xl p-3" style={{ background: "#fff", border: "1px solid var(--color-border)" }}>
            <QRCodeSVG value={typeof window !== "undefined" && t.url.startsWith("/") ? `${window.location.origin}${t.url}` : t.url} size={112} fgColor="#20121d" />
            <span className="text-lg font-bold" style={{ color: "#20121d" }}>
              {t.name}
            </span>
            <span className="text-xs" style={{ color: "#6b7280" }}>
              {t.zone} · Scan to order
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
