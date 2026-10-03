"use client";

import { useEffect } from "react";

/** Adds `.vis` to every `.fu` element as it scrolls into view. Renders nothing. */
export function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".fu");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("vis"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("vis");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
