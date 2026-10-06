import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/* A thin bar across the top while something the viewer asked for is loading
   — a page opening, a button's request — so a tap visibly did something.

   Every request the site makes goes through fetch or XMLHttpRequest, so both
   are watched here once rather than at each button. Only requests that start
   just after a click, tap, Enter or page change count: background work — live
   scores refreshing, a song's next track lining up — never moves the bar. */

const WINDOW_MS = 1500;
let lastAction = 0;
let inflight = 0;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(inflight));
const track = () => {
  if (Date.now() - lastAction > WINDOW_MS) return () => {};
  inflight += 1; emit();
  let done = false;
  return () => { if (done) return; done = true; inflight = Math.max(0, inflight - 1); emit(); };
};

if (typeof window !== "undefined" && !window.__topLoader) {
  window.__topLoader = true;
  const mark = () => { lastAction = Date.now(); };
  window.addEventListener("pointerdown", mark, true);
  window.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") mark(); }, true);
  window.addEventListener("submit", mark, true);
  window.addEventListener("popstate", mark);

  const nativeFetch = window.fetch;
  window.fetch = function (...args) {
    const end = track();
    const p = nativeFetch.apply(this, args);
    p.then(end, end);
    return p;
  };

  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    const end = track();
    this.addEventListener("loadend", end, { once: true });
    return send.apply(this, args);
  };
}

export default function TopLoader() {
  const { pathname, search } = useLocation();
  const [width, setWidth] = useState(0);       // 0–100
  const [shown, setShown] = useState(false);
  const busy = useRef(false);
  const timers = useRef([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const start = () => {
    clear();
    busy.current = true;
    setShown(true);
    setWidth((w) => (w > 0 && w < 100 ? w : 8));
    // Creep towards 90% — fast at first, slower the longer it takes.
    [[60, 30], [400, 55], [1200, 72], [2500, 84], [5000, 90]].forEach(([ms, w]) =>
      timers.current.push(setTimeout(() => busy.current && setWidth((cur) => Math.max(cur, w)), ms)));
  };
  const finish = () => {
    if (!busy.current) return;
    busy.current = false;
    clear();
    setWidth(100);
    timers.current.push(setTimeout(() => setShown(false), 250));
    timers.current.push(setTimeout(() => setWidth(0), 500));
  };

  // Requests the viewer started.
  useEffect(() => {
    const on = (n) => (n > 0 ? start() : finish());
    listeners.add(on);
    return () => { listeners.delete(on); };
  }, []);

  // A page change: shown at once, and done when its requests are (or soon, if it makes none).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    lastAction = Date.now();
    start();
    const t = setTimeout(() => { if (inflight === 0) finish(); }, 350);
    return () => clearTimeout(t);
  }, [pathname, search]);

  useEffect(() => () => clear(), []);

  return (
    <div aria-hidden="true" className="fixed top-0 left-0 right-0 z-[10000] h-[3px] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]"
        style={{
          width: `${width}%`,
          opacity: shown ? 1 : 0,
          transition: `width ${width === 0 ? 0 : 300}ms ease-out, opacity 250ms ease`,
        }}
      />
    </div>
  );
}
