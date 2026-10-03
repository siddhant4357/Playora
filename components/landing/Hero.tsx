import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Clock3,
  Grid2x2,
  MessageSquare,
  Plus,
  QrCode,
  Search,
  Settings,
  ShoppingBag,
  Trophy,
  UserRound,
  Users,
  Utensils,
  Wine,
  AlertTriangle,
  BadgePercent,
} from "lucide-react";
import { heroCourts, heroTimes, whosHere } from "./data";

const slotLabel: Record<string, string> = {
  free: "Free",
  booked: "Booked",
  social: "Social",
  maint: "Maint.",
  just: "Just now",
};

export function Hero() {
  return (
    <section className="lh" aria-labelledby="hero-title">
      <div className="l-container">
        <h1 id="hero-title">
          The whole club. <span className="hl">One screen.</span>
        </h1>
        <p className="lh-sub">
          Courts, members, bar, shop and the money — one record per person, one ledger for every rupee.
          Built for The Champions Club&apos;s Friday rush, ready for any club.
        </p>
        <div className="lh-actions">
          <Link href="/register" className="btn btn-primary btn-lg">
            Book a trial session
          </Link>
          <a href="#courts" className="btn btn-outline btn-lg">
            See what&apos;s free this week
          </a>
        </div>
        <p className="lh-micro">
          Members, staff and the owner all sign in with one account. <Link href="/login">Staff sign in</Link>
        </p>
      </div>

      <div className="lh-stage l-container">
        <svg className="lh-sparkle" width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          <line x1="36" y1="8" x2="36" y2="0" stroke="#e07a7a" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="36" y1="8" x2="46" y2="1" stroke="#e07a7a" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="36" y1="8" x2="26" y2="1" stroke="#e07a7a" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="36" y1="8" x2="52" y2="6" stroke="#e07a7a" strokeWidth="2" strokeLinecap="round" />
          <line x1="36" y1="8" x2="20" y2="6" stroke="#e07a7a" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="lh-note" aria-hidden="true">
          <span>the front desk, Friday 6 pm</span>
          <svg width="46" height="40" viewBox="0 0 46 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M2 4c14 2 26 12 30 32" />
            <path d="M24 30l8 6 4-9" />
          </svg>
        </div>
        <div className="lh-arc" aria-hidden="true" />

        <div className="win" role="img" aria-label="Yolla front desk today board showing the live court grid, who is checked in, and alerts">
          <div className="win-bar">
            <span className="win-logo" aria-hidden="true">
              <Trophy size={13} strokeWidth={2.5} />
            </span>
            <span className="win-title">Front desk</span>
            <div className="win-tabs" aria-hidden="true">
              <span className="on">Today</span>
              <span>Bookings</span>
              <span>Members</span>
              <span>Leads</span>
              <span>Reports</span>
            </div>
            <div className="win-right" aria-hidden="true">
              <span className="win-icon">
                <MessageSquare size={13} />
                <i className="dot" />
              </span>
              <span className="win-icon">
                <Clock3 size={13} />
              </span>
              <span className="win-icon">
                <Settings size={13} />
              </span>
              <span className="win-av">PK</span>
            </div>
          </div>

          <div className="win-tool" aria-hidden="true">
            <button className="tb" type="button" tabIndex={-1}>
              <Plus size={11} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} />
              Quick book
            </button>
            <button className="tb ghost" type="button" tabIndex={-1}>
              Walk-in
            </button>
            <span className="crumb">Today board</span>
            <span className="date">
              <CalendarDays size={12} /> Fri, 3 Oct · 5 courts · 68% booked
            </span>
          </div>

          <div className="win-body">
            <aside className="win-side" aria-hidden="true">
              <div className="hd">Operations</div>
              <div className="it on">
                <Grid2x2 size={12} /> Court grid
              </div>
              <div className="it">
                <Users size={12} /> Members <span className="n">312</span>
              </div>
              <div className="it">
                <UserRound size={12} /> Leads <span className="n">7</span>
              </div>
              <div className="hd">Sales</div>
              <div className="it">
                <ShoppingBag size={12} /> Shop POS
              </div>
              <div className="it">
                <Wine size={12} /> Bar tabs <span className="n">3</span>
              </div>
              <div className="it">
                <Utensils size={12} /> Kitchen
              </div>
            </aside>

            <div className="grid-wrap">
              <div className="cg">
                <div />
                {heroTimes.map((t) => (
                  <div className="th" key={t}>
                    {t}
                  </div>
                ))}
                {heroCourts.map((c) => (
                  <HeroRow key={c.name} {...c} />
                ))}
              </div>
              <div className="legend" aria-hidden="true">
                <span>
                  <i style={{ background: "var(--mint-soft)", border: "1px solid var(--mint)" }} />
                  Free
                </span>
                <span>
                  <i style={{ background: "var(--plum-soft)", border: "1px solid var(--plum)" }} />
                  Booked
                </span>
                <span>
                  <i style={{ background: "#fff4e3", border: "1px solid #a86a0f" }} />
                  Friday social play
                </span>
                <span>
                  <i style={{ background: "var(--plum)" }} />
                  Booked 4s ago — by phone call
                </span>
              </div>
            </div>

            <aside className="win-panel" aria-hidden="true">
              <div className="ph">
                Who&apos;s here <span>3 checked in</span>
              </div>
              <div className="search">
                <Search size={12} /> Name, phone or scan QR
                <QrCode size={12} style={{ marginLeft: "auto" }} />
              </div>
              <div className="who">
                {whosHere.map((p) => (
                  <div className="row" key={p.name}>
                    <span className="av" style={{ background: p.color }}>
                      {p.initials}
                    </span>
                    <div>
                      <div className="nm">{p.name}</div>
                      <div className="sub">{p.sub}</div>
                    </div>
                    <span className={`tag ${p.plan}`}>{p.plan === "gold" ? "Gold · Free" : p.plan[0].toUpperCase() + p.plan.slice(1)}</span>
                  </div>
                ))}
              </div>
              <div className="alerts">
                <div className="al">
                  <Bell size={12} color="#e07a7a" />
                  <span>
                    <b>4 memberships</b> expire this week
                  </span>
                </div>
                <div className="al">
                  <AlertTriangle size={12} color="#f6a945" />
                  <span>
                    <b>Shuttlecocks</b> below reorder level
                  </span>
                </div>
                <div className="al">
                  <BadgePercent size={12} color="#2fb8a0" />
                  <span>
                    <b>2 new leads</b> from the website
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroRow({ name, sport, slots }: (typeof heroCourts)[number]) {
  return (
    <>
      <div className="rh">
        {name}
        <small>{sport}</small>
      </div>
      {slots.map((s, i) => (
        <div className={`sl ${s}`} key={`${name}-${i}`}>
          {slotLabel[s]}
        </div>
      ))}
    </>
  );
}
