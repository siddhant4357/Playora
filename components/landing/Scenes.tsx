import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, CalendarCheck, Check, ShieldCheck, Sparkles, Utensils } from "lucide-react";

export function Scenes() {
  return (
    <>
      <BookingScene />
      <MemberScene />
      <BarShopScene />
    </>
  );
}

function BookingScene() {
  return (
    <section className="l-container feat fu" id="booking" aria-labelledby="booking-title">
      <div className="feat-copy">
        <span className="eyebrow">Scene B · The booking</span>
        <h2 id="booking-title">
          A court that <span className="hl">cannot</span> be double-booked.
        </h2>
        <p className="lead">
          Rahul books Court 1 for Saturday 6 pm from his phone while the front desk takes the same slot over a call. Only one
          of them succeeds — the database guarantees it, not a lucky refresh.
        </p>
        <ul>
          <li>
            <Check size={16} /> <span><b>30-minute starts, 60-minute sessions.</b> Price depends on the member&apos;s plan and the hour — Gold simply sees &ldquo;Free&rdquo;.</span>
          </li>
          <li>
            <Check size={16} /> <span><b>Two sessions a day, enforced.</b> The third attempt is politely refused with the reason.</span>
          </li>
          <li>
            <Check size={16} /> <span><b>Cancel, and the waitlist moves up.</b> The next person gets a WhatsApp with a one-tap confirm.</span>
          </li>
        </ul>
        <Link href="/register" className="more">
          Book your first session <ArrowRight size={15} />
        </Link>
      </div>

      <div className="feat-visual">
        <Image src="/doodle-arrow-v3.jpg" alt="" width={120} height={120} className="doodle" style={{ top: -70, left: -30, transform: "rotate(20deg)" }} />
        <div className="mock" role="img" aria-label="Member booking screen with slot prices and a conflict notice">
          <div className="mock-hd">
            <CalendarCheck size={14} /> Book a court <span className="r">Sat 4 Oct · Badminton · Court 1</span>
          </div>
          <div className="mock-bd">
            <div className="bk-grid">
              {[
                ["5:00", "₹350", "free"],
                ["5:30", "₹350", "full"],
                ["6:00", "Free", "free pick"],
                ["6:30", "Free", "free"],
                ["7:00", "₹450", ""],
                ["7:30", "₹450", "full"],
                ["8:00", "₹450", ""],
                ["8:30", "₹350", ""],
              ].map(([t, p, cls]) => (
                <div className={`bk ${cls}`} key={t}>
                  <div className="tm">{t}</div>
                  <div className="pr">{p}</div>
                </div>
              ))}
            </div>
            <div className="callout">
              <ShieldCheck size={15} />
              <span>
                <b>Held for you for 2 minutes.</b> You&apos;ve used 1 of 2 sessions today as a Gold member. Price: <b>Free</b>.
              </span>
            </div>
            <div className="rowbtn" aria-hidden="true">
              <button className="tb" type="button" tabIndex={-1}>
                Confirm 6:00 – 7:00
              </button>
              <button className="tb ghost" type="button" tabIndex={-1}>
                Invite a friend
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MemberScene() {
  return (
    <section className="l-container feat flip fu" id="members" aria-labelledby="member-title">
      <div className="feat-copy">
        <span className="eyebrow">Scene A · The member</span>
        <h2 id="member-title">
          Every member is <span className="hl">one record</span>, not five.
        </h2>
        <p className="lead">
          The same person who books Court 3, buys a grip at the shop and runs a tab at the bar shows up once — with a QR card,
          an expiry date and a timeline the owner can actually read.
        </p>
        <ul>
          <li>
            <Check size={16} /> <span><b>Register in under a minute.</b> Plan, start date, first payment, QR card sent on WhatsApp.</span>
          </li>
          <li>
            <Check size={16} /> <span><b>Scan to check in.</b> Front desk sees today&apos;s bookings and the whole history in one tap.</span>
          </li>
          <li>
            <Check size={16} /> <span><b>Expiry reminders that run themselves.</b> 7 days, 1 day, day-of — WhatsApp first, email as fallback.</span>
          </li>
        </ul>
        <Link href="/register" className="more">
          Become a member <ArrowRight size={15} />
        </Link>
      </div>

      <div className="feat-visual">
        <Image src="/doodle-arrow-v4.jpg" alt="" width={120} height={120} className="doodle" style={{ top: -74, right: -20, transform: "scaleX(-1) rotate(15deg)" }} />
        <div className="mock" role="img" aria-label="Member 360 view with QR membership card and activity timeline">
          <div className="mock-hd">
            <Sparkles size={14} /> Member 360 <span className="r">Rahul Sharma · #0142</span>
          </div>
          <div className="mock-bd m360">
            <div className="mcard">
              <span className="club">The Champions Club</span>
              <span className="nm">Rahul Sharma</span>
              <div className="qr" aria-hidden="true">
                <QrGlyph />
              </div>
              <div className="meta">
                <span>Gold</span>
                <span>Renews 28 Oct</span>
              </div>
            </div>
            <div className="tl">
              {[
                ["book", "Court 1 · Sat 6:00 pm", "Booked from phone · Free", ""],
                ["bar", "Bar tab · Table 4", "2 items · Gold −20% applied", "₹336"],
                ["shop", "Yonex grip × 2", "Click & collect · Ready", "₹480"],
                ["pay", "Gold renewal", "UPI · Invoice #INV-0917", "₹2,999"],
                ["book", "Friday social play", "Paired with Ananya · Won 21–17", ""],
              ].map(([k, t, s, a]) => (
                <div className="ev" key={t}>
                  <i className={k} />
                  <div>
                    <div className="t">{t}</div>
                    <div className="s">{s}</div>
                  </div>
                  {a && <span className="amt">{a}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BarShopScene() {
  return (
    <section className="l-container feat fu" id="bar" aria-labelledby="bar-title">
      <div className="feat-copy">
        <span className="eyebrow">Scenes C &amp; D · Shop and bar</span>
        <h2 id="bar-title">
          Bar, shop and courts on <span className="hl">one ledger</span>.
        </h2>
        <p className="lead">
          A juice at the bar, a racket from the shop and a court booking are three sales in three places — but one member, one
          discount rule and one set of books at the end of the night.
        </p>
        <ul>
          <li>
            <Check size={16} /> <span><b>Table map → tab → kitchen.</b> Attach a member by phone or QR and the discount applies itself.</span>
          </li>
          <li>
            <Check size={16} /> <span><b>Counter sale and online order share stock.</b> Click &amp; collect decrements the same shelf.</span>
          </li>
          <li>
            <Check size={16} /> <span><b>Z-report at close.</b> Cash vs card vs UPI, voids, open tabs — posted straight to the ledger.</span>
          </li>
        </ul>
        <a href="#owner" className="more">
          See what the owner sees <ArrowRight size={15} />
        </a>
      </div>

      <div className="feat-visual">
        <Image src="/doodle-arrow.jpg" alt="" width={110} height={110} className="doodle" style={{ bottom: -70, left: -10, transform: "rotate(-150deg)" }} />
        <div className="mock" role="img" aria-label="Bar tab for table 4 with member discount and kitchen status">
          <div className="mock-hd">
            <Utensils size={14} /> Table 4 · Tab #218 <span className="r">Rahul Sharma · Gold</span>
          </div>
          <div className="mock-bd tab">
            {[
              ["2", "Fresh lime soda", "ready", "₹160"],
              ["1", "Grilled sandwich", "prep", "₹220"],
              ["1", "Protein shake", "ready", "₹180"],
            ].map(([q, n, k, a]) => (
              <div className="ln-item" key={n}>
                <span className="q">{q}×</span>
                <span className="n">{n}</span>
                <span className={`k ${k}`}>{k === "prep" ? "Preparing · 6m" : "Ready"}</span>
                <span className="a">{a}</span>
              </div>
            ))}
            <div className="tot">
              <div>
                <span>Subtotal</span>
                <span>₹560</span>
              </div>
              <div className="disc">
                <span>
                  <BadgePercent size={11} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} />
                  Gold member −20%
                </span>
                <span>−₹112</span>
              </div>
              <div>
                <span>GST 5%</span>
                <span>₹22</span>
              </div>
              <div className="due">
                <span>Due</span>
                <span>₹470</span>
              </div>
            </div>
            <div className="rowbtn" aria-hidden="true">
              <button className="tb" type="button" tabIndex={-1}>
                Settle · UPI
              </button>
              <button className="tb ghost" type="button" tabIndex={-1}>
                Split bill
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QrGlyph() {
  const cells = [
    "1111111010111111", "1000001001100000", "1011101110101110", "1011101010101110", "1011101101101110", "1000001011100000",
    "1111111010111111", "0000000110000000", "1101011011010110", "0110110100101101", "1011010111011010", "0000000101100110",
    "1111111011010101", "1000001001101100", "1011101110010110", "1011101001011011",
  ];
  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges">
      {cells.flatMap((row, y) =>
        row.split("").map((c, x) => (c === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111827" /> : null)),
      )}
    </svg>
  );
}
