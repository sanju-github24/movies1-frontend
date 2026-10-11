import React, { useEffect, useRef, useState } from "react";
import { Loader2, Languages, Maximize2, Minimize2, Expand, Shrink, ArrowDownRight } from "lucide-react";

/* AnchorMB: MoviBox's own player, framed, with our language row on top.

   MoviBox posts each language of a title as its own page, and its CDN only
   answers that page, so the page itself is what plays: the video goes from
   their CDN to the viewer and none of it passes through us. The pages are
   found by /api/movibox on the m3u8-player project, which runs in Mumbai
   because MoviBox answers Indian addresses.

   Switching language loads that language's page and it starts by itself.
   It cannot pick up at the same moment: their player only resumes from its
   own history, kept per language, and a page cannot reach into another
   site's frame to read or set the time. So we keep a rough clock of how long
   the last language was on screen and offer it as a hint.

   The frame is sandboxed. Their ads, left to themselves, send the whole tab
   to an advertiser's page a few seconds in (seen: xm.com) — our site with
   it. Without allow-top-navigation and allow-popups they cannot, and the
   player still plays. It also never scrolls: the crop only holds while their
   page sits at the top. And while their page is still putting itself
   together it is covered, until the video has had time to start. */
const LOOKUP = "https://m3u8-player-orcin.vercel.app/api/movibox";

const LANG_NAMES = { hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", bn: "Bengali",
  mr: "Marathi", pa: "Punjabi", en: "English", ko: "Korean", ja: "Japanese", zh: "Chinese", es: "Spanish" };
const nameOf = (l) => l.original
  ? `${LANG_NAMES[l.code] || "Original"} · Original`
  : (l.language || "").replace(/\s*dub$/i, "") || LANG_NAMES[l.code] || l.code;
