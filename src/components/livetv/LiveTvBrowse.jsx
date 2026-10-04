import React, { useEffect, useMemo, useState } from "react";
import { Play, Search, X, ChevronRight, ChevronDown, Tv } from "lucide-react";
import ScrollRow from "../ScrollRow";
import { CATEGORIES } from "../../utils/channelMeta";

/* The Live TV page's browsing: a hero of featured channels, then the
   channels by category in rows, narrowed by language. Playback stays with
   the page — every channel carries its own play().

   channels: [{ key, name, logo, category, lang, hd, play }] */

const LANGS = ["Kannada", "Hindi", "Tamil", "Telugu", "Malayalam", "English", "Bengali", "Marathi", "Gujarati", "Punjabi", "Odia"];
const CODE_TO_LANG = { kan: "Kannada", hin: "Hindi", tam: "Tamil", tel: "Telugu", mal: "Malayalam", eng: "English", ben: "Bengali", mar: "Marathi", guj: "Gujarati", pan: "Punjabi" };
const LANG_KEY = "live_tv_lang";

const CATEGORY_TITLES = {
  Sports: "Sports", News: "News", Entertainment: "Entertainment", Movies: "Movies",
  Kids: "Kids", Music: "Music", Devotional: "Devotional", Knowledge: "Knowledge & learning",
};

// Channels people come to this page for, in the order they are looked for.
const TRENDING = [/bigg ?boss/i, /star sports 1\b/i, /star sports 2\b/i, /colors kannada/i, /aaj ?tak/i, /star plus/i,
  /zee kannada/i, /sun tv/i, /star maa/i, /asianet\b/i, /sony sab/i, /colors\b(?! kannada)/i, /tv ?9/i, /ndtv/i,
  /star vijay/i, /zee tv/i, /udaya/i, /suvarna/i, /republic/i, /times now/i, /sony max/i, /star gold/i, /news ?18/i];

function prefLanguage() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved) return saved;
    const p = String(localStorage.getItem("preferred_audio_lang") || "").trim();
    return CODE_TO_LANG[p.toLowerCase().slice(0, 3)] || LANGS.find((l) => l.toLowerCase() === p.toLowerCase()) || "All";
  } catch { return "All"; }
}

/* ── One channel ─────────────────────────────────────────────────────────── */
function ChannelTile({ ch, active, onPlay, wide = false }) {
  const [broken, setBroken] = useState(false);
  return (
    <button type="button" onClick={() => onPlay(ch)} aria-label={`Watch ${ch.name} live`}
      className={`group block text-left w-full focus:outline-none ${wide ? "" : ""}`}>
      <span className={`relative flex items-center justify-center aspect-[16/10] rounded-xl overflow-hidden
                        bg-[radial-gradient(ellipse_at_center,_#1d1d27_0%,_#111118_70%)]
                        ring-1 transition-all duration-200
                        ${active ? "ring-2 ring-red-500" : "ring-white/[0.07] group-hover:ring-white/25 group-focus-visible:ring-blue-400"}
                        group-hover:-translate-y-0.5 motion-reduce:transform-none`}>
        {ch.logo && !broken ? (
          <img src={ch.logo} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)}
            className="max-h-[58%] max-w-[68%] object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none drop-shadow-[0_4px_18px_rgba(0,0,0,0.5)]" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-white/30 px-3 text-center">
            <Tv className="w-6 h-6" aria-hidden="true" />
            <span className="text-[11px] font-semibold line-clamp-2">{ch.name}</span>
          </span>
        )}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black tracking-wide text-white">
          <span className="w-1 h-1 rounded-full bg-white animate-pulse motion-reduce:animate-none" aria-hidden="true" />LIVE
        </span>
        {ch.hd && (
          <span className="absolute top-2 right-2 rounded-md bg-black/60 border border-white/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white/80">HD</span>
        )}
        {active && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-bold text-white gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" aria-hidden="true" />Playing
          </span>
        )}
      </span>
      <span className="block mt-2 px-0.5">
        <span className="block text-[13px] sm:text-sm font-semibold text-white truncate">{ch.name}</span>
        <span className="block text-[11px] text-gray-500 truncate">{[ch.category, ch.lang].filter(Boolean).join(" · ")}</span>
      </span>
    </button>
  );
}

