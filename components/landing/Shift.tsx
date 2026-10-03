import Image from "next/image";
import Link from "next/link";
import { Check, X } from "lucide-react";

export function Shift() {
  return (
    <section className="shift l-container fu" aria-labelledby="shift-title">
      <div className="sec-head">
        <span className="eyebrow">How the club runs today</span>
        <h2 id="shift-title">Four tools, three notebooks, one very tired front desk.</h2>
      </div>
      <div className="shift-grid">
        <div className="col before">
          <h3>
            <X size={16} color="#e07a7a" /> Today
          </h3>
          <ul>
            <li>
              <X size={15} /> Bookings in a WhatsApp group and a paper diary — the same slot gets promised twice.
            </li>
            <li>
              <X size={15} /> Membership expiry noticed only when someone is turned away at the door.
            </li>
            <li>
              <X size={15} /> Bar, shop and courts on three separate billing machines; discounts applied from memory.
            </li>
            <li>
              <X size={15} /> Month-end means stitching four exports into one spreadsheet by hand.
            </li>
          </ul>
        </div>
        <div className="col after">
          <h3>
            <Check size={16} color="#1a7f6f" /> With Playora
          </h3>
          <ul>
            <li>
              <Check size={15} /> One live court grid for the phone, the counter, the member app and the voice agent.
            </li>
            <li>
              <Check size={15} /> Reminders at 7 days, 1 day and day-of — automatically, on WhatsApp.
            </li>
            <li>
              <Check size={15} /> One member record, one discount rule, one ledger across every counter.
            </li>
            <li>
              <Check size={15} /> Month-end is a tab the owner already has open.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section className="cta l-container fu" aria-labelledby="cta-title">
      <div className="cta-box">
        <Image src="/doodle-arrow-v3.jpg" alt="" width={160} height={160} className="doodle" />
        <h2 id="cta-title">Ready for the Friday rush?</h2>
        <p>Book a trial session as a guest, or sign in if you&apos;re already a member or on staff. Same account, same board.</p>
        <div className="cta-actions">
          <Link href="/register" className="btn btn-primary btn-lg">
            Book a trial session
          </Link>
          <Link href="/login" className="btn btn-outline btn-lg">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
