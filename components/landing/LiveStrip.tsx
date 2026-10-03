import { freeThisWeek } from "./data";

export function LiveStrip() {
  return (
    <section className="strip l-container fu" id="courts" aria-labelledby="strip-title">
      <div className="strip-head">
        <div>
          <span className="live">
            <i aria-hidden="true" /> Free this week
          </span>
          <h2 id="strip-title">Grab a court before the Friday rush does</h2>
        </div>
        <p>Guests pay the list price. Gold members see &ldquo;Free&rdquo;. Everyone sees the same board.</p>
      </div>
      <div className="strip-row" role="list">
        {freeThisWeek.map((s) => (
          <article className="sc" role="listitem" key={`${s.day}-${s.time}-${s.court}`}>
            <span className="d">{s.day}</span>
            <span className="t">{s.time}</span>
            <span className="c">{s.court}</span>
            <div className="p">
              <span>
                <s>{s.list}</s>
                <b>{s.gold ? "Free for Gold" : "Members −20%"}</b>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