const clock = (s) => {
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`;
};

/* Only their player, not their whole site. Their page is laid out for a
   phone below 768px wide: a header, then the player across the full width.
   So the page is drawn at a phone width L, cropped to the player and scaled
   to fill our box. Where the player starts was measured at widths from 390
   to 767 and moves in a straight line with the width; its height is 16:9.
   If they change the layout, "Full page" still shows all of it. */
const playerTop = (L) => Math.round(0.2453 * L + 69.4);
/* Directly above their player sits an ad box (their ThirdPartyBannerAd): a
   70px placeholder that either takes the height its ad reports or, with no
   ad within 12 seconds of appearing, collapses to nothing — and the player
   moves up by 70px. Embedded on our watch page it collapsed in most loads,
   13.8–14.3s after the frame's load event; in the rest an ad filled it.
   We cannot see inside their frame to tell which, so the crop follows the
   usual case: it glides up with the collapse when it is due. */
const AD_SLOT = 70;
const AD_COLLAPSE_MS = 13800;
function useBox(el) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return box;
}

const lookups = new Map();   // query → promise, for the life of the tab
function lookup(qs) {
  if (!lookups.has(qs)) {
    lookups.set(qs, fetch(`${LOOKUP}?${qs}`).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `lookup ${r.status}`);
      return d;
    }).catch((e) => { lookups.delete(qs); throw e; }));
  }
  return lookups.get(qs);
}

/* The same page for another episode: only these two parameters change. */
const atEpisode = (url, se, ep) => {
  try { const u = new URL(url); u.searchParams.set("detailSe", se); u.searchParams.set("detailEp", ep); return u.toString(); }
  catch { return url; }
};

export default function MoviboxFrame({ tmdbId, tv, season = 1, episode = 1, title = "", preferredLang = "", onUnavailable, onEpisode }) {
  const [langs, setLangs] = useState(null);
  /* A series: its seasons (from MoviBox, with how many episodes each has),
     the episode playing, and the season being looked through — picking a
     season only shows its episodes, picking an episode plays it. Switching
     episode is just that page with other numbers, so it needs no lookup. */
  const [seasons, setSeasons] = useState([]);
  const [at, setAt] = useState({ se: season, ep: episode });
  const [viewSe, setViewSe] = useState(season);
  const [pick, setPick] = useState(null);
  const [hint, setHint] = useState("");
  const [full, setFull] = useState(false);
  const [ready, setReady] = useState(false);
  /* Their player's own fullscreen button is the real fix for the crop: in
     it the video fills the screen whatever their ads do above it (checked:
     1280×800 exactly, from inside our sandbox). Only a tap inside their
     frame can press it, so we point at it — bottom right of the player —
     for a few seconds once the video is up. A tap in their frame takes the
     focus from our window, which is how we know to stop pointing. */
  const [fsTip, setFsTip] = useState(false);
  useEffect(() => {
    if (!ready || full) { setFsTip(false); return undefined; }
    setFsTip(true);
    const t = setTimeout(() => setFsTip(false), 8000);
    const gone = () => setFsTip(false);
    window.addEventListener("blur", gone);
    return () => { clearTimeout(t); window.removeEventListener("blur", gone); };
  }, [ready, full]);
  const shownAt = useRef(0);
  const readyTimer = useRef(0);
  const [settled, setSettled] = useState(false);   // their ad box above the player has collapsed
  const settleTimer = useRef(0);
  const startedAt = useRef(0);
  const [cssFull, setCssFull] = useState(false);     // iPhone: no element fullscreen there
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  const [area, setArea] = useState(null);   // a callback ref: the box appears only once the pages are found
  const box = useBox(area);
  const memo = `anchormb_lang:${tmdbId}`;

  useEffect(() => {
    let live = true;
    setLangs(null); setPick(null);
    const qs = new URLSearchParams({ tmdb: tmdbId, type: tv ? "tv" : "movie", ...(tv ? { se: season, ep: episode } : {}) });
    lookup(qs.toString()).then((d) => {
      if (!live) return;
      // Subtitled copies ("Arabic sub") are the same audio: only the original and the dubs.
      const list = (d.languages || []).filter((l) => l.original || !/\bsub\b/i.test(l.language));
      if (!list.length) { onUnavailable?.(); return; }
      list.sort((a, b) => (b.original - a.original));
      let saved = "";
      try { saved = localStorage.getItem(memo) || ""; } catch { /* private window */ }
      setLangs(list);
      setSeasons(tv ? (d.seasons || []) : []);
      setAt({ se: season, ep: episode });
      setViewSe(season);
      setPick(list.find((l) => l.subjectId === saved)
        || list.find((l) => preferredLang && (l.code === preferredLang.toLowerCase()
          || nameOf(l).toLowerCase().startsWith(preferredLang.toLowerCase())))
        || list[0]);
      startedAt.current = Date.now();
    }, () => { if (live) onUnavailable?.(); });
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId, tv, season, episode]);

  useEffect(() => { if (!hint) return; const t = setTimeout(() => setHint(""), 9000); return () => clearTimeout(t); }, [hint]);

  /* Covered from the moment a page starts loading. The video starts about
     5–6s after that (measured), a few seconds after the frame's load event,
     so the cover lifts 3.5s after load and not before 5.5s in — and after
     12s whatever happens, so a slow page is never hidden for good. */
  useEffect(() => {
    if (!pick) return undefined;
    setReady(false);
    shownAt.current = Date.now();
    setSettled(false);
    clearTimeout(settleTimer.current);
    clearTimeout(readyTimer.current);
    readyTimer.current = setTimeout(() => setReady(true), 12000);
    return () => { clearTimeout(readyTimer.current); clearTimeout(settleTimer.current); };
  }, [pick, full, at]);
  const loaded = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setSettled(true), AD_COLLAPSE_MS);
    clearTimeout(readyTimer.current);
    const wait = Math.max(3500, 5500 - (Date.now() - shownAt.current));
    readyTimer.current = setTimeout(() => setReady(true), wait);
  };

  /* Fullscreen is their player's own button, not ours. With our box
     fullscreen, pressing theirs puts the whole of their page on screen
     (sidebar, toolbar and all) instead of the video; with ours left alone,
     theirs fills the screen with just the video, wherever their ads have
     pushed it, and turns a phone sideways. So we never go fullscreen where
     theirs can — we point at it (fsTip). iPhone is the exception: there no
     page element goes fullscreen at all, so the box is fixed over the page
     and turned on its side while the phone is upright. */
  const realFullscreen = typeof document !== "undefined"
    && !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  useEffect(() => {
    if (realFullscreen) return undefined;
    setCssFull(true);
    const turn = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", turn);
    return () => window.removeEventListener("resize", turn);
  }, [realFullscreen]);

  const playEpisode = (se, ep) => {
    if (se === at.se && ep === at.ep) return;
    setHint("");
    setAt({ se, ep });
    startedAt.current = Date.now();
    onEpisode?.(se, ep);
  };
  const shownSeason = seasons.find((x) => x.se === viewSe) || seasons[0];

  const choose = (l) => {
    if (l.subjectId === pick?.subjectId) return;
    const was = (Date.now() - startedAt.current) / 1000;
    // Under a minute in, nothing worth getting back to.
    setHint(was > 60 ? `${nameOf(pick)} was around ${clock(was)} — drag the seek bar there to carry on` : "");
    try { localStorage.setItem(memo, l.subjectId); } catch { /* private window */ }
    setPick(l);
    startedAt.current = Date.now();
  };

  // iPhone's stand-in for fullscreen: fixed over everything, turned sideways while the phone is upright.
  const shell = cssFull
    ? { position: "fixed", zIndex: 2147483000, top: 0, left: 0, ...(portrait
        ? { width: "100vh", height: "100vw", transformOrigin: "top left", transform: "rotate(90deg) translateY(-100%)" }
        : { width: "100vw", height: "100vh" }) }
    : undefined;

  if (!langs || !pick) {
    return (
      <div style={shell} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 bg-black">
        <Loader2 className="w-7 h-7 animate-spin" />
        <p className="text-xs uppercase tracking-widest font-bold">Finding every language on AnchorMB…</p>
      </div>
    );
  }

  // The player, fitted into the area at 16:9.
  const vw = Math.min(box.w, box.h * 16 / 9), vh = vw * 9 / 16;
  const L = Math.min(720, Math.max(390, Math.round(vw)));
  const k = vw / L;
  const frameProps = {
    src: tv ? atEpisode(pick.url, at.se, at.ep) : pick.url,
    title: `${title} — ${nameOf(pick)}`,
    allow: "autoplay; encrypted-media; fullscreen; picture-in-picture", allowFullScreen: true,
    sandbox: "allow-scripts allow-same-origin allow-presentation",
    scrolling: "no", onLoad: loaded,
  };

  // Pinned to its container: the language row's width must not widen the page on a phone.
  return (
    <div style={shell} className="absolute inset-0 flex flex-col bg-black">
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 overflow-x-auto home-scroll border-b border-white/[0.06]">
        <Languages className="w-4 h-4 text-gray-500 shrink-0 mr-1" aria-hidden="true" />
        {langs.map((l) => (
          <button key={l.subjectId} type="button" onClick={() => choose(l)}
            aria-pressed={l.subjectId === pick.subjectId}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors
              ${l.subjectId === pick.subjectId ? "bg-white text-black" : "bg-white/[0.08] text-gray-300 hover:bg-white/15"}`}>
            {nameOf(l)}
          </button>
        ))}
        {!realFullscreen && (
          <button type="button" onClick={() => setCssFull((x) => !x)}
            aria-label={cssFull ? "Exit fullscreen" : "Fullscreen"}
            className="ml-auto shrink-0 w-8 h-8 rounded-full bg-white/[0.04] text-gray-400 hover:text-white flex items-center justify-center">
            {cssFull ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
          </button>
        )}
        <button type="button" onClick={() => setFull((x) => !x)} title={full ? "Just the player" : "Their full page"}
          className={`${realFullscreen ? "ml-auto " : ""}shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white bg-white/[0.04]`}>
          {full ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />} {full ? "Player" : "Full page"}
        </button>
      </div>
      {tv && shownSeason && (
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 overflow-x-auto home-scroll border-b border-white/[0.06]">
          {seasons.length > 1 ? seasons.map((x) => (
            <button key={x.se} type="button" onClick={() => setViewSe(x.se)}
              aria-label={`Season ${x.se}`}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-black transition-colors
                ${x.se === shownSeason.se ? "bg-blue-500 text-white" : "bg-white/[0.08] text-gray-300 hover:bg-white/15"}`}>
              S{x.se}
            </button>
          )) : <span className="shrink-0 text-xs font-black text-gray-400 px-1">S{shownSeason.se}</span>}
          <span className="shrink-0 w-px h-5 bg-white/15 mx-1" aria-hidden="true" />
          {Array.from({ length: shownSeason.eps }, (_, i) => i + 1).map((ep) => {
            const on = shownSeason.se === at.se && ep === at.ep;
            return (
              <button key={ep} type="button" onClick={() => playEpisode(shownSeason.se, ep)}
                aria-label={`Season ${shownSeason.se} episode ${ep}`} aria-current={on ? "true" : undefined}
                className={`shrink-0 min-w-[2.25rem] rounded-lg px-2 py-1.5 text-xs font-bold transition-colors
                  ${on ? "bg-white text-black" : "bg-white/[0.06] text-gray-300 hover:bg-white/15"}`}>
                E{ep}
              </button>
            );
          })}
        </div>
      )}
      <div className="relative flex-1 min-h-0">
        {/* Keyed by language, so a switch is a fresh page that starts by itself. */}
        {full ? (
          <iframe key={frameProps.src} {...frameProps} className="absolute inset-0 w-full h-full border-0" />
        ) : (
          <div ref={setArea} className="absolute inset-0 flex items-center justify-center">
            {vw > 0 && (
              <div className="relative overflow-hidden" style={{ width: vw, height: vh }}>
                <iframe key={frameProps.src} {...frameProps} className="absolute left-0 top-0 border-0"
                  style={{ width: L, height: playerTop(L) + L + 200, transformOrigin: "0 0",
                    transform: `scale(${k}) translateY(${-(playerTop(L) - (settled ? AD_SLOT : 0) + 1)}px)`,
                    transition: "transform 0.45s ease" }} />
                {fsTip && (
                  <div className="absolute right-2 bottom-12 z-10 pointer-events-none flex items-end gap-1 animate-pulse">
                    <span className="rounded-full bg-black/85 ring-1 ring-white/20 px-3 py-1.5 text-xs font-semibold text-white">
                      Tap the player's fullscreen ⛶ for the full picture
                    </span>
                    <ArrowDownRight className="w-6 h-6 text-white drop-shadow" aria-hidden="true" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {!ready && (
          <div className="absolute inset-0 z-10 bg-black flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin" />
            <p className="text-xs uppercase tracking-widest font-bold">Starting {nameOf(pick)}{tv ? ` · S${at.se}E${at.ep}` : ""}…</p>
          </div>
        )}
        {hint && (
          <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-16 max-w-[90%] rounded-full bg-black/85 ring-1 ring-white/15 px-4 py-2 text-xs text-white text-center pointer-events-none">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