/* ── Hero ────────────────────────────────────────────────────────────────── */
function LiveHero({ slides, onPlay }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => { setI(0); }, [slides.length]);
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [paused, slides.length]);
  const ch = slides[i];
  if (!ch) return null;
  return (
    <section className="relative overflow-hidden h-[340px] sm:h-[460px] lg:h-[520px]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="Featured live channels">
      {/* Ambient: the logo, huge and blurred, and a faint LIVE behind everything. */}
      {ch.logo && (
        <img key={ch.key + "-bg"} src={ch.logo} alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl opacity-25 animate-in fade-in duration-700" />
      )}
      <span aria-hidden="true" className="absolute right-[-2%] top-1/2 -translate-y-1/2 select-none font-black tracking-tighter text-white/[0.035] text-[34vw] sm:text-[26vw] leading-none">LIVE</span>
      <div className="absolute inset-0 bg-gradient-to-r from-[#07070f] via-[#07070f]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07070f] via-transparent to-[#07070f]/60" />

      <div key={ch.key} className="relative h-full max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col justify-center gap-5 sm:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="shrink-0 flex items-center justify-center w-20 h-20 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl bg-[#16161f] ring-1 ring-white/10 shadow-2xl shadow-black/60 overflow-hidden">
            {ch.logo ? <img src={ch.logo} alt="" className="max-w-[78%] max-h-[78%] object-contain" />
              : <Tv className="w-10 h-10 text-white/30" aria-hidden="true" />}
          </span>
          <h2 className="text-[26px] leading-tight sm:text-5xl lg:text-6xl font-black tracking-tight text-white line-clamp-2">{ch.name}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-black tracking-wide text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none" aria-hidden="true" />LIVE
          </span>
          {ch.category && <span className="rounded-md bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300">{ch.category}</span>}
          {ch.lang && <span className="rounded-md bg-white/[0.06] border border-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70">{ch.lang}</span>}
          {ch.hd && <span className="rounded-md bg-white/[0.06] border border-white/10 px-2.5 py-1 text-[11px] font-bold text-white/70">HD</span>}
        </div>
        <div>
          <button type="button" onClick={() => onPlay(ch)}
            className="inline-flex items-center gap-2.5 rounded-full bg-white px-7 sm:px-9 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-black
                       hover:bg-gray-200 active:scale-[0.98] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30">
            <Play className="w-4 h-4 fill-current" aria-hidden="true" /> Watch Now
          </button>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-5 sm:bottom-8 inset-x-0 flex justify-center gap-1.5">
          {slides.map((s, n) => (
            <button key={s.key} type="button" onClick={() => setI(n)} aria-label={`Show ${s.name}`} aria-current={n === i}
              className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60"}`} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── A category row ──────────────────────────────────────────────────────── */
function ChannelRow({ title, items, activeKey, onPlay }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mb-9 sm:mb-11">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-lg sm:text-[22px] font-bold text-white tracking-tight">{title}</h3>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/[0.07] px-3 py-1.5 text-xs sm:text-[13px] font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition">
          {open ? "Show less" : `${items.length} channels`}
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? "-rotate-90" : ""}`} aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 sm:gap-x-4 gap-y-5">
          {items.map((ch) => <ChannelTile key={ch.key} ch={ch} active={ch.key === activeKey} onPlay={onPlay} />)}
        </div>
      ) : (
        <ScrollRow gap="gap-3 sm:gap-4" label={title}>
          {items.slice(0, 30).map((ch) => (
            <div key={ch.key} className="shrink-0 w-[164px] sm:w-[220px] lg:w-[250px]">
              <ChannelTile ch={ch} active={ch.key === activeKey} onPlay={onPlay} />
            </div>
          ))}
        </ScrollRow>
      )}
    </section>
  );
}

/* ── The page body ───────────────────────────────────────────────────────── */
export default function LiveTvBrowse({ channels, activeKey, onPlay, showHero = true, children }) {
  const [lang, setLang] = useState(prefLanguage);
  const [query, setQuery] = useState("");
  const chooseLang = (l) => { setLang(l); try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode */ } };

  // Only offer languages that have channels.
  const langs = useMemo(() => LANGS.filter((l) => channels.some((c) => c.lang === l)), [channels]);
  const inLang = useMemo(
    () => (lang === "All" ? channels : channels.filter((c) => c.lang === lang)),
    [channels, lang]);

  // Channels with a logo first: a row of blank tiles is no way to browse.
  const byLook = (list) => [...list.filter((c) => c.logo), ...list.filter((c) => !c.logo)];

  const trending = useMemo(() => {
    const out = [], seen = new Set();
    // Bigg Boss once per language would fill the row on its own: only the
    // chosen language's (Kannada and Hindi when showing everything).
    const bbLangs = lang === "All" ? ["Kannada", "Hindi"] : [lang];
    for (const re of TRENDING) for (const c of inLang) {
      if (seen.has(c.key) || !re.test(c.name)) continue;
      if (/bigg ?boss/i.test(c.name) && !bbLangs.includes(c.lang)) continue;
      seen.add(c.key); out.push(c);
    }
    return out.slice(0, 24);
  }, [inLang, lang]);

  /* Featured: Bigg Boss in the chosen language (or Kannada), the first
     sports channel, then the leaders of entertainment, news and kids. */
  const featured = useMemo(() => {
    const out = [], seen = new Set();
    const add = (c) => { if (c && !seen.has(c.key)) { seen.add(c.key); out.push(c); } };
    const bbLang = lang === "All" ? "Kannada" : lang;
    add(channels.find((c) => /bigg ?boss/i.test(c.name) && c.lang === bbLang && c.logo));
    const pool = byLook(inLang);
    add(pool.find((c) => c.category === "Sports" && c.logo));
    trending.filter((c) => c.logo).slice(0, 3).forEach(add);
    for (const cat of ["Entertainment", "News", "Movies", "Kids"]) add(pool.find((c) => c.category === cat && c.logo && !seen.has(c.key)));
    return out.slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, inLang, trending, lang]);

  const rows = useMemo(() => CATEGORIES
    .map((cat) => ({ cat, items: byLook(inLang.filter((c) => c.category === cat)) }))
    .filter((r) => r.items.length >= 4),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [inLang]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => (q ? byLook(channels.filter((c) => c.name.toLowerCase().includes(q))) : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [channels, q]);

  return (
    <div>
      {showHero && !q && featured.length > 0 && <LiveHero slides={featured} onPlay={onPlay} />}

      <div className="max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-16">
        {/* Header: title, search, language */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Live TV</h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500">
              {channels.length ? `${channels.length.toLocaleString()} channels streaming now` : "Stream live channels"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <label className="relative block sm:w-72">
              <span className="sr-only">Search channels</span>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search channels"
                className="w-full rounded-full bg-white/[0.05] border border-white/10 pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-gray-500
                           focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition" />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </label>
            <label className="flex items-center gap-2.5">
              <span className="text-sm text-gray-500 shrink-0">Language</span>
              <span className="relative">
                <select value={lang} onChange={(e) => chooseLang(e.target.value)}
                  className="appearance-none rounded-full bg-white/[0.05] border border-white/10 pl-4 pr-9 py-2.5 text-sm font-medium text-white
                             focus:outline-none focus:border-white/30 cursor-pointer">
                  <option value="All" className="bg-gray-900">All languages</option>
                  {langs.map((l) => <option key={l} value={l} className="bg-gray-900">{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
              </span>
            </label>
          </div>
        </div>

        {/* Language chips — the same choice, one tap away on a phone. */}
        {!q && langs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-8">
            {["All", ...langs].map((l) => (
              <button key={l} type="button" onClick={() => chooseLang(l)} aria-pressed={lang === l}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition border
                  ${lang === l ? "bg-white text-black border-white" : "bg-white/[0.04] text-gray-300 border-white/10 hover:bg-white/10"}`}>
                {l === "All" ? "All" : l}
              </button>
            ))}
          </div>
        )}

        {q ? (
          <section>
            <p className="text-sm text-gray-400 mb-5">
              {results.length ? `${results.length} channel${results.length === 1 ? "" : "s"} for “${query.trim()}”` : `No channel called “${query.trim()}”`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 sm:gap-x-4 gap-y-5">
              {results.slice(0, 120).map((ch) => <ChannelTile key={ch.key} ch={ch} active={ch.key === activeKey} onPlay={onPlay} />)}
            </div>
          </section>
        ) : (
          <>
            {trending.length >= 4 && <ChannelRow title="Trending" items={trending} activeKey={activeKey} onPlay={onPlay} />}
            {children /* live sports fixtures, between trending and the categories */}
            {rows.map((r) => (
              <ChannelRow key={r.cat} title={CATEGORY_TITLES[r.cat] || r.cat} items={r.items} activeKey={activeKey} onPlay={onPlay} />
            ))}
            {!rows.length && !trending.length && (
              <p className="py-16 text-center text-gray-500">No {lang} channels are streaming right now.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
