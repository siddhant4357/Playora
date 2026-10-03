import Link from "next/link";
import { Sparkles } from "lucide-react";

const kpis = [
  ["Revenue today", "₹48,250", "+12% vs last Fri"],
  ["Court utilisation", "82%", "Peak 6 – 9 pm"],
  ["Bar covers", "64", "3 tabs open"],
  ["New members", "3", "2 from trials"],
];

const sources = [
  ["Courts", 46, "₹22.1k"],
  ["Bar", 31, "₹14.9k"],
  ["Shop", 14, "₹6.8k"],
  ["Plans", 9, "₹4.4k"],
];

export function Owner() {
  return (
    <section className="owner fu" id="owner" aria-labelledby="owner-title">
      <div className="l-container owner-inner">
        <div>
          <span className="eyebrow">Scene F · Friday, 9 pm</span>
          <h2 id="owner-title">The owner opens her phone and the week is already added up.</h2>
          <p className="lead">
            Revenue by source and by payment mode. Which court sits empty after 8 pm. Who is about to lapse. No exports, no
            Sunday spreadsheet — and a question box that answers in plain language over the real ledger.
          </p>
          <Link href="/login" className="btn btn-inverse btn-lg">
            Owner sign in
          </Link>
        </div>

        <div className="phone" role="img" aria-label="Owner dashboard on a phone: KPIs, revenue by source, and an AI question box">
          <div className="scr">
            <div className="hi">
              Good evening, Meera
              <b>The Champions Club</b>
            </div>
            <div className="seg" aria-hidden="true">
              <span className="on">Today</span>
              <span>Week</span>
              <span>Month</span>
            </div>
            <div className="kpis">
              {kpis.map(([l, v, d]) => (
                <div className="kpi" key={l}>
                  <div className="l">{l}</div>
                  <div className="v">{v}</div>
                  <div className="d">{d}</div>
                </div>
              ))}
            </div>
            <div className="bars" aria-label="Revenue by source">
              {sources.map(([n, pct, amt]) => (
                <div className="b" key={n as string}>
                  <span>{n}</span>
                  <i style={{ width: `${pct}%` }} />
                  <b>{amt}</b>
                </div>
              ))}
            </div>
            <div className="ask">
              <Sparkles size={13} />
              <span>
                <em>&ldquo;Which court is least used after 8 pm?&rdquo;</em>
                <br />
                Court 4 (Squash) — 31% this month. Try a 20% off-peak price.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
