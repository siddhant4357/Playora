"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { submitEnquiryAction } from "@/lib/actions/public";

const INTERESTS = ["Tennis", "Padel", "Membership", "Coaching", "Events"] as const;

export function EnquiryForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <div className="pub-done" role="status">
        <CheckCircle2 size={28} color="#1a7f6f" />
        <h2>Got it.</h2>
        <p className="big">{done}</p>
        <p>While you wait — the courts are open for a free first session.</p>
        <Link href="/trial" className="btn btn-primary">
          Book a free trial
        </Link>
      </div>
    );
  }

  return (
    <form
      className="pub-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await submitEnquiryAction({
            name: String(fd.get("name") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            email: String(fd.get("email") ?? ""),
            interest: (fd.get("interest") as (typeof INTERESTS)[number]) || undefined,
            message: String(fd.get("message") ?? ""),
            company: String(fd.get("company") ?? ""),
          });
          if (res.success) setDone(res.message);
          else setError(res.error);
        });
      }}
    >
      <div className="row">
        <label>
          Your name
          <input name="name" required autoComplete="name" placeholder="Priya Sharma" />
        </label>
        <label>
          Phone
          <input name="phone" required type="tel" autoComplete="tel" placeholder="+91 98xxx xxxxx" />
        </label>
      </div>
      <div className="row">
        <label>
          Email <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
          <input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        </label>
        <label>
          I&apos;m asking about
          <select name="interest" defaultValue="Membership">
            {INTERESTS.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Message
        <textarea name="message" required rows={4} placeholder="Do you have beginner padel sessions on weekends?" />
      </label>
      <div className="hp" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <p className="pub-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? "Sending…" : "Send enquiry"}
      </button>
      <p className="pub-note">We reply by phone or WhatsApp, usually within the hour during opening hours.</p>
    </form>
  );
}
