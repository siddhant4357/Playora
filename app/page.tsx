
"use client";

import Footer from "@/components/shared/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { ShoppingCart, TrendingUp, Factory, Calculator, Truck, PackageCheck } from "lucide-react";
import "./home.css";

export default function HomePage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("vis");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".fu").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>


      {/*  ╔══════════════════════════════ NAVBAR ══════════════════════════════╗  */}
      <nav className="main-nav">
        <div className="nav-logo">ldxodoo</div>
        <ul className="nav-links">
          <li><a href="#">Inventory ▾</a></li>
          <li><div className="nav-div"></div></li>
          <li><a href="#" className="active">Overview</a></li>
          <li><a href="#">Features</a></li>
          <li><a href="#">Hardware</a></li>
        </ul>
        <div className="nav-right">
          <ThemeToggle />
          <a href="/login" className="btn-signin">Sign in</a>
          <a href="/register" className="btn-nav">Try it free</a>
        </div>
      </nav>

      {/*  ╔══════════════════════════════ HERO ════════════════════════════════╗  */}
      <div className="hero">
        <h1 className="hw"><span className="hero-word-modern">Modern</span> inventory system</h1>
        <p className="hero-sub">Reduce stockouts, speed up operations, optimize routes and get real time visibility with LDXODOO&apos;s warehouse management app.</p>
        <div className="hero-btns">
          <Link href="/register"><button className="btn-hero">Start now - It&apos;s free</button></Link>
          <button className="btn-hero-sec">Meet an advisor</button>
        </div>
        <p className="hero-micro">Free, forever, with unlimited users. <strong>See why</strong></p>

        {/*  Screenshot wrapper  */}
        <div className="ss-wrap">
          {/*  Coral sparkle burst (top-left)  */}
          <svg style={{ "position": "absolute", "top": "-28px", "left": "40px", "zIndex": "2" }} width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
            <line x1="36" y1="8" x2="36" y2="0" stroke="#e07a7a" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="36" y1="8" x2="46" y2="1" stroke="#e07a7a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="36" y1="8" x2="26" y2="1" stroke="#e07a7a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="36" y1="8" x2="52" y2="6" stroke="#e07a7a" strokeWidth="2" strokeLinecap="round" />
            <line x1="36" y1="8" x2="20" y2="6" stroke="#e07a7a" strokeWidth="2" strokeLinecap="round" />
            <circle cx="36" cy="10" r="3.5" fill="#e07a7a" opacity=".25" />
          </svg>

          {/*  Background arc  */}
          <div className="ss-arc"></div>

          {/*  App window card  */}
          <div className="ss-card">
            {/*  App top bar  */}
            <div className="app-bar">
              <div className="app-logo">LX</div>
              <div className="app-title">Inventory</div>
              <div className="app-nav-items">
                <span>Overview</span><span>Operations</span><span>Products</span>
                <span>Reporting</span><span className="active-nav">Configuration</span>
              </div>
              <div className="app-bar-right">
                <div className="icon-btn">💬<span className="dot"></span></div>
                <div className="icon-btn">🕐<span className="dot"></span></div>
                <div className="icon-btn">⚙</div>
                <div className="av">A</div>
              </div>
            </div>

            {/*  Toolbar  */}
            <div className="toolbar">
              <button className="tbtn">New</button>
              <button className="tbtn">Order</button>
              <button className="tbtn">Snooze</button>
              <button className="tbtn">Order To Max</button>
              <span className="tbc">Replenishment</span>
              <div className="t-right">
                <span className="chip">3 selected ✕</span>
                <span className="tact">⚙ Actions</span>
                <span className="tpager">1-11 / 11 ‹ ›</span>
              </div>
            </div>

            {/*  Body: sidebar + table  */}
            <div className="app-body">
              <div className="app-sb">
                <div className="sb-hd">📁 Locations</div>
                <div className="sb-item"><span>All</span></div>
                <div className="sb-item"><span>Physical Locations</span><span className="cnt">11</span></div>
                <div className="sb-item" style={{ "paddingLeft": "18px" }}><span>WH</span><span className="cnt">11</span></div>
                <div className="sb-item sel" style={{ "paddingLeft": "26px" }}><span>WH/Stock</span><span className="cnt">11</span></div>
                <div className="sb-item" style={{ "paddingLeft": "34px" }}><span>WH/Stock/Asse…</span><span className="cnt">4</span></div>
                <div className="sb-item" style={{ "paddingLeft": "34px" }}><span>WH/Stock/Flat P…</span><span className="cnt">3</span></div>
                <div className="sb-div"></div>
                <div className="sb-hd">Trigger</div>
                <div className="sb-item sel"><span>All</span></div>
                <div className="sb-item"><span>Auto</span><span className="cnt">3</span></div>
                <div className="sb-item"><span>Manual</span><span className="cnt">8</span></div>
              </div>

              <div className="app-tw">
                <table className="at">
                  <thead>
                    <tr>
                      <th><span className="cb-u"></span></th>
                      <th>Product</th><th>Location ↕</th><th>On Hand</th>
                      <th>Forecast</th><th>Route</th><th>ⓘ</th>
                      <th>Min</th><th>Max</th><th>To Order</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="cb-u"></span></td>
                      <td>[E-COM06] Corner Desk…</td><td>WH/Stock</td>
                      <td>4.00</td><td className="neg">-1.00</td><td></td><td>ⓘ</td>
                      <td>0.00</td><td>0.00</td><td>1.00</td><td></td>
                    </tr>
                    <tr className="sel">
                      <td><span className="cb-c"></span></td>
                      <td>[E-COM09] Large Desk</td><td>WH/Stock</td>
                      <td>1.00</td><td className="neg">-4.00</td><td></td><td></td>
                      <td>0.00</td><td>0.00</td><td>4.00</td>
                      <td><span className="tl">🚚 Order Once</span></td>
                    </tr>
                    <tr className="sel">
                      <td><span className="cb-c"></span></td>
                      <td>[FURN_9001] Flipover</td><td>WH/Stock</td>
                      <td>5.00</td><td className="neg">-6.00</td><td></td><td></td>
                      <td>0.00</td><td>0.00</td><td>6.00</td>
                      <td><span className="tl">🔄 Automate</span></td>
                    </tr>
                    <tr>
                      <td><span className="cb-u"></span></td>
                      <td>[FURN_9666] Table</td><td>WH/Stock</td>
                      <td>2.00</td><td className="neg">-1.00</td><td></td><td></td>
                      <td>0.00</td><td>0.00</td><td>1.00</td><td></td>
                    </tr>
                    <tr>
                      <td><span className="cb-u"></span></td>
                      <td>[FURN_7777] Office Chair</td><td>WH/Stock/Asse…</td>
                      <td>4.00</td><td>4.00</td><td>Buy</td><td></td>
                      <td>5.00</td><td>10.00</td><td>6.00</td><td></td>
                    </tr>
                    <tr className="sel">
                      <td><span className="cb-c"></span></td>
                      <td style={{ "fontWeight": "700" }}>[FURN_8888] Office Lamp</td><td>WH/Stock/Asse…</td>
                      <td>8.00</td><td>…</td><td></td><td></td>
                      <td>10.00</td><td>10.00</td><td>2.00</td>
                      <td><span className="tl">🔔 Snooze</span></td>
                    </tr>
                    <tr>
                      <td><span className="cb-u"></span></td>
                      <td>[FURN_8900] Drawer Black</td><td>WH/Stock/Asse…</td>
                      <td>12.00</td><td>…</td><td>Manufacture</td><td></td>
                      <td>0.00</td><td>0.00</td><td>0.00</td><td></td>
                    </tr>
                    <tr>
                      <td><span className="cb-u"></span></td>
                      <td>[FURN_9001] Flipover</td><td>WH/Stock/Asse…</td>
                      <td>5.00</td><td>5.0…</td><td></td><td></td>
                      <td>0.00</td><td>0.00</td><td>0.00</td>
                      <td><span className="tl">🔔 Snooze</span></td>
                    </tr>
                    <tr>
                      <td><span className="cb-u"></span></td>
                      <td>[E-COM06] Corner Desk…</td><td>WH/Stock/Flat P…</td>
                      <td>4.00</td><td>4.00</td><td>Manufacture</td><td></td>
                      <td>0.00</td><td>0.00</td><td>0.00</td>
                      <td><span className="tl">🔔 Snooze</span></td>
                    </tr>
                    <tr>
                      <td><span className="cb-u"></span></td>
                      <td>[E-COM09] Large Desk</td><td>WH/Stock/Flat P…</td>
                      <td>1.00</td><td>1.00</td><td></td><td></td>
                      <td>2.00</td><td>2.00</td><td>1.00</td>
                      <td><span className="tl">🚚 Order Once</span></td>
                    </tr>
                    <tr>
                      <td><span className="cb-u"></span></td>
                      <td>[FURN_9666] Table</td><td>WH/Stock/Flat P…</td>
                      <td>2.00</td><td>2.00</td><td>Manufacture</td><td></td>
                      <td>5.00</td><td>10.00</td><td>8.00</td>
                      <td><span className="tl">🚚 Order Once</span></td>
                    </tr>
                  </tbody>
                </table>
                <div className="at-footer"></div>
              </div>
            </div>
          </div>{/*  /ss-card  */}
        </div>{/*  /ss-wrap  */}
      </div>{/*  /hero  */}




      {/*  ╔══════════════════ FLAWLESS REPLENISHMENTS ═════════════════════════╗  */}
      <section className="container fu lp-white" style={{ "paddingTop": "140px" }}>
        <h2 className="s-h2 hw">
          Flawless
          <span className="u-rel">
            replenishments
            <svg style={{ "position": "absolute", "bottom": "-10px", "left": "0", "width": "100%", "height": "14px" }} viewBox="0 0 400 14" fill="none" aria-hidden="true">
              <path d="M4 9 Q50 2,100 9 Q150 16,200 9 Q250 2,300 9 Q350 16,390 8" stroke="var(--coral)" strokeWidth="6" strokeLinecap="round" fill="none" />
            </svg>
          </span>
        </h2>
        <p className="s-body"><strong>Never run out-of-stock</strong> with smart replenishment strategies like min-max rules, MTO, or the master production schedule. Let LDXODOO propose, or trigger purchase orders automatically. Then automate vendor follow-ups to minimize communication risks: PO acknowledgment, receipt schedule confirmation a few days before, etc.</p>

        {/*  Process card with icons  */}
        <div className="proc-card">
          {/*  Truck icon  */}
          <div className="proc-item">
            <svg width="64" height="56" viewBox="0 0 64 56" fill="none" aria-label="Delivery truck">
              <ellipse cx="32" cy="46" rx="24" ry="8" fill="var(--sky)" opacity=".2" />
              <rect x="6" y="16" width="28" height="20" rx="3" fill="#fff" stroke="var(--ink)" strokeWidth="2" />
              <path d="M34 22 L48 22 L54 32 L54 36 L34 36 Z" fill="#fff" stroke="var(--ink)" strokeWidth="2" />
              <rect x="40" y="24" width="10" height="8" rx="1" fill="var(--sky)" opacity=".5" />
              <circle cx="16" cy="38" r="5" fill="var(--sky)" stroke="var(--ink)" strokeWidth="2" />
              <circle cx="44" cy="38" r="5" fill="var(--sky)" stroke="var(--ink)" strokeWidth="2" />
              <line x1="6" y1="26" x2="34" y2="26" stroke="var(--line)" strokeWidth="1" />
            </svg>
            <span className="proc-lbl">Replenishment</span>
          </div>

          {/*  Dashed plum arrow  */}
          <svg width="52" height="28" viewBox="0 0 52 28" fill="none" aria-hidden="true">
            <path d="M4 20 Q20 4,44 14" stroke="var(--plum)" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="4 3" />
            <polygon points="40,9 48,15 40,20" fill="var(--plum)" />
          </svg>

          {/*  Shield icon  */}
          <div className="proc-item">
            <svg width="56" height="60" viewBox="0 0 56 60" fill="none" aria-label="Quality control shield">
              <ellipse cx="32" cy="52" rx="18" ry="7" fill="var(--mustard)" opacity=".2" />
              <path d="M24 14 L28 8 L32 14 L42 16 L42 36 C42 44 28 52 28 52 C28 52 14 44 14 36 L14 16 Z" fill="var(--mustard)" stroke="var(--ink)" strokeWidth="2" />
              <path d="M22 30 L26 34 L36 22" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="proc-lbl">Quality control</span>
          </div>

          {/*  Dashed plum arrow  */}
          <svg width="52" height="28" viewBox="0 0 52 28" fill="none" aria-hidden="true">
            <path d="M4 20 Q20 4,44 14" stroke="var(--plum)" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="4 3" />
            <polygon points="40,9 48,15 40,20" fill="var(--plum)" />
          </svg>

          {/*  Trolley icon  */}
          <div className="proc-item">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" aria-label="Storage trolley">
              <ellipse cx="36" cy="52" rx="18" ry="7" fill="var(--coral)" opacity=".2" />
              <line x1="16" y1="10" x2="16" y2="50" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="16" y1="50" x2="50" y2="50" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="22" y="20" width="20" height="13" rx="2" fill="var(--coral)" stroke="var(--ink)" strokeWidth="2" />
              <rect x="26" y="30" width="20" height="12" rx="2" fill="var(--coral)" stroke="var(--ink)" strokeWidth="2" />
              <circle cx="18" cy="54" r="4" fill="var(--ink)" />
              <circle cx="46" cy="54" r="4" fill="var(--ink)" />
              <line x1="10" y1="18" x2="22" y2="18" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="proc-lbl">Storage</span>
          </div>
        </div>

      </section>

      {/*  Gray swirly doodle arrow  */}
      <div className="lp-white" style={{ "display": "flex", "justifyContent": "center", "marginTop": "8px", "marginBottom": "-16px" }}>
        <img src="/doodle-arrow-v4.jpg" alt="" aria-hidden="true" className="doodle-arrow" style={{ "width": "160px", "height": "160px", "pointerEvents": "none", "userSelect": "none", "opacity": 0.85 }} />
      </div>


      {/*  ╔══════════════════ SPEED UP RECEIPT ════════════════════════════════╗  */}
      <section className="container two-col fu lp-white">
        {/* ── Billboard frame ── */}
        <div className="billboard-wrap">
          {/* Single atmospheric bloom — only visible in dark mode (REMOVED due to overlapping) */}
          

          {/* Bezel / frame */}
          <div className="bb-bezel">
            {/* Top bar with "screen" lights */}
            <div className="bb-topbar">
              <span className="bb-dot bb-dot-r" />
              <span className="bb-dot bb-dot-y" />
              <span className="bb-dot bb-dot-g" />
              <span className="bb-label">LDXODOO · Live Dashboard</span>
              <span className="bb-live"><span className="bb-live-dot" />LIVE</span>
            </div>

            {/* The actual card content */}
            <div className="wh-card bb-screen">
              <div className="wh-hd">
                <div className="vc-av" style={{ "width": "28px", "height": "28px", "fontSize": "11px", "background": "#e9b046" }}>W</div>
                <div className="wh-title">WH/Receipts</div>
                <div className="wh-search">🔍 Group By</div>
              </div>
              <div className="kan-grid">
                {/*  To Do  */}
                <div>
                  <div className="kc-t">To Do</div><div className="kc-s">3 Receipts</div>
                  <div className="kc">
                    <div className="kc-t" style={{ "color": "var(--ink)" }}>WH/IN/00004</div>
                    <div className="kc-s">Deco Addict</div>
                    <button className="kc-btn">3 Validate</button>
                    <div className="kc-st">Today</div>
                  </div>
                  <div className="kc" style={{ "marginTop": "8px" }}>
                    <div className="kc-t" style={{ "color": "var(--ink)" }}>WH/IN/00005</div>
                    <div className="kc-s">Wood Corner</div>
                    <button className="kc-btn" style={{ "background": "var(--surface)", "color": "var(--ink)", "border": "1px solid var(--line)" }}>1 Validate</button>
                    <div className="kc-st" style={{ "color": "var(--coral)" }}>Late</div>
                  </div>
                </div>
                {/*  In Progress  */}
                <div>
                  <div className="kc-t">In Progress</div><div className="kc-s">1 Receipt</div>
                  <div className="kc mb">
                    <div className="kc-t" style={{ "color": "var(--ink)" }}>WH/IN/00006</div>
                    <div className="kc-s">Ready Mat</div>
                    <button className="kc-btn">2 Validate</button>
                    <div className="kc-st">Today</div>
                  </div>
                </div>
                {/*  Done  */}
                <div>
                  <div className="kc-t">Done</div><div className="kc-s">12 Receipts</div>
                  <div className="kc cb">
                    <div className="kc-t" style={{ "color": "var(--ink)" }}>WH/IN/00003</div>
                    <div className="kc-s">Gemini Furniture</div>
                    <div className="kc-st">Yesterday</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom mounting rail */}
            <div className="bb-rail" />
          </div>

          {/* Single center mounting pole */}
          <div className="bb-poles">
            <div className="bb-pole" />
          </div>
        </div>

        <div>
          <h2 className="s-h2 hw">
            Speed up receipt, quality<br />control and storage
          </h2>
          <p className="s-body">
            <strong>Control incoming and outgoing shipments</strong> with push and pull rules, GS-1 codes, and customizable routes.
          </p>
          <p className="s-body">
            Use put-away strategies to optimize your storage: slow-fast movers, ABC analysis, cross-dock... all you need to reduce the number of parts moved, and distances.
          </p>
        </div>
      </section>

      {/*  Doodle arrow → points toward Optimize warehouse  */}
      <div className="lp-white" style={{ "display": "flex", "justifyContent": "center", "marginTop": "8px", "marginBottom": "-16px" }}>
        <img src="/doodle-arrow-v4.jpg" alt="" aria-hidden="true" className="doodle-arrow" style={{ "width": "160px", "height": "160px", "pointerEvents": "none", "userSelect": "none", "opacity": 0.85, "transform": "scaleX(-1)" }} />
      </div>

      {/*  ╔══════════════════ OPTIMIZE WAREHOUSE ══════════════════════════════╗  */}
      <section className="container two-col fu lp-white" style={{ "paddingTop": "100px", "paddingBottom": "100px", "position": "relative", "alignItems": "center" }}>
        
        <div style={{ "paddingRight": "40px" }}>
          <h2 className="hw" style={{ "fontSize": "clamp(2.4rem, 4vw, 3.2rem)", "color": "var(--ink)", "marginBottom": "24px", "lineHeight": "1.1" }}>Optimize your warehouse</h2>
          <p className="s-body"><strong>Real-time inventory management</strong> with all the features: serial numbers, lots, packaging, reservation strategies, cycle counting, KPIs, and more...</p>
          <p className="s-body">Blazing-fast inventory lookup: instantly know the location of all your products across multiple warehouses or multiple companies.</p>
        </div>

        <div style={{ "position": "relative", "width": "100%" }}>
          {/* Ambient blurred blobs background */}
          <div className="io-blobs" aria-hidden="true">
            <div className="io-blob io-blob-1"></div>
            <div className="io-blob io-blob-2"></div>
            <div className="io-blob io-blob-3"></div>
          </div>
          
          <div className="wh-card" style={{ "position": "relative", "zIndex": "1", "boxShadow": "0 24px 60px rgba(0,0,0,0.08)", "width": "100%", "background": "var(--surface)" }}>
            <div className="wh-hd" style={{ "padding": "12px 16px", "borderBottom": "1px solid var(--line)", "display": "flex", "justifyContent": "space-between", "alignItems": "center" }}>
              <div className="wh-title" style={{ "fontSize": "15px", "fontWeight": "700" }}>Inventory Overview</div>
              <div className="wh-search" style={{ "fontSize": "12px", "padding": "6px 10px", "background": "var(--surface-2)", "border": "1px solid var(--line)", "borderRadius": "4px", "color": "var(--muted)" }}>🔍 Search...</div>
            </div>
            
            {/* Dashboard Grid */}
            <div style={{ "display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "12px", "padding": "16px", "background": "var(--surface-2)" }}>
              
              <div className="io-card">
                <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "12px" }}>
                  <div style={{ "fontSize": "13px", "fontWeight": "700", "color": "var(--ink)" }}>Receipts</div>
                  <div style={{ "color": "var(--muted)", "fontWeight": "bold", "lineHeight": "1" }}>⋮</div>
                </div>
                <div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center" }}>
                  <span style={{ "background": "var(--plum)", "color": "#fff", "fontSize": "11px", "fontWeight": "600", "padding": "4px 8px", "borderRadius": "4px", "whiteSpace": "nowrap" }}>2 To Process</span>
                  <span style={{ "fontSize": "11px", "color": "var(--coral)", "fontWeight": "600", "whiteSpace": "nowrap" }}>1 Late</span>
                </div>
              </div>

              <div className="io-card">
                <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "12px" }}>
                  <div style={{ "fontSize": "13px", "fontWeight": "700", "color": "var(--ink)" }}>Internal Transfers</div>
                  <div style={{ "color": "var(--muted)", "fontWeight": "bold", "lineHeight": "1" }}>⋮</div>
                </div>
                <div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center" }}>
                  <span style={{ "background": "var(--plum)", "color": "#fff", "fontSize": "11px", "fontWeight": "600", "padding": "4px 8px", "borderRadius": "4px", "whiteSpace": "nowrap" }}>2 To Process</span>
                </div>
              </div>

              <div className="io-card">
                <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "12px" }}>
                  <div style={{ "fontSize": "13px", "fontWeight": "700", "color": "var(--ink)" }}>Delivery Orders</div>
                  <div style={{ "color": "var(--muted)", "fontWeight": "bold", "lineHeight": "1" }}>⋮</div>
                </div>
                <div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center" }}>
                  <span style={{ "background": "var(--plum)", "color": "#fff", "fontSize": "11px", "fontWeight": "600", "padding": "4px 8px", "borderRadius": "4px", "whiteSpace": "nowrap" }}>1 To Process</span>
                  <span style={{ "fontSize": "11px", "color": "var(--muted)", "fontWeight": "600", "whiteSpace": "nowrap" }}>2 Waiting</span>
                </div>
              </div>

              <div className="io-card">
                <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "12px" }}>
                  <div style={{ "fontSize": "13px", "fontWeight": "700", "color": "var(--ink)" }}>Manufacturing</div>
                  <div style={{ "color": "var(--muted)", "fontWeight": "bold", "lineHeight": "1" }}>⋮</div>
                </div>
                <div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center" }}>
                  <span style={{ "background": "var(--plum)", "color": "#fff", "fontSize": "11px", "fontWeight": "600", "padding": "4px 8px", "borderRadius": "4px", "whiteSpace": "nowrap" }}>4 To Process</span>
                  <span style={{ "fontSize": "11px", "color": "var(--coral)", "fontWeight": "600", "whiteSpace": "nowrap" }}>1 Late</span>
                </div>
              </div>

              <div className="io-card">
                <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "12px" }}>
                  <div style={{ "fontSize": "13px", "fontWeight": "700", "color": "var(--ink)" }}>Repairs</div>
                  <div style={{ "color": "var(--muted)", "fontWeight": "bold", "lineHeight": "1" }}>⋮</div>
                </div>
                <div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center" }}>
                  <span style={{ "background": "var(--plum)", "color": "#fff", "fontSize": "11px", "fontWeight": "600", "padding": "4px 8px", "borderRadius": "4px", "whiteSpace": "nowrap" }}>1 To Process</span>
                </div>
              </div>

              <div className="io-card">
                <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "12px" }}>
                  <div style={{ "fontSize": "13px", "fontWeight": "700", "color": "var(--ink)" }}>PoS Orders</div>
                  <div style={{ "color": "var(--muted)", "fontWeight": "bold", "lineHeight": "1" }}>⋮</div>
                </div>
                <div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center" }}>
                  <span style={{ "background": "var(--plum)", "color": "#fff", "fontSize": "11px", "fontWeight": "600", "padding": "4px 8px", "borderRadius": "4px", "whiteSpace": "nowrap" }}>5 To Process</span>
                </div>
              </div>

            </div>
          </div>

          {/* Orange Open Box Doodle */}
          <svg style={{ "position": "absolute", "bottom": "-30px", "right": "-30px", "width": "80px", "height": "80px", "zIndex": "2", "pointerEvents": "none" }} viewBox="0 0 100 100" fill="none">
            <path d="M50 80 L80 65 L80 35 L50 50 Z" fill="#e5912d" stroke="#1e1a2e" strokeWidth="3" strokeLinejoin="round" />
            <path d="M50 80 L20 65 L20 35 L50 50 Z" fill="#f6a945" stroke="#1e1a2e" strokeWidth="3" strokeLinejoin="round" />
            <path d="M20 35 L50 20 L80 35 L50 50 Z" fill="#ffb961" stroke="#1e1a2e" strokeWidth="3" strokeLinejoin="round" />
            {/* Box flaps */}
            <path d="M20 35 L10 20 L40 5 L50 20 Z" fill="#f6a945" stroke="#1e1a2e" strokeWidth="3" strokeLinejoin="round" />
            <path d="M80 35 L90 20 L60 5 L50 20 Z" fill="#e5912d" stroke="#1e1a2e" strokeWidth="3" strokeLinejoin="round" />
            {/* Box lines inside */}
            <line x1="50" y1="50" x2="50" y2="80" stroke="#1e1a2e" strokeWidth="3" strokeLinecap="round" />
          </svg>

        </div>
      </section>



      {/* Gray curly arrow down */}
      <div className="lp-white" style={{ "display": "flex", "justifyContent": "center", "margin": "10px 0 5px 0" }}>
        <svg style={{ "width": "75px", "height": "130px", "pointerEvents": "none" }} viewBox="0 0 100 140" fill="none">
          <path d="M50 5 Q52 30 52 60 Q52 100 40 130 L50 118 M40 130 L30 118" stroke="#d1d5db" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>

      {/*  ╔══════════════════ MINIMIZE PICKING MOVEMENTS ══════════════════════╗  */}
      <section className="container pick-sec fu lp-white">
        <h2 className="s-h2 hw" style={{ "position": "relative", "display": "inline-block" }}>
          <span className="mint-hl">Minimize</span> picking movements
        </h2>
        <p className="s-body" style={{ "margin": "10px auto 0", "maxWidth": "700px" }}>
          Choose the right strategy for you: single, cluster, wave, or batch picking. Trigger goods to release using multiple reservation strategies. Implementing the right strategies allows to pick and pack 30% extra products with the same team.
        </p>

        <div className="pick-cards">
          <div className="pick-card">
            <div className="pick-diag" style={{ "height": "160px", "display": "flex", "justifyContent": "center", "alignItems": "flex-end" }}>
              {/* Wave picking doodle */}
              <svg width="200" height="150" viewBox="0 0 200 150" fill="none" aria-hidden="true">
                <rect x="30" y="20" width="12" height="80" fill="#e5e7eb" />
                <rect x="70" y="20" width="12" height="80" fill="#e5e7eb" />
                <rect x="110" y="20" width="12" height="80" fill="#e5e7eb" />
                <rect x="150" y="20" width="12" height="80" fill="#e5e7eb" />
                
                <rect x="32" y="50" width="8" height="8" fill="var(--mint)" />
                <rect x="72" y="30" width="8" height="8" fill="var(--coral)" />
                <rect x="72" y="70" width="8" height="8" fill="var(--mustard)" />
                <rect x="112" y="60" width="8" height="8" fill="var(--sky)" />
                <rect x="152" y="40" width="8" height="8" fill="var(--mint)" />
                <rect x="152" y="80" width="8" height="8" fill="var(--coral)" />
                
                <path d="M50 40 L50 90" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arrow-gray)" />
                <path d="M90 60 L90 100" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arrow-gray)" />
                <path d="M130 50 L130 90" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arrow-gray)" />
                <path d="M170 70 L170 110" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arrow-gray)" />

                <rect x="60" y="125" width="12" height="12" fill="var(--mint)" />
                <rect x="74" y="125" width="12" height="12" fill="var(--coral)" />
                <rect x="88" y="125" width="12" height="12" fill="var(--mustard)" />
                <path d="M106 131 L124 131" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arrow-gray)" />
                <rect x="132" y="118" width="12" height="12" fill="var(--sky)" />
                <rect x="146" y="118" width="12" height="12" fill="var(--mint)" />
                <rect x="132" y="132" width="12" height="12" fill="var(--coral)" />
                <text x="145" y="152" fill="#6b7280" fontSize="11" fontStyle="italic" textAnchor="middle">Pack</text>
                
                <defs>
                  <marker id="arrow-gray" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
                  </marker>
                </defs>
              </svg>
            </div>
            <div className="pick-body">
              <div className="pick-t">Wave picking</div>
              <div className="pick-d">Launch picking orders per aisle, or area, and regroup at packing zone. Ideal for large warehouses.</div>
            </div>
          </div>

          <div className="pick-card">
            <div className="pick-diag" style={{ "height": "160px", "display": "flex", "justifyContent": "center", "alignItems": "flex-end" }}>
              {/* Cluster picking doodle */}
              <svg width="200" height="150" viewBox="0 0 200 150" fill="none" aria-hidden="true">
                <rect x="40" y="20" width="12" height="80" fill="#e5e7eb" />
                <rect x="80" y="20" width="12" height="80" fill="#e5e7eb" />
                <rect x="120" y="20" width="12" height="80" fill="#e5e7eb" />
                <rect x="160" y="20" width="12" height="80" fill="#e5e7eb" />

                <rect x="42" y="50" width="8" height="8" fill="var(--mustard)" />
                <rect x="82" y="30" width="8" height="8" fill="var(--mint)" />
                <rect x="82" y="80" width="8" height="8" fill="var(--sky)" />
                <rect x="122" y="60" width="8" height="8" fill="var(--coral)" />
                <rect x="162" y="40" width="8" height="8" fill="var(--mint)" />

                <path d="M60 100 Q60 110 70 110 Q80 110 80 100 L80 40 Q80 30 90 30 Q100 30 100 40 L100 90 Q100 100 110 100 Q120 100 120 90 L120 70 Q120 60 130 60 Q140 60 140 70 L140 100" stroke="#6b3f6b" strokeWidth="2" fill="none" markerEnd="url(#arrow-plum)" />

                <rect x="134" y="118" width="12" height="12" fill="var(--mustard)" />
                <rect x="148" y="118" width="12" height="12" fill="var(--mint)" />
                <rect x="134" y="132" width="12" height="12" fill="var(--sky)" />
                <rect x="148" y="132" width="12" height="12" fill="var(--coral)" />
                <text x="147" y="152" fill="#6b7280" fontSize="11" fontStyle="italic" textAnchor="middle">Packed</text>
                
                <defs>
                  <marker id="arrow-plum" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b3f6b" />
                  </marker>
                </defs>
              </svg>
            </div>
            <div className="pick-body">
              <div className="pick-t">Cluster picking</div>
              <div className="pick-d">Pick multiple orders in one trip, and prepare orders as you pick, to save time at packing. Ideal for small products.</div>
            </div>
          </div>

          <div className="pick-card">
            <div className="pick-diag" style={{ "height": "160px", "display": "flex", "justifyContent": "center", "alignItems": "flex-end" }}>
              {/* Batch picking doodle */}
              <svg width="200" height="150" viewBox="0 0 200 150" fill="none" aria-hidden="true">
                <rect x="30" y="20" width="12" height="80" fill="#e5e7eb" />
                <rect x="70" y="20" width="12" height="80" fill="#e5e7eb" />
                <rect x="110" y="20" width="12" height="80" fill="#e5e7eb" />
                <rect x="150" y="20" width="12" height="80" fill="#e5e7eb" />

                <rect x="32" y="40" width="8" height="8" fill="var(--mint)" />
                <rect x="72" y="30" width="8" height="8" fill="var(--coral)" />
                <rect x="72" y="70" width="8" height="8" fill="var(--sky)" />
                <rect x="112" y="50" width="8" height="8" fill="var(--mustard)" />
                <rect x="152" y="30" width="8" height="8" fill="var(--plum)" />
                <rect x="152" y="70" width="8" height="8" fill="var(--mint)" />

                <path d="M50 50 L50 85" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arrow-gray)" />
                <path d="M90 60 L90 95" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arrow-gray)" />
                <path d="M130 70 L130 105" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arrow-gray)" />

                <rect x="70" y="125" width="12" height="12" fill="var(--coral)" />
                <rect x="84" y="125" width="12" height="12" fill="var(--sky)" />
                <rect x="98" y="125" width="12" height="12" fill="var(--mustard)" />
                <path d="M116 131 L134 131" stroke="#6b3f6b" strokeWidth="2" markerEnd="url(#arrow-plum)" />
                
                <rect x="142" y="118" width="12" height="12" fill="var(--mint)" />
                <rect x="156" y="118" width="12" height="12" fill="var(--plum)" />
                <rect x="142" y="132" width="12" height="12" fill="var(--coral)" />
                <text x="155" y="152" fill="#6b7280" fontSize="11" fontStyle="italic" textAnchor="middle">Pack</text>
              </svg>
            </div>
            <div className="pick-body">
              <div className="pick-t">Batch picking</div>
              <div className="pick-d">Regroup multiple orders in one picking, and consolidate at the packing zone.</div>
            </div>
          </div>
        </div>
      </section>

      {/*  ╔══════════════════ ONE NEED ONE APP ════════════════════════════════╗  */}
      <section className="container app-sec fu" style={{ paddingTop: "80px" }}>
        <h2 className="s-h2 hw" style={{ textAlign: "left" }}>
          One <span className="u-rel">need<svg style={{ "position": "absolute", "bottom": "-8px", "left": "0", "width": "100%", "height": "14px" }} viewBox="0 0 100 14" fill="none" aria-hidden="true"><path d="M2 9 Q50 2,98 9" stroke="#6aa1e0" strokeWidth="4" strokeLinecap="round" fill="none" /></svg></span>, one <span className="u-rel">app<svg style={{ "position": "absolute", "bottom": "-8px", "left": "0", "width": "100%", "height": "14px" }} viewBox="0 0 100 14" fill="none" aria-hidden="true"><path d="M2 9 Q50 2,98 9" stroke="#6aa1e0" strokeWidth="4" strokeLinecap="round" fill="none" /></svg></span>.
        </h2>
        <p className="s-body" style={{ textAlign: "left" }}>Expand as you grow.</p>

        <div className="app-grid">
          <div className="atile">
            <div className="atile-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="14" width="4" height="6" rx="1" fill="#e9b046" />
                <rect x="10" y="8" width="4" height="12" rx="1" fill="#e9b046" opacity="0.7" />
                <rect x="16" y="4" width="4" height="16" rx="1" fill="#91336c" />
              </svg>
            </div>
            <div>
              <div className="atile-t">Sales</div>
              <div className="atile-d">Order quantities based on demand</div>
            </div>
          </div>
          <div className="atile">
            <div className="atile-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M2 20 L22 20 L22 14 L17 14 L17 8 L12 8 L12 12 L7 12 L7 16 L2 16 Z" fill="#6ccbb5" />
                <rect x="4" y="8" width="2" height="4" fill="#e9b046" />
                <rect x="9" y="4" width="2" height="4" fill="#e9b046" />
              </svg>
            </div>
            <div>
              <div className="atile-t">Manufacturing</div>
              <div className="atile-d">Coordinate JIT manufacturing</div>
            </div>
          </div>
          <div className="atile">
            <div className="atile-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="12" rx="2" fill="#714b67" />
                <rect x="2" y="10" width="20" height="4" fill="#6ccbb5" />
              </svg>
            </div>
            <div>
              <div className="atile-t">Purchase</div>
              <div className="atile-d">Automated replenishment</div>
            </div>
          </div>
          <div className="atile">
            <div className="atile-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="8" cy="8" r="3" fill="#e9b046" />
                <circle cx="16" cy="16" r="3" fill="#6ccbb5" />
                <line x1="5" y1="19" x2="19" y2="5" stroke="#91336c" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="atile-t">Accounting</div>
              <div className="atile-d">Automated inventory valuation</div>
            </div>
          </div>
          <div className="atile">
            <div className="atile-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="14" height="14" rx="2" fill="#6ab0e5" opacity="0.3" />
                <circle cx="12" cy="12" r="5" stroke="#714b67" strokeWidth="2.5" />
                <line x1="16" y1="16" x2="20" y2="20" stroke="#714b67" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="atile-t">Quality</div>
              <div className="atile-d">Setup control points</div>
            </div>
          </div>
        </div>

        <div className="see-all-wrap">
          <span className="see-all hw" style={{ color: "var(--plum)" }}>See all Apps →</span>
        </div>
      </section>

      {/*  ╔══════════════════ MOSAIC / SCALE ══════════════════════════════════╗  */}
      <section className="mosaic-sec fu" style={{ position: "relative", paddingTop: "140px", paddingBottom: "140px" }}>
        
        <div className="mosaic-grid" style={{ maxWidth: "1080px", margin: "0 auto", position: "relative" }}>
          
          {/* ── Center Content Overlay ── */}
          <div className="mo-center overlay-center">
            <div className="mo-center-blob custom-blob">
              <svg style={{ position: "absolute", top: "-20px", right: "10px", width: "90px", height: "50px", pointerEvents: "none", overflow: "visible" }} viewBox="0 0 90 50" fill="none">
                <path d="M10,40 Q20,20 45,15" stroke="#f6a945" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M35,12 L45,15 L40,25" stroke="#f6a945" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <text x="50" y="20" fill="#f6a945" fontSize="20" fontFamily="Caveat, cursive" fontWeight="bold">happy</text>
              </svg>
              <h2 className="mo-h hw" style={{ margin: "0 0 8px 0" }}>Join 28 million users</h2>
              <p className="mo-p" style={{ margin: "0" }}>who grow their business with Odoo</p>
            </div>
          </div>

          {/* ── Row 1 ── */}
          <div></div>
          <div></div>
          <div className="mt" style={{ background: "var(--plum)", borderRadius: "24px 0 0 0" }}></div>
          <div></div>
          <div className="mt mt-neutral" style={{ borderRadius: "50%" }}></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover"}} alt=""/></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"12px", objectFit:"cover"}} alt=""/></div>
          <div className="mt mt-neutral" style={{ borderRadius: "24px 0 0 0" }}></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"12px", objectFit:"cover"}} alt=""/></div>
          <div className="mt mt-neutral" style={{ borderRadius: "50%" }}></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"12px", objectFit:"cover"}} alt=""/></div>
          <div className="mt" style={{ background: "var(--plum)", borderRadius: "0 24px 0 0" }}></div>

          {/* ── Row 2 ── */}
          <div></div>
          <div className="mt mt-neutral" style={{ borderRadius: "0 0 0 24px" }}></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"12px", objectFit:"cover"}} alt=""/></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"12px", objectFit:"cover"}} alt=""/></div>

          {/* ── Row 3 ── */}
          <div className="mt" style={{ background: "var(--plum)", borderRadius: "50%" }}></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div className="mt mt-neutral" style={{ borderRadius: "50%" }}></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover"}} alt=""/></div>

          {/* ── Row 4 ── */}
          <div className="mt" style={{ background: "var(--plum)", borderRadius: "12px" }}></div>
          <div className="mt" style={{ background: "var(--plum)", borderRadius: "12px" }}></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"12px", objectFit:"cover"}} alt=""/></div>
          <div className="mt" style={{ background: "var(--plum)", borderRadius: "0 0 0 24px" }}></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"12px", objectFit:"cover"}} alt=""/></div>
          <div></div>
          <div className="mt mt-neutral" style={{ borderRadius: "50%" }}></div>
          <div></div>
          <div className="mt mt-neutral" style={{ borderRadius: "50%" }}></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"12px", objectFit:"cover"}} alt=""/></div>
          <div className="mt mt-neutral" style={{ borderRadius: "24px 0 0 0" }}></div>
          <div className="mt"><img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" style={{width:"100%", height:"100%", borderRadius:"12px", objectFit:"cover"}} alt=""/></div>
        </div>
      </section>


      {/*  ╔══════════════════ TESTIMONIAL ════════════════════════════════════╗  */}
      <section className="container fu" style={{ "padding": "40px 32px 100px" }}>
        <div className="test2-card">
          <div className="test2-quote">
            <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
              <path d="M12 24 Q6 24, 6 16 Q6 10, 14 10 C18 10, 20 12, 20 16 C20 22, 14 28, 12 28 Z" fill="#f6a945" stroke="var(--ink)" strokeWidth="3" />
              <path d="M32 24 Q26 24, 26 16 Q26 10, 34 10 C38 10, 40 12, 40 16 C40 22, 34 28, 32 28 Z" fill="#f6a945" stroke="var(--ink)" strokeWidth="3" />
            </svg>
          </div>
          <div className="test2-content">
            <div className="test2-body">
              <p className="test2-q">Odoo Inventory replaced our legacy spreadsheets which were unable to keep up with our growing business. The biggest benefits we realized were saving time by using a simpler system, and greater overall accessibility to our inventory.</p>
            </div>
            <div className="test2-person">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Jeremy B." className="test2-av-img" />
              <div className="test2-nm">Jeremy B.</div>
              <div className="test2-rl">Mid-market Business Owner</div>
            </div>
          </div>
        </div>
      </section>

      {/*  ╔══════════════════ CTA ════════════════════════════════════════════╗  */}
      <section className="cta2-sec fu">
        <div className="cta2-title-wrap">
          {/* LEFT sparkle burst */}
          <svg className="cta2-spark-left" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g transform="translate(100,120)">
              <line x1="0" y1="0" x2="0" y2="-80" stroke="#e9b046" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="68" y2="-44" stroke="#e9b046" strokeWidth="3" strokeLinecap="round" />
              <line x1="0" y1="0" x2="-68" y2="-44" stroke="#e9b046" strokeWidth="3" strokeLinecap="round" />
              <line x1="0" y1="0" x2="44" y2="-74" stroke="#e9b046" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="-44" y2="-74" stroke="#e9b046" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="80" y2="-12" stroke="#e9b046" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="-80" y2="-12" stroke="#e9b046" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="24" y2="-82" stroke="#e9b046" strokeWidth="2" strokeLinecap="round" />
              <line x1="0" y1="0" x2="-24" y2="-82" stroke="#e9b046" strokeWidth="2" strokeLinecap="round" />
              <path d="M-12,-94 C-12,-104 -2,-108 0,-102 C2,-108 12,-104 12,-94 C12,-84 0,-76 0,-76Z" fill="#e9b046" />
              <path d="M58,-58 C58,-66 66,-68 68,-63 C70,-68 78,-66 78,-58 C78,-50 68,-44 68,-44Z" fill="#e9b046" />
            </g>
          </svg>
          {/* RIGHT sparkle burst */}
          <svg className="cta2-spark-right" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g transform="translate(60,110)">
              <line x1="0" y1="0" x2="0" y2="-55" stroke="#e9b046" strokeWidth="3" strokeLinecap="round" />
              <line x1="0" y1="0" x2="48" y2="-30" stroke="#e9b046" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="-48" y2="-30" stroke="#e9b046" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="30" y2="-52" stroke="#e9b046" strokeWidth="2" strokeLinecap="round" />
              <line x1="0" y1="0" x2="56" y2="-8" stroke="#e9b046" strokeWidth="2" strokeLinecap="round" />
              <line x1="0" y1="0" x2="-22" y2="-56" stroke="#e9b046" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
          
          <h2 className="cta2-h hw">
            Being organized<br />never felt so good
          </h2>
        </div>
        
        <Link href="/register"><button className="btn-hero cta2-btn">Start now - It&apos;s free</button></Link>
        <div className="cta2-meta">
          <svg width="24" height="24" viewBox="0 0 18 24" fill="none" aria-hidden="true" style={{ marginBottom: "8px" }}>
            <path d="M9 22 L9 4" stroke="#6ccbb5" strokeWidth="3" strokeLinecap="round" />
            <path d="M3 10 L9 4 L15 10" stroke="#6ccbb5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>No credit card required<br />Instant access</span>
        </div>
      </section>


      {/*  ╔══════════════════ FOOTER ═════════════════════════════════════════╗  */}




      <Footer />
    </>
  );
}
