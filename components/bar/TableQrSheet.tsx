"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/shared/Primitives";

export function TableQrSheet({ tables }: { tables: { id: string; name: string; zone: string; qrToken: string }[] }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <Panel title="Table QR codes" actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>}>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Guests scan to see the live menu and order to their table without an app or login. Orders land on the POS and kitchen board instantly.
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9 print:grid-cols-3">
        {tables.map((t) => (
          <figure key={t.id} className="flex flex-col items-center gap-1 rounded-xl bg-white p-2" style={{ border: "1px solid var(--color-border)" }}>
            <QRCodeSVG value={`${origin}/t/${t.qrToken}`} size={88} fgColor="#20121d" />
            <figcaption className="text-center">
              <span className="block text-sm font-bold" style={{ color: "#20121d" }}>{t.name}</span>
              <span className="block text-[10px]" style={{ color: "#6b7280" }}>{t.zone}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Panel>
  );
}
