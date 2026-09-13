import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* A horizontal row that can actually be driven with a mouse.

   The rails on this site were bare `overflow-x-auto` divs. That is fine on a
   phone, where you swipe, but on a desktop there is nothing to grab: the
   scrollbar is hidden, so the only tell that a row continues past the right
   edge is a poster clipped by the viewport, and the only way to move it is a
   trackpad gesture or a shift-wheel most people never learned.

   So: an arrow at each end, shown only on the side that has somewhere to go,
   fading in on hover the way the streaming apps do. It scrolls by very nearly
   a full viewport of the row rather than a fixed pixel count, so one click
   advances a page of cards at every screen size instead of three cards on a
   laptop and half a card on a monitor.

   Keyboard and touch are untouched — this only adds a pointer affordance on
   top of a row that already scrolls natively. */
export default function ScrollRow({ children, className = "", gap = "gap-4", label }) {
  const ref = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 8);
    // A row that fits entirely has max === 0, and both arrows stay hidden.
    setAtEnd(el.scrollLeft >= max - 8);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    /* Cards arrive with their posters, and an image finishing its download
       changes the row's width without firing scroll or resize. */
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [measure, children]);

  const page = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.85), behavior: "smooth" });
  };

  const arrow =
    `absolute top-0 bottom-0 z-20 hidden sm:flex items-center justify-center w-12
     text-white transition-opacity duration-200
     opacity-0 group-hover/row:opacity-100 focus:opacity-100
     focus:outline-none focus-visible:ring-2 focus-visible:ring-white`;

  return (
    <div className="relative group/row" role="group" aria-label={label}>
      {!atStart && (
        <button type="button" onClick={() => page(-1)} aria-label="Scroll left"
          className={`${arrow} left-0 bg-gradient-to-r from-gray-950 via-gray-950/80 to-transparent rounded-l-xl`}>
          <ChevronLeft className="w-7 h-7 drop-shadow" />
        </button>
      )}

      <div ref={ref}
        className={`flex ${gap} overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory ${className}`}>
        {children}
      </div>

      {!atEnd && (
        <button type="button" onClick={() => page(1)} aria-label="Scroll right"
          className={`${arrow} right-0 bg-gradient-to-l from-gray-950 via-gray-950/80 to-transparent rounded-r-xl`}>
          <ChevronRight className="w-7 h-7 drop-shadow" />
        </button>
      )}
    </div>
  );
}
