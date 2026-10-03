"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

export function MemberQr({ token, code, name, size = 160 }: { token: string; code: string; name: string; size?: number }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return (
    <figure className="flex flex-col items-center gap-2 rounded-2xl p-4" style={{ background: "#fff", border: "1px solid var(--color-border)" }}>
      {origin ? <QRCodeSVG value={`${origin}/ci/${token}`} size={size} level="M" bgColor="#ffffff" fgColor="#20121d" includeMargin={false} aria-label={`Member pass for ${name}`} /> : <div style={{ width: size, height: size }} />}
      <figcaption className="flex flex-col items-center">
        <span className="font-mono text-sm font-semibold tracking-widest" style={{ color: "#20121d" }}>
          {code}
        </span>
        <span className="text-xs" style={{ color: "#6b7280" }}>
          {name}
        </span>
      </figcaption>
    </figure>
  );
}
