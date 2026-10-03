"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Camera, CameraOff, CheckCircle2, XCircle } from "lucide-react";
import { checkInAction, type CheckInResult } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/shared/Primitives";

export function CheckInScanner() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const lastRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });

  const submit = (token: string, method: "QR" | "MANUAL") => {
    if (!token.trim()) return;
    start(async () => {
      const res = await checkInAction({ token, method });
      setResult(res);
      setCode("");
      if (res.success && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(60);
    });
  };

  useEffect(() => {
    if (!scanning) {
      stopRef.current();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (res) => {
          if (!res || cancelled) return;
          const text = res.getText();
          const now = Date.now();
          // Ignore the same code re-read within 4s while the card is still in frame.
          if (lastRef.current.token === text && now - lastRef.current.at < 4000) return;
          lastRef.current = { token: text, at: now };
          submit(text, "QR");
        });
        stopRef.current = () => controls.stop();
        setCamError(null);
      } catch (err) {
        setCamError(err instanceof Error ? err.message : "Camera unavailable");
        setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
      stopRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl" style={{ background: "var(--color-primary-900)" }}>
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-label="Camera preview" />
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white">
              <CameraOff className="h-8 w-8 opacity-60" />
              <p className="text-sm opacity-80">{camError ?? "Camera is off"}</p>
              <Button onClick={() => setScanning(true)} variant="secondary">
                <Camera className="h-4 w-4" /> Start scanner
              </Button>
            </div>
          )}
          {scanning && (
            <>
              <div className="pointer-events-none absolute inset-0 m-auto h-48 w-48 rounded-2xl border-2 border-white/80" aria-hidden />
              <Button onClick={() => setScanning(false)} variant="secondary" size="sm" className="absolute bottom-3 right-3">
                Stop
              </Button>
            </>
          )}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(code, "MANUAL");
          }}
        >
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CC-0001 or phone" aria-label="Member code or phone" autoFocus className="font-mono" />
          <Button type="submit" disabled={pending || !code.trim()}>
            Check in
          </Button>
        </form>
      </Panel>

      {result && <ResultCard result={result} onDismiss={() => setResult(null)} />}
    </div>
  );
}

function ResultCard({ result, onDismiss }: { result: CheckInResult; onDismiss: () => void }) {
  const ok = result.success;
  const tone = ok ? "var(--color-success)" : "var(--color-danger)";
  return (
    <div role="status" aria-live="polite" className="flex items-start gap-4 rounded-2xl p-5" style={{ background: `color-mix(in oklab, ${tone} 10%, var(--color-surface))`, border: `1px solid ${tone}` }}>
      {ok ? <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0" style={{ color: tone }} /> : <XCircle className="mt-0.5 h-8 w-8 shrink-0" style={{ color: tone }} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-xl font-bold">{ok ? result.member.name : result.member?.name ?? "Not found"}</p>
        <p className="text-sm" style={{ color: ok ? "var(--color-text)" : tone }}>
          {ok ? result.message : result.error}
        </p>
        {ok && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {result.member.plan ?? "Trial"}
            {result.member.daysLeft !== null && ` · ${result.member.daysLeft} days left`}
            {result.member.booking && ` · On ${result.member.booking}`}
          </p>
        )}
        {ok && result.member.daysLeft !== null && result.member.daysLeft <= 14 && (
          <p className="text-sm font-medium" style={{ color: "var(--color-warning)" }}>
            Membership ends soon — offer a renewal while they&apos;re here.
          </p>
        )}
        <div className="mt-2 flex gap-2">
          {result.member && (
            <Button size="sm" variant="outline" render={<Link href={`/desk/members/${result.member.id}`} />}>
              Open profile
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
