import { BarChart3, Boxes, CalendarRange, Contact, FileClock, MessageCircle, QrCode, Utensils, Wine } from "lucide-react";
import { modules } from "./data";

const icons = [CalendarRange, QrCode, Contact, Boxes, Wine, Utensils, BarChart3, FileClock, MessageCircle];
const tints = ["#714b67", "#2fb8a0", "#6aa1e0", "#f6a945", "#e07a7a", "#a86a0f", "#714b67", "#6aa1e0", "#2fb8a0"];

export function Modules() {
  return (
    <section className="mods fu" id="modules" aria-labelledby="modules-title">
      <div className="l-container">
        <div className="sec-head">
          <span className="eyebrow">One need, one module</span>
          <h2 id="modules-title">Nine modules. One kernel underneath.</h2>
          <p>
            Turn on what the club needs today and add the rest later. Every module writes to the same contact, the same ledger and
            the same audit log — so a report is never a spreadsheet stitched together on Sunday night.
          </p>
        </div>

        <div className="mod-grid" role="list">
          {modules.map((m, i) => {
            const Icon = icons[i];
            return (
              <div className="mod" role="listitem" key={m.t}>
                <span className="ic" aria-hidden="true">
                  <Icon size={20} color={tints[i]} />
                </span>
                <div>
                  <div className="t">{m.t}</div>
                  <div className="d">{m.d}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="kernel" aria-label="Shared foundations">
          <span>
            <b>One contact</b> per person
          </span>
          <span>
            <b>One ledger</b> for every rupee
          </span>
          <span>
            <b>One audit log</b> for every change
          </span>
          <span>
            <b>Multi-club</b> from day one
          </span>
        </div>
      </div>
    </section>
  );
}
