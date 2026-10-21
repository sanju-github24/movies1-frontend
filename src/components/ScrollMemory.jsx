import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/* Back (and Forward) returns to exactly where the viewer was — down the page
   and along every row — on every page, desktop and phone.

   Each history entry keeps its own place (sessionStorage, by the router's
   location key). A new page starts at the top; one reached by Back or
   Forward is put back.

   The place is kept by WHAT was on screen, not only by pixels. Pages build
   themselves in pieces — the home page's rows arrive one after another — so
   on the way back a row can load above the spot and push everything down;
   a bare pixel offset then lands on the wrong rows. So the row nearest the
   top of the screen is remembered by its name (its label, or the heading
   above it) and how far down the screen it sat, and on return the page is
   moved until that row sits there again — correcting as more loads above,
   until the page has held still for a second. Each sideways row's position
   is kept by name too. A page with no named rows falls back to its pixel
   offset. Any scroll, tap, click or key from the viewer ends it at once.

   Positions are saved as the viewer scrolls, never on the way out: by then
   the next page may already have moved the scroll. */

const ROWS = ".overflow-x-auto";
// Its own key: the scroll code before this one kept a bare number under "scroll:".
const keyOf = (k) => `scrollmem:${k}`;
const read = (k) => {
  try {
    const v = JSON.parse(sessionStorage.getItem(keyOf(k)) || "null");
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;   // anything else is not ours
  } catch { return null; }
};
const write = (k, v) => { try { sessionStorage.setItem(keyOf(k), JSON.stringify(v)); } catch { /* private mode */ } };
const instant = (el, x, y) => {
  try { (el || window).scrollTo({ left: x, top: y, behavior: "instant" }); } catch { (el || window).scrollTo(x, y); }
};

/* A row's name: the label of the group it is in, else the first heading in
   the nearest container that has one. Rows sharing a name are told apart by
   order ("Top 10#2"). */
const baseName = (el) => {
  const g = el.closest("[aria-label]");
  const label = g && g.getAttribute("aria-label");
  if (label && label.length > 1) return `l:${label}`;
  let n = el;
  for (let i = 0; i < 4 && n; i++) {
    n = n.parentElement;
    const h = n && n.querySelector("h1,h2,h3,h4");
    const t = h && h.textContent.trim();
    if (t) return `h:${t.slice(0, 60)}`;
  }
  return null;
};
const namedRows = () => {
  const seen = {};
  return [...document.querySelectorAll(ROWS)].map((el, i) => {
    const b = baseName(el);
    const name = b ? `${b}#${(seen[b] = (seen[b] || 0) + 1)}` : `i:${i}`;
    return { el, name };
  });
};

export default function ScrollMemory() {
  const location = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);

  // Save, as the viewer scrolls: the page (and the row it is at), and rows moved sideways.
  useEffect(() => {
    const k = location.key;
    const state = read(k) || { y: 0, rows: {}, anchor: null };
    state.rows = state.rows || {};
    let raf = 0, pageMoved = false;
    const flush = () => {
      raf = 0;
      if (pageMoved) {
        pageMoved = false;
        state.y = Math.round(window.scrollY);
        // The first named row still on screen, and where it sits — once a frame, not per event.
        const at = namedRows().filter((r) => !r.name.startsWith("i:")).find((r) => r.el.getBoundingClientRect().bottom > 64);
        state.anchor = at && state.y > 0 ? { name: at.name, top: Math.round(at.el.getBoundingClientRect().top) } : null;
      }
      write(k, state);
    };
    const onScroll = (e) => {
      const t = e.target;
      if (t === document || t === document.documentElement || t === document.body) {
        pageMoved = true;
      } else if (t instanceof Element && t.matches(ROWS)) {
        const r = namedRows().find((x) => x.el === t);
        if (!r) return;
        if (t.scrollLeft > 0) state.rows[r.name] = Math.round(t.scrollLeft); else delete state.rows[r.name];
      } else return;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    };
  }, [location.key]);

  // Restore on Back/Forward; start at the top otherwise.
  useEffect(() => {
    const saved = navType === "POP" ? read(location.key) : null;
    if (!saved) { instant(null, 0, 0); return undefined; }

    const t0 = performance.now();
    let raf = 0, done = false, stillSince = 0;
    const stop = () => {
      done = true;
      if (raf) cancelAnimationFrame(raf);
      ["wheel", "touchstart", "keydown", "mousedown"].forEach((ev) => window.removeEventListener(ev, stop, true));
    };
    ["wheel", "touchstart", "keydown", "mousedown"].forEach((ev) => window.addEventListener(ev, stop, { capture: true, passive: true }));

    const step = () => {
      if (done) return;
      let moved = false;
      const rows = namedRows();
      const byName = new Map(rows.map((r) => [r.name, r.el]));

      // Down the page: line the remembered row up again, else the pixel offset.
      const anchorEl = saved.anchor && byName.get(saved.anchor.name);
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      let target = saved.y || 0;
      if (anchorEl) target = window.scrollY + anchorEl.getBoundingClientRect().top - saved.anchor.top;
      const want = Math.min(Math.max(0, Math.round(target)), max);
      if (Math.abs(window.scrollY - want) > 2) { instant(null, 0, want); moved = true; }
      const reachable = anchorEl || max >= (saved.y || 0) - 2;

      // Along each row.
      let rowsReady = true;
      for (const [name, left] of Object.entries(saved.rows || {})) {
        const el = byName.get(name);
        if (!el || el.scrollWidth - el.clientWidth < left - 2) { rowsReady = false; continue; }
        if (Math.abs(el.scrollLeft - left) > 2) { instant(el, left, el.scrollTop); moved = true; }
      }

      // Done once in place and nothing has needed correcting for a second.
      if (!moved && reachable && rowsReady) {
        stillSince = stillSince || performance.now();
        if (performance.now() - stillSince > 1000) return stop();
      } else stillSince = 0;
      if (performance.now() - t0 > 8000) return stop();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return stop;
  }, [location.key, navType]);

  return null;
}
