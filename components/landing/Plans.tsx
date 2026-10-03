import Link from "next/link";
import { Check } from "lucide-react";
import { plans } from "./data";

export function Plans() {
  return (
    <section className="plans fu" id="plans" aria-labelledby="plans-title">
      <div className="l-container">
        <div className="sec-head">
          <span className="eyebrow">Membership</span>
          <h2 id="plans-title">Three plans. The price is decided once, then it just applies.</h2>
          <p>
            Court price, bar discount, booking window, daily cap — every rule lives on the plan. The member app, the front desk and
            the bar POS all read the same rule, so nobody argues at the counter.
          </p>
        </div>

        <div className="plan-grid">
          {plans.map((p) => (
            <article className={`plan ${p.hot ? "hot" : ""}`} key={p.name} aria-label={`${p.name} plan`}>
              {p.hot && <span className="ribbon">Most members</span>}
              <div>
                <h3>{p.name}</h3>
                <p className="who">{p.who}</p>
              </div>
              <div className="price">
                <b>₹{p.price}</b>
                <span>/ month</span>
              </div>
              <ul>
                {p.perks.map((perk) => (
                  <li key={perk}>
                    <Check size={15} /> <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`btn ${p.hot ? "btn-primary" : "btn-outline"}`}>
                Join as {p.name}
              </Link>
            </article>
          ))}
        </div>
        <p className="plan-note">Prices and rules are configured by the club owner in Settings — these are The Champions Club&apos;s.</p>
      </div>
    </section>
  );
}
