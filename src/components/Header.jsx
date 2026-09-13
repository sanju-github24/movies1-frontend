import React, { useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { SITE_ORIGIN, ownUrl } from "../utils/seo";
import { isIndiaMensMatch } from "../utils/indiaMatch";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { FaWhatsapp, FaTelegramPlane } from "react-icons/fa";
import { Copy, Zap, MonitorPlay, Sparkles, ChevronRight,
         Goal, Trophy, Play, ImageOff, Flame, Star, Download } from "lucide-react";
import { AppContext } from "../context/AppContext";
import MobileDetailSheet from "./MobileDetailSheet";
import DesktopDetailOverlay from "../paged/DesktopDetailOverlay";
import { LIVE_SHOWS, liveStatus, useLiveClock } from "../utils/liveShow";
import { seasonNo } from "../utils/titleEpisodes";
import { teamCrest } from "../utils/teamCrest";
import { POSTER_GRID } from "../utils/posterGrid";
import ScrollRow from "./ScrollRow";
// ─── MATCH HASH ENCODER ───────────────────────────────────────────────────────
function encodeMatchHash(payload) {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const API_BASE         = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
const FIFA_API_BASE    = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION = "17";
const FIFA_SEASON      = "285023";
const FIFA_STAGE       = "289273";
const WT20_SERIES_ID   = "12672";

// ─── FLAGS / HELPERS ──────────────────────────────────────────────────────────
const ICC_FLAGS = {
  ENG:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",SL:"🇱🇰",AUS:"🇦🇺",SA:"🇿🇦",IND:"🇮🇳",AFG:"🇦🇫",
  PAK:"🇵🇰",NZ:"🇳🇿",WI:"🏴",SCO:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",IRE:"🇮🇪",BAN:"🇧🇩",NED:"🇳🇱",
};
function getFlag(c) { return ICC_FLAGS[c] || "🏏"; }
function getFifaFlag(code) { return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`; }
const BCCI_FMT = { "One Day D/N":"ODI","One Day":"ODI","T20":"T20I","Test":"Test","Test D/N":"Test" };
function bcciFmt(t) { return BCCI_FMT[t] || t || "MATCH"; }
function fifaName(t) { return t?.TeamName?.find(x=>x.Locale==="en-GB")?.Description||t?.Abbreviation||""; }
function fifaStatus(m) {
  if (m.MatchStatus===3) return "live";
  if (m.HomeTeamScore!==null&&m.HomeTeamScore!==undefined) return "finished";
  return "upcoming";
}

// ─── LIVE SPORTS HOOK ─────────────────────────────────────────────────────────
function useLiveSports() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    const out = [];

    // BCCI India cricket
    try {
      const r = await fetch(`${API_BASE}/api/bcci/live`);
      if (r.ok) {
        const j = await r.json();
        /* India's senior men only. BCCI's live feed now carries every live
           match in the world, so without this the home page strip fills with
           Duleep Trophy zonal games and other boards' fixtures. */
        (j.liveMatches||[]).filter(isIndiaMensMatch).forEach(m => out.push({
          id: `bcci-${m.MatchID}`,
          sport: "cricket", type: "bcci",
          badge: bcciFmt(m.MatchType),
          homeCode: m.FirstBattingTeamCode||"—",
          awayCode: m.SecondBattingTeamCode||"—",
          homeFlag: getFlag(m.FirstBattingTeamCode),
          awayFlag: getFlag(m.SecondBattingTeamCode),
          homeScore: m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]||0}` : null,
          awayScore: m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]||0}` : null,
          homeOvers: m["1FallOvers"]||"",
          striker: m.CurrentStrikerName ? `★ ${m.CurrentStrikerName} ${m.StrikerRuns}(${m.StrikerBalls})` : "",
          status: m.ChasingText||"",
          /* Everything below is straight off the feed — no invented view
             counts or "watching now" figures, because we do not have them and
             a made-up number on a live card is worse than no number. */
          homeName:  m.FirstBattingTeamName || m.FirstBattingTeamCode || "",
          awayName:  m.SecondBattingTeamName || m.SecondBattingTeamCode || "",
          series:    m.CompetitionName || "",
          matchOrder: m.MatchOrder || "",
          venue:     m.GroundName || "",
          year:      (m.MatchDate || "").slice(0, 4),
          hash: encodeMatchHash({
            sport:"cricket", type:"bcci",
            homeCode: m.FirstBattingTeamCode||"—",
            awayCode: m.SecondBattingTeamCode||"—",
            matchData: m,
          }),
        }));
      }
    } catch {}

    // WT20 Women's T20 WC
    try {
      const r = await fetch(`${API_BASE}/api/wt20/schedule?series_ids=${WT20_SERIES_ID}&game_count=10`);
      if (r.ok) {
        const j = await r.json();
        (j.data?.matches||[]).filter(m=>m.live).forEach(m => {
          const sc = m.scores?.[0];
          out.push({
            id: `wt20-${m.match_id}`,
            sport: "cricket", type: "wt20",
            badge: "T20I",
            homeCode: m.teama_short||"—",
            awayCode: m.teamb_short||"—",
            homeFlag: getFlag(m.teama_short),
            awayFlag: getFlag(m.teamb_short),
            homeScore: sc ? `${sc.team_runs}/${sc.team_wickets}` : null,
            awayScore: null,
            homeOvers: sc?.team_overs||"",
            striker: "",
            status: m.match_result||"",
            hash: encodeMatchHash({
              sport:"cricket", type:"wt20",
              homeCode: m.teama_short||"—",
              awayCode: m.teamb_short||"—",
              matchId: m.match_id,
            }),
          });
        });
      }
    } catch {}

    // FIFA WC 2026
    try {
      const r = await fetch(
        `${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`,
        { headers: { Accept:"application/json" } }
      );
      if (r.ok) {
        const j = await r.json();
        (j.Results||[]).filter(m=>fifaStatus(m)==="live").forEach(m => {
          const h=m.Home, a=m.Away;
          out.push({
            id: `fifa-${m.IdMatch}`,
            sport: "football", type: "fifa",
            badge: "FIFA WC",
            homeCode: h?.Abbreviation||fifaName(h)||"—",
            awayCode: a?.Abbreviation||fifaName(a)||"—",
            homeFlagUrl: getFifaFlag(h?.IdCountry),
            awayFlagUrl: getFifaFlag(a?.IdCountry),
            homeScore: m.HomeTeamScore??null,
            awayScore: m.AwayTeamScore??null,
            homeOvers: "",
            striker: "",
            status: m.MatchTime||"",
            hash: encodeMatchHash({
              sport:"football", type:"fifa",
              homeCode: h?.Abbreviation||fifaName(h)||"—",
              awayCode: a?.Abbreviation||fifaName(a)||"—",
              matchId: m.IdMatch,
            }),
          });
        });
      }
    } catch {}

    setMatches(out);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch_();
    const t = setInterval(fetch_, 45000);
    return () => clearInterval(t);
  }, [fetch_]);

  return { matches, loading };
}

// ─── PULSING DOT ──────────────────────────────────────────────────────────────
function Dot({ color="#ef4444", size=5 }) {
  return (
    <span className="relative flex shrink-0" style={{width:size,height:size}}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{background:color}}/>
      <span className="relative inline-flex rounded-full h-full w-full"
        style={{background:color}}/>
    </span>
  );
}

// ─── ON-AIR BANNER ────────────────────────────────────────────────────────────
/* A nightly telecast that's mid-broadcast. Deliberately unlike the live-sports
   strip above it: sports is a muted card built around a running score, so it
   stays quiet and factual. A telecast has no score — the only thing worth
   saying is that it's on right now and for how much longer — so this one is
   loud on purpose: the show's own backdrop, an equalizer instead of a ping
   dot, and a red edge that makes it the first thing the eye lands on. It
   exists only while the show is actually on air. */
function OnAirBars() {
  return (
    <span className="flex items-end gap-[3px] h-4 shrink-0" aria-hidden="true">
      {[0, 180, 360, 120].map((delay, i) => (
        <span key={i}
          className="onair-bar w-[3px] h-full rounded-full bg-red-500"
          style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

function LiveShowBanner() {
  const navigate = useNavigate();
  const clock = useLiveClock();
  const [row, setRow] = useState(null);

  // Whichever telecast is on air this minute, if any.
  const onAir = useMemo(() => {
    for (const show of Object.values(LIVE_SHOWS)) {
      const st = liveStatus(show, clock);
      if (st.live) return { show, st };
    }
    return null;
  }, [clock]);

  const slug = onAir?.show.slug || null;

  /* Artwork comes from the show's own row, so the banner never drifts from
     what the rest of the site shows for it. */
  useEffect(() => {
    if (!slug) { setRow(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.from("watch_html")
        .select("slug,title,poster,cover_poster,title_logo").eq("slug", slug).limit(1);
      if (alive) setRow(data?.[0] || null);
    })();
    return () => { alive = false; };
  }, [slug]);

  if (!onAir) return null;
  const { show, st } = onAir;
  const art = row?.cover_poster || row?.poster || null;

  return (
    <button
      onClick={() => navigate(`/watch/${show.slug}`)}
      className="w-full max-w-[1800px] mt-4 text-left group relative overflow-hidden rounded-2xl border border-red-500/30 hover:border-red-500/60 transition-all duration-300 active:scale-[0.995] shadow-[0_0_40px_rgba(239,68,68,0.12)] hover:shadow-[0_0_60px_rgba(239,68,68,0.22)]"
    >
      {art && (
        <img src={art} alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-top opacity-40 scale-105 group-hover:opacity-55 group-hover:scale-110 transition-all duration-700" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/85 to-gray-950/30" />
      <span className="absolute left-0 inset-y-0 w-[3px] bg-red-500 shadow-[0_0_20px_#ef4444]" />

      <div className="relative flex items-center gap-3 sm:gap-4 pl-4 pr-3 sm:pl-5 sm:pr-4 py-3.5">
        <OnAirBars />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white bg-red-600 px-2.5 py-1 rounded-full leading-none">
              On Air
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-red-300">
              {st.episodeLabel}
            </span>
            <span className="text-[11px] text-gray-300 font-bold">
              · {st.minutesLeft}m left
            </span>
          </div>

          {row?.title_logo ? (
            <img src={row.title_logo} alt={row?.title || show.name}
              className="h-6 sm:h-8 w-auto max-w-[70%] object-contain object-left mt-1.5 drop-shadow-lg" />
          ) : (
            <p className="text-[13px] sm:text-[15px] font-black text-white truncate mt-1 uppercase italic tracking-tight">
              {row?.title || show.name}
            </p>
          )}
        </div>

        <span className="shrink-0 flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-white bg-red-600 group-hover:bg-red-500 px-4 py-2.5 rounded-xl transition-colors">
          Watch Live <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

/* The hero's metadata line: year, certification, seasons, languages.

   None of it comes from one place, and two of the four are not in the database
   at all. `movies` has no year and no certification column, and neither does
   `watch_html` — the earlier version of this read movie.year and
   movie.certification, which are always undefined, so the line silently showed
   nothing but the languages unless the title happened to carry "(2026)" in its
   text. Year, certification and the season count come from the same
   tmdb-details endpoint the detail overlay uses; the episode list on the
   watch_html row is the fallback for seasons when TMDB has no count. */
function heroMeta(movie, art = {}, extra = {}) {
  /* A live match has none of the fields below — no year, no certification, no
     season count — but it does have the two things worth knowing at a glance:
     the format, and where the game stands. */
  if (movie.liveKind === LIVE_CRICKET) {
    const m = movie.match || {};
    return ["Cricket", m.badge, m.matchOrder].filter(Boolean);
  }
  const langs = Array.isArray(movie.language) ? movie.language : (movie.language ? [movie.language] : []);
  const eps = Array.isArray(art.episodes) ? art.episodes : [];
  const seasons = Number(extra.number_of_seasons) || (eps.length ? new Set(eps.map(seasonNo)).size : 0);

  const bits = [];
  const year = extra.year || String(movie.title || "").match(/\((\d{4})\)/)?.[1];
  if (year) bits.push(String(year));
  if (extra.certification) bits.push(extra.certification);
  if (seasons) bits.push(seasons > 1 ? `${seasons} Seasons` : "1 Season");
  if (langs.length) bits.push(langs.length > 1 ? `${langs.length} Languages` : langs[0]);
  return bits;
}

/* A hero is a place to be tempted, not briefed. Anything past a couple of
   sentences is unreadable over artwork anyway, so cut on a word boundary
   rather than letting CSS clip mid-word. */
function shortDescription(text, words = 28) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const parts = clean.split(" ");
  return parts.length <= words ? clean : parts.slice(0, words).join(" ") + "…";
}

/* How fast the hero's copy travels over its artwork as you scroll.

   Reads --hero-p, the 0→1 scroll progress published on the document element
   each frame. The
   text clears the frame well before the scroll completes (hence the 1.6) so it
   is gone by the time the catalogue reaches it, rather than fading out under
   the first row of posters. */
const heroCopyParallax = {
  transform: "translate3d(0, calc(var(--hero-p, 0) * -120px), 0)",
  opacity: "calc(1 - var(--hero-p, 0) * 1.6)",
  willChange: "transform, opacity",
};

/* ── Live slides in the hero ─────────────────────────────────────────────────

   The home page already knew about two kinds of live thing and showed neither
   in the hero: a cricket match (the strip below it) and a nightly telecast
   (the banner above it). Both are the most time-sensitive thing on the page
   while they are on, and both were relegated beneath the newest upload.

   They take very different shapes in the hero, because they are different
   things:

   - Cricket has no artwork. Boards publish no per-match image, so there is
     nothing to crop into a 21:9 band — which is why the sports hero fell back
     to a stock photo of the wrong match for so long. Rather than find a
     picture, the desktop slide IS the scoreboard: both crests, both scores,
     drawn by us. On a phone the card carries the two crests facing each other.

   - A telecast does have artwork — it is one of our own titles with a poster
     and a title logo — so it is shown exactly like a movie, with a live badge.
     Inventing a different treatment for it would make the same show look like
     two different products depending on the hour. */

const LIVE_CRICKET = "cricket";
const LIVE_SHOW    = "show";

/* The scoreboard cover. A composition, not an image: nothing to fetch, correct
   for any pair of teams, and it updates with the score. */
function CricketCover({ match, compact = false }) {
  const home = teamCrest(match.homeCode, match.homeFlagUrl);
  const away = teamCrest(match.awayCode, match.awayFlagUrl);

  const Side = ({ crest, code, score, overs }) => (
    <div className="flex flex-col items-center gap-2 min-w-0">
      <span className={`${compact ? "w-14 h-14" : "w-20 h-20 lg:w-24 lg:h-24"}
                        rounded-full bg-white/[0.06] ring-1 ring-white/15
                        flex items-center justify-center overflow-hidden shrink-0`}>
        {crest
          ? <img src={crest} alt="" className="w-full h-full object-contain p-2" />
          : <span className={`${compact ? "text-base" : "text-2xl"} font-black text-white`}>{code}</span>}
      </span>
      <span className={`${compact ? "text-[11px]" : "text-sm"} font-black uppercase tracking-widest text-gray-300`}>
        {code}
      </span>
      {score && (
        <span className={`${compact ? "text-lg" : "text-3xl lg:text-4xl"} font-black text-white leading-none whitespace-nowrap`}>
          {score}
          {overs && <span className={`${compact ? "text-[10px]" : "text-sm"} font-bold text-gray-400 ml-1.5`}>({overs})</span>}
        </span>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex items-center justify-center gap-6 sm:gap-12 lg:gap-16 px-4">
      <Side crest={home} code={match.homeCode} score={match.homeScore} overs={match.homeOvers} />
      <span className={`${compact ? "text-[10px]" : "text-xs"} font-black uppercase tracking-[0.3em] text-gray-500 shrink-0`}>
        v
      </span>
      <Side crest={away} code={match.awayCode} score={match.awayScore} />
    </div>
  );
}

function LivePill({ label = "Live now" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]
                     text-white bg-red-600 px-3 py-1.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none" />
      {label}
    </span>
  );
}

const HERO_COUNT = 5;
const HERO_MS = 6000;

/* ── Mobile hero: a swipe deck ───────────────────────────────────────────────
   The phone hero used to be the desktop hero with a different crop — one slide
   filling the frame, advancing on a timer. Nothing about it said there were
   four more titles behind it, so most visitors saw one release and scrolled
   past. A deck says it in the layout: the next card is already on screen at
   the right edge, so the gesture is obvious before any hint appears, and the
   deck is driven by that gesture rather than by a clock that moves the page
   under someone mid-read.

   It bleeds past the page gutter deliberately — a card that stops short of the
   edge reads as a widget on the page, one that runs off it reads as something
   you can pull. */
function MobileHeroDeck({ slides, art, extra = {}, heroSlug, onOpen }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  /* Set while a finger is down, and for a moment after the flick settles.
     Auto-advance is suspended throughout: nothing is more irritating than a
     carousel that yanks itself along while you are reading a card. */
  const heldRef = useRef(false);
  const releaseRef = useRef(0);

  /* Which card is under the viewport's centre. Derived from scrollLeft rather
     than from an IntersectionObserver per card: one listener, and it stays
     correct mid-flick instead of only at rest. */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const card = el.firstElementChild;
      if (!card) return;
      const step = card.getBoundingClientRect().width + 12;   // card + gap-3
      setActive(Math.min(slides.length - 1, Math.max(0, Math.round(el.scrollLeft / step))));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [slides.length]);

  /* Advance every four seconds, wrapping at the end.

     It scrolls the track rather than moving an index, because the deck's
     position is the scroll position — the dots read from it, and a swipe and a
     tick have to leave it in the same state or the two fight each other. */
  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const el = trackRef.current;
    if (!el) return;

    const hold = () => { heldRef.current = true; clearTimeout(releaseRef.current); };
    // A flick keeps scrolling after the finger lifts; let it land before
    // taking the wheel back.
    const release = () => {
      clearTimeout(releaseRef.current);
      releaseRef.current = setTimeout(() => { heldRef.current = false; }, 2500);
    };
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("touchend", release, { passive: true });
    el.addEventListener("touchcancel", release, { passive: true });

    const tick = setInterval(() => {
      if (heldRef.current || document.hidden) return;
      const card = el.firstElementChild;
      if (!card) return;
      const step = card.getBoundingClientRect().width + 12;
      const next = Math.round(el.scrollLeft / step) + 1;
      el.scrollTo({
        left: next >= slides.length ? 0 : next * step,
        behavior: "smooth",
      });
    }, 4000);

    return () => {
      clearInterval(tick);
      clearTimeout(releaseRef.current);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchend", release);
      el.removeEventListener("touchcancel", release);
    };
  }, [slides.length]);

  return (
    <div className="sm:hidden -mx-4">
      <div ref={trackRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
        aria-roledescription="carousel" aria-label="Newest releases">
        {slides.map((movie, n) => {
          const a = art[heroSlug(movie)] || {};
          const isCricketSlide = movie.liveKind === LIVE_CRICKET;
          const isLiveSlide    = !!movie.liveKind;
          // A telecast carries its own artwork on the slide, since watch_html
          // is read once for it rather than through the shared art map.
          const src = movie.poster || a.poster || movie.poster_url || a.cover_poster || movie.cover_poster;
          const logo = movie.title_logo || a.title_logo || null;
          // Same strip the desktop band shows, from the same helper.
          const meta = heroMeta(movie, a, extra[heroSlug(movie)] || {});

          return (
            <article key={movie.id || movie.slug}
              className="snap-start shrink-0 w-[86%] first:ml-0 last:mr-4 relative rounded-2xl overflow-hidden
                         bg-gray-900 ring-1 ring-white/10">
              <button type="button" onClick={() => onOpen(movie)}
                aria-label={`${movie.title} — open details`}
                className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <span className="block aspect-[3/4] relative">
                  {isCricketSlide ? (
                    /* Both sides facing each other, with the live score. There
                       is no poster for a match, and a card carrying one team's
                       flag would be telling half the story. */
                    <span className="absolute inset-0 flex items-center justify-center
                                     bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,rgba(37,99,235,0.22),transparent_70%)]">
                      <CricketCover match={movie.match} compact />
                    </span>
                  ) : src ? (
                    <img src={src} alt="" aria-hidden="true"
                      fetchPriority={n === 0 ? "high" : "auto"}
                      loading={n === 0 ? "eager" : "lazy"} decoding="async"
                      className="absolute inset-0 w-full h-full object-cover object-top" />
                  ) : null}

                  {isLiveSlide && (
                    <span className="absolute top-4 left-4 z-10">
                      <LivePill />
                    </span>
                  )}
                  {/* Deep enough to carry a title logo and a metadata line, and
                      kept clear of the artwork's top two thirds. */}
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent" />

                  <span className="absolute inset-x-0 bottom-0 p-4 pr-24 flex flex-col items-start gap-2">
                    {logo
                      ? <img src={logo} alt={movie.title} className="h-14 w-auto max-w-[85%] object-contain object-left drop-shadow-2xl" />
                      : <span className="block text-3xl font-black text-white uppercase italic tracking-tighter leading-[0.95] line-clamp-2">
                          {String(movie.title).split("(")[0].trim()}
                        </span>}
                    {meta.length > 0 && (
                      <span className="flex flex-wrap items-center gap-x-2 text-[12px] font-bold text-gray-300">
                        {meta.map((bit, k) => (
                          <React.Fragment key={bit}>
                            {k > 0 && <span className="text-gray-500" aria-hidden="true">•</span>}
                            <span>{bit}</span>
                          </React.Fragment>
                        ))}
                      </span>
                    )}
                  </span>
                </span>
              </button>

              {/* Stacked at the trailing edge, clear of the title. Download sits
                  where a watchlist "+" would on other apps — on this site the
                  second thing anyone wants beside Play is the file. */}
              <div className="absolute right-4 bottom-4 flex flex-col items-center gap-3">
                {!isCricketSlide && (
                <Link to={`/search-torrent?q=${encodeURIComponent(movie.title || "")}`}
                  aria-label={`Download links for ${movie.title}`}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white
                             flex items-center justify-center active:scale-95 transition-transform">
                  <Download className="w-5 h-5" aria-hidden="true" />
                </Link>
                )}
                <button type="button" onClick={() => onOpen(movie)}
                  aria-label={`Play ${movie.title}`}
                  className="w-14 h-14 rounded-full bg-white text-black shadow-xl
                             flex items-center justify-center active:scale-95 transition-transform">
                  <Play className="w-6 h-6 fill-current ml-0.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3" aria-hidden="true">
          {slides.map((m, n) => (
            <span key={m.id || m.slug}
              className={`h-1 rounded-full transition-all duration-300 ${
                n === active ? "w-5 bg-white" : "w-1.5 bg-white/30"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroSpotlight({ movies = [], onOpen }) {
  const [art, setArt] = useState({});      // slug → { cover_poster, poster, title_logo }
  const { backendUrl } = useContext(AppContext);
  const [extra, setExtra] = useState({});  // slug → tmdb-details (year, cert, seasons)
  const [ratio, setRatio] = useState({});  // src → width/height
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  /* Pausing on hover belongs to the copy and the indicators, not to the whole
     hero. It used to sit on the <section>, which was fine while the hero was a
     small inset card — but the hero is now full-bleed, ~74dvh and pinned, so
     the pointer is inside it almost all the time. The carousel was therefore
     paused permanently: it never advanced, and the indicator never filled. */
  const pauseOnHover = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
  };
  const shellRef = useRef(null);

  /* Live cricket, and whichever telecast is on air. Both already had a feed on
     this page; the hero simply never asked for them. */
  const { matches: liveMatches } = useLiveSports();
  const clock = useLiveClock();
  const [showRow, setShowRow] = useState(null);

  const onAirShow = useMemo(() => {
    for (const show of Object.values(LIVE_SHOWS)) {
      if (liveStatus(show, clock).live) return show;
    }
    return null;
  }, [clock]);

  /* The telecast's own artwork, so the hero cannot show something different
     from the rest of the site for the same title. */
  useEffect(() => {
    const slug = onAirShow?.slug;
    if (!slug) { setShowRow(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.from("watch_html")
        .select("slug,title,poster,cover_poster,title_logo,episodes,content_type")
        .eq("slug", slug).limit(1);
      if (alive) setShowRow(data?.[0] || null);
    })();
    return () => { alive = false; };
  }, [onAirShow?.slug]);

  /* Live first, then the newest uploads. A match in progress outranks anything
     published today, and stops being a slide the moment it is over. */
  const slides = useMemo(() => {
    const live = [];

    if (onAirShow) {
      live.push({
        liveKind: LIVE_SHOW,
        id: `live-show-${onAirShow.slug}`,
        slug: onAirShow.slug,
        show: onAirShow,
        // Shaped like a movie, because for display purposes it is one.
        title: showRow?.title || onAirShow.name,
        poster: showRow?.poster || null,
        cover_poster: showRow?.cover_poster || null,
        title_logo: showRow?.title_logo || null,
        language: [onAirShow.language],
        watchUrl: `/watch/${onAirShow.slug}`,
      });
    }

    for (const m of liveMatches.slice(0, 2)) {
      live.push({
        liveKind: LIVE_CRICKET,
        id: `live-match-${m.id}`,
        match: m,
        /* "AFG vs India 2026" — the way a live fixture is named, rather than
           a pair of codes. Built from the feed's own team names and date. */
        title: [
          `${m.homeCode} vs ${m.awayName || m.awayCode}`,
          m.year,
        ].filter(Boolean).join(" "),
        language: [],
      });
    }

    return [...live, ...movies].slice(0, HERO_COUNT + live.length);
  }, [liveMatches, onAirShow, showRow, movies]);

  /* One query for all five, not one per slide.

     The two tables do not share a slug: movies.slug is the long release slug
     ("magudam-2026-telugu-true-web-dl-4k-1080p-…") while watch_html.slug is
     the short one ("magudam"). Matching on movies.slug found nothing, so every
     slide fell back to the portrait poster and no title logo ever appeared.
     watchUrl carries the watch_html slug, so read it from there. */
  const heroSlug = (m) => {
    const u = m?.watchUrl || "";
    const hit = u.match(/\/watch\/([^/?#]+)/);
    return hit ? decodeURIComponent(hit[1]) : (m?.watch_slug || m?.slug || null);
  };


  /* Year and certification for the five slides. Five small calls against an
     endpoint the detail view already hits for the same titles, fired once the
     artwork rows have landed because that is where the tmdb ids live. Best
     effort throughout: a slide with no id, or a call that fails, simply keeps
     the shorter metadata line rather than blocking the hero. */
  useEffect(() => {
    if (!backendUrl || !slides.length) return;
    let alive = true;
    (async () => {
      const rows = await Promise.all(slides.map(async (m) => {
        const key = heroSlug(m);
        const id = (art[key] || {}).tmdb_id;
        if (!key || !id || extra[key]) return null;
        try {
          const r = await fetch(`${backendUrl}/api/tmdb-details?tmdbId=${encodeURIComponent(id)}`);
          if (!r.ok) return null;
          const j = await r.json();
          return [key, j?.data || j || {}];
        } catch { return null; }
      }));
      const found = rows.filter(Boolean);
      if (alive && found.length) setExtra((p) => ({ ...p, ...Object.fromEntries(found) }));
    })();
    return () => { alive = false; };
    // `extra` is read to skip slides already resolved, not to re-run on itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, art, backendUrl]);

  useEffect(() => {
    const slugs = [...new Set(slides.map(heroSlug).filter(Boolean))];
    if (!slugs.length) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from("watch_html")
        .select("slug,cover_poster,poster,title_logo,episodes,content_type,tmdb_id,genres").in("slug", slugs);
      if (alive && data) setArt(Object.fromEntries(data.map((r) => [r.slug, r])));
    })();
    return () => { alive = false; };
  }, [slides]);

  /* Auto-advance and the progress bar, off one clock.

     They used to be two: a setInterval that moved the slide, and a CSS
     animation that filled the bar. The interval was keyed on [slides.length,
     paused] — not on the slide — so it was never restarted when the slide
     changed, while the bar restarted every time. Click a dot to jump, or let
     a cycle complete, and the two were out of phase from then on: the bar
     would reach the end and sit there, apparently stuck, waiting on an
     interval that fired at some unrelated moment.

     One rAF loop now measures the elapsed time, paints the bar, and advances
     the slide at the moment the bar completes, so the bar cannot disagree with
     the carousel. Elapsed time lives in a ref and the width is written
     straight to the node: a state update per frame would re-render five slides
     of artwork sixty times a second to move a 3px bar. */
  const fillRefs = useRef([]);
  const elapsedRef = useRef(0);
  const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // A new slide starts its bar from empty.
  useEffect(() => { elapsedRef.current = 0; }, [i]);

  useEffect(() => {
    const paint = (n, p) => {
      const el = fillRefs.current[n];
      if (el) el.style.transform = `scaleX(${p})`;
    };
    // Every bar but the current one is empty.
    fillRefs.current.forEach((el, n) => { if (n !== i) paint(n, 0); });

    if (slides.length < 2) return;
    // Reduced motion: no crawl, no auto-advance — just mark where you are.
    if (reducedMotion()) { paint(i, 1); return; }
    if (paused) return;

    let raf = 0;
    let last = performance.now();
    const step = (now) => {
      elapsedRef.current += now - last;
      last = now;
      const p = Math.min(1, elapsedRef.current / HERO_MS);
      paint(i, p);
      if (p >= 1) { setI((n) => (n + 1) % slides.length); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [i, slides.length, paused]);

  useEffect(() => { setI(0); }, [slides.length]);

  /* Not every title has landscape art. Forcing a 2:3 poster into a 21:9 hero
     crops it to an unrecognisable detail — a face, a shoulder — which is what
     was happening to anything without a cover_poster. Measure the image and
     lay the slide out to suit it: wide art fills the frame, a portrait poster
     is shown at its own shape as a card against a blurred wash of itself. */
  useEffect(() => {
    slides.forEach((m) => {
      const a = art[heroSlug(m)] || {};
      const src = a.cover_poster || a.poster || m.poster || m.poster_url;
      if (!src || ratio[src] != null) return;
      const img = new Image();
      img.onload = () => setRatio((r) => (r[src] != null ? r
        : { ...r, [src]: img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0 }));
      img.onerror = () => setRatio((r) => ({ ...r, [src]: 0 }));
      img.src = src;
    });
  }, [slides, art, ratio]);

  /* Scroll-linked parallax, the way the big streaming apps do it.

     The scroll position is published once, as a 0→1 custom property on the
     shell, and the layers inside read it at their own rate: the artwork holds
     still while the title logo, the metadata and the buttons rise up across it
     and fade out, so the copy travels over the poster instead of the whole
     hero sliding away as one slab. One listener, one write per frame, and the
     rates live in the markup next to the thing they move.

     Driven by transform and opacity only — animating those stays off the
     layout path, so the grid below never reflows while you scroll.

     Desktop only: on a phone the hero is most of the screen and moving it
     while you scroll past it just makes the top of the page look broken. */
  const frameRef = useRef(0);
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    /* Published on the document element, not on the hero, because the
       catalogue band below is the hero's sibling and CSS variables inherit
       down rather than across. The band needs this value to fade its own
       leading edge in as the hero starts to move. */
    const root = document.documentElement;
    const apply = () => {
      frameRef.current = 0;
      if (window.innerWidth < 640) {
        el.style.cssText = "";
        root.style.removeProperty("--hero-p");
        return;
      }
      const h = el.offsetHeight || 1;
      const p = Math.min(1, Math.max(0, window.scrollY / (h * 0.85)));
      root.style.setProperty("--hero-p", String(p));
      /* The artwork holds at full strength while the copy travels over it, then
         fades the last of the way out so there is no hard cut when it is taken
         out of rendering below. No blur: it lives on the same element as the
         copy, so blurring the poster would smear the title logo along with it. */
      el.style.opacity = String(Math.min(1, (1 - p) / 0.3));
      // Once it is gone it should stop catching clicks meant for the grid, and
      // stop being painted at all — it is pinned, so it never leaves the DOM.
      el.style.pointerEvents = p > 0.95 ? "none" : "";
      el.style.visibility = p > 0.99 ? "hidden" : "";
    };
    const onScroll = () => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      root.style.removeProperty("--hero-p");
    };
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    /* Sticky on desktop, and edge to edge. The hero used to be a rounded,
       bordered panel inside the page's gutter — a card about a film rather
       than the film itself. Full-bleed it reads as the backdrop of the page,
       and pinning it means the catalogue below travels up over it instead of
       pushing it off: the hero recedes, dims and scales back while the rows
       slide across it. The phone deck stays in normal flow, where a pinned
       hero would eat most of the screen. */
    <section
      className="relative w-full sm:sticky sm:top-0 sm:z-0
                 sm:-ml-[72px] sm:w-[calc(100%+72px)]"
      /* Focus still pauses everywhere — it only ever lands on the buttons or
         the indicators. Hover does not: see pauseOnHover below. */
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Phone and desktop are two different objects here, not one layout with
          two crops: a swipe deck of cards versus a single wide crossfading
          band. Trying to serve both from one tree is what left the phone hero
          with no sign that four more titles sat behind it. */}
      <MobileHeroDeck slides={slides} art={art} extra={extra} heroSlug={heroSlug} onOpen={onOpen} />

      <div ref={shellRef}
        className="hidden sm:block relative h-[74dvh] min-h-[460px] max-h-[780px] will-change-transform origin-top
                   overflow-hidden"
        aria-roledescription="carousel" aria-label="Newest releases">
        {slides.map((movie, n) => {
          const a = art[heroSlug(movie)] || {};
          /* cover_poster first: this is the wide band, and a 2:3 portrait
             stretched across it crops to an unrecognisable detail. The deck
             on phones leads with the portrait poster instead. */
          const desktopSrc = a.cover_poster || a.poster || movie.poster || movie.poster_url;
          const logo = a.title_logo || null;
          const isLiveSlide    = !!movie.liveKind;
          const isCricketSlide = movie.liveKind === LIVE_CRICKET;
          const x = extra[heroSlug(movie)] || {};
          const meta = heroMeta(movie, a, x);
          // Our own copy first, TMDB's only when we have none of our own.
          const blurb = isCricketSlide
            ? [movie.match.status, movie.match.venue].filter(Boolean).join(" · ")
            : shortDescription(movie.description || x.description);
          // watch_html's genres are the curated ones; TMDB's are the fallback.
          const genres = isCricketSlide
            ? [movie.match.series].filter(Boolean)
            : (a.genres || movie.categories || x.genres || []).filter(Boolean);
          const active = n === i;
          /* Not every title has landscape art. Where it doesn't, the desktop
             slide shows the poster at its own shape as a card rather than
             cropping it to an unrecognisable detail. 1.2 rather than 1.0
             because a squarish image crops badly too. */
          const r = desktopSrc ? ratio[desktopSrc] : null;
          const deskWide = r != null && r >= 1.2;

          const rise = active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0";

          const copy = (
            <div className={`flex flex-col items-center sm:items-start text-center sm:text-left gap-3 sm:gap-4 min-w-0
                             transition-all duration-700 ease-out motion-reduce:transition-none ${rise}`}>
              {isLiveSlide ? (
                <LivePill />
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]
                                 text-amber-300 bg-amber-400/10 border border-amber-400/25 px-3 py-1.5 rounded-full">
                  <Flame className="w-3 h-3" aria-hidden="true" /> Newest release
                </span>
              )}

              {logo
                ? <img src={logo} alt={movie.title}
                    className="h-10 sm:h-16 lg:h-20 2xl:h-24 w-auto max-w-full object-contain drop-shadow-2xl" />
                : <h1 className="text-xl sm:text-3xl lg:text-5xl 2xl:text-6xl font-black text-white uppercase italic tracking-tighter max-w-4xl leading-[1.05]">
                    {String(movie.title).split("(")[0].trim()}
                  </h1>}

              {/* Year · certification · seasons · languages. One dot-separated
                  line rather than the old mix of a star, an uppercase label and
                  a row of language pills — three visual treatments for what is
                  really one strip of facts. Anything the title does not have
                  simply drops out, dots and all. */}
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-2.5 gap-y-1 text-[13px] font-bold text-gray-200">
                {movie.imdb && (
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> {movie.imdb}
                  </span>
                )}
                {meta.map((bit, k) => (
                  <React.Fragment key={bit}>
                    {(k > 0 || movie.imdb) && <span className="text-gray-500" aria-hidden="true">•</span>}
                    <span>{bit}</span>
                  </React.Fragment>
                ))}
              </div>

              {blurb && (
                <p className="text-[13px] sm:text-sm text-gray-300 leading-relaxed max-w-xl line-clamp-3 drop-shadow">
                  {blurb}
                </p>
              )}

              {genres.length > 0 && (
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                  {genres.slice(0, 4).map((g) => (
                    <span key={g} className="px-2.5 py-1 rounded-md bg-white/10 text-gray-200 border border-white/10">{g}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2.5">
                {isCricketSlide ? (
                  /* A match has no file to download and nothing to open in the
                     detail sheet — it has a scorecard. */
                  <Link to={`/match-center/${movie.match.hash}`} tabIndex={active ? 0 : -1}
                    className="inline-flex items-center gap-2 bg-white text-black px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl font-black text-sm
                               hover:bg-gray-200 active:scale-[0.97] transition-all duration-200
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                    <Play className="w-4 h-4 fill-current" aria-hidden="true" /> Watch live
                  </Link>
                ) : (
                <>
                <button type="button" onClick={() => onOpen(movie)} tabIndex={active ? 0 : -1}
                  className="inline-flex items-center gap-2 bg-white text-black px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl font-black text-sm
                             hover:bg-gray-200 active:scale-[0.97] transition-all duration-200
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950">
                  <Play className="w-4 h-4 fill-current" aria-hidden="true" /> Watch now
                </button>
                <Link to={`/search-torrent?q=${encodeURIComponent(movie.title || "")}`}
                  tabIndex={active ? 0 : -1}
                  aria-label={`Download links for ${movie.title}`}
                  title="Download links"
                  className="inline-flex items-center justify-center w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-xl
                             bg-white/10 backdrop-blur-md text-white border border-white/20
                             hover:bg-white/20 active:scale-[0.97] transition-all duration-200
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950">
                  <Download className="w-5 h-5" aria-hidden="true" />
                </Link>
                </>
                )}
              </div>
            </div>
          );

          const scrims = (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 via-gray-950/15 to-transparent" />
            </>
          );

          return (
            <div key={movie.id || movie.slug}
              className={`absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none
                          ${active ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              aria-hidden={!active}
              role="group"
              aria-roledescription="slide"
              aria-label={`${n + 1} of ${slides.length}`}
            >
              {/* ── Desktop: the wide cover art, or the poster as a card when
                     there is no wide art for this title ── */}
              <div className="absolute inset-0 hidden sm:block">
                {isCricketSlide ? (
                  /* Our own cover. Boards publish no per-match image, so there
                     is nothing to crop here — the scoreboard is the artwork,
                     sitting to the right of the copy. */
                  <>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_70%_40%,rgba(37,99,235,0.18),transparent_70%)]" />
                    <div className="absolute inset-y-0 right-0 w-[52%] flex items-center justify-center pb-10">
                      <CricketCover match={movie.match} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/70 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-gray-950 to-transparent" />
                  </>
                ) : null}
                {!isCricketSlide && desktopSrc && (
                  <img src={desktopSrc} alt="" aria-hidden="true"
                    fetchPriority={n === 0 ? "high" : "auto"} decoding="async"
                    loading={n === 0 ? "eager" : "lazy"}
                    className={`absolute inset-0 w-full h-full object-cover object-center
                                ${deskWide ? "" : "blur-3xl scale-125 opacity-70 saturate-150"}`} />
                )}
                {isCricketSlide ? null : deskWide ? scrims : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-950/60 via-gray-950/30 to-gray-950/60" />
                    {/* Bottom scrim for the blurred-wash layout too. The wide
                        art already fades to gray-950 at its foot; without the
                        same here, the full-bleed hero met the catalogue on a
                        hard edge. */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-gray-950 to-transparent" />
                  </>
                )}

                {(deskWide || isCricketSlide) ? (
                  <div className="absolute inset-x-0 bottom-0 p-8 lg:p-10 2xl:p-14 pb-16 sm:ml-[72px]"
                    style={heroCopyParallax} {...pauseOnHover}>{copy}</div>
                ) : (
                  <div className="absolute inset-0 flex flex-row items-center justify-start
                                  gap-8 lg:gap-12 px-8 lg:px-10 2xl:px-14 pb-12 sm:ml-[72px]"
                    style={heroCopyParallax} {...pauseOnHover}>
                    {desktopSrc && (
                      <img src={desktopSrc} alt=""
                        className={`h-[70%] max-h-[400px] w-auto aspect-[2/3] object-cover shrink-0
                                    rounded-2xl ring-1 ring-white/15 shadow-2xl shadow-black/70
                                    transition-all duration-700 ease-out motion-reduce:transition-none ${rise}`} />
                    )}
                    {copy}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Progress bars double as the control: which of five you are on, how
            far through, and a way to jump. Each is 44px of tap target with a
            slim visible bar inside it. */}
        {slides.length > 1 && (
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-end gap-2 px-5 sm:px-8 lg:px-10 2xl:px-14 pb-6" {...pauseOnHover}>
            {slides.map((m, n) => (
              <button key={m.id || m.slug} type="button"
                onClick={() => setI(n)}
                aria-label={`Show ${m.title}`}
                aria-current={n === i}
                className="group/dot w-10 sm:w-12 shrink-0 h-11 flex items-center cursor-pointer
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded">
                <span className="block w-full h-[3px] rounded-full bg-white/25 overflow-hidden">
                  <span ref={(el) => { fillRefs.current[n] = el; }}
                    className="block h-full w-full rounded-full bg-white origin-left"
                    style={{ transform: "scaleX(0)" }} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Skeletons ───────────────────────────────────────────────────────────────
   The grid and the stories rail used to render nothing at all until their
   data landed, so the page arrived as an empty dark screen and then jumped a
   full viewport when the posters appeared. These hold the exact shape of what
   is coming, which both explains the wait and keeps the layout still. */
function PosterSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02]">
      <div className="aspect-[2/3] w-full shimmer" />
      <div className="p-3 flex justify-center">
        <div className="h-3 w-2/3 rounded-full shimmer" />
      </div>
    </div>
  );
}

function StorySkeleton() {
  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-2">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shimmer" />
      <div className="h-2.5 w-12 rounded-full shimmer" />
    </div>
  );
}

/* Reading localStorage can throw outright in a private window or with site
   data blocked, and it was being parsed once per card inside the render loop.
   Read it once, defensively. */
function readViewedStories() {
  try {
    const raw = JSON.parse(localStorage.getItem("viewedStories") || "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch { return new Set(); }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const Header = () => {
  const { userData, movies = [] } = useContext(AppContext);
  const [copied, setCopied] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [activeStory, setActiveStory] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [progress, setProgress] = useState(0);

  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showMemberPopup, setShowMemberPopup] = useState(false);
  const [showBettingPopup, setShowBettingPopup] = useState(false);

  const [sheetMovie, setSheetMovie] = useState(null);   // the title whose details are open
  const [isMuted, setIsMuted] = useState(true);         // desktop overlay's trailer

  /* Which detail surface to open. The hero handed every click to the mobile
     sheet regardless of viewport, so clicking "Watch now" on a desktop got a
     phone layout stretched across the window — a full-width button and a
     trailer the height of the screen. Tracked as state off matchMedia rather
     than read from innerWidth at click time, so the surface that opens and the
     one that renders can never disagree. */
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const movieGridRef = useRef(null);
  const navigate = useNavigate();

  const adminEmail = "sanjusanjay0444@gmail.com";
  const isAdmin = (userData?.email?.toLowerCase() === adminEmail) || (currentUserEmail?.toLowerCase() === adminEmail);
  /* The share button was copying 1anchormovies.live — a domain that no longer
     resolves — so every link a visitor shared was dead on arrival. */
  const siteUrl = SITE_ORIGIN;

  const latestMovies = useMemo(() => {
    return [...movies]
      .filter(m => m.showOnHomepage)
      .sort((a,b) => new Date(b.homepage_added_at||b.created_at||0) - new Date(a.homepage_added_at||a.created_at||0))
      .slice(0, 100);
  }, [movies]);

  const heroSlides = useMemo(() => latestMovies.slice(0, 5), [latestMovies]);
  /* The grid skips whatever the hero is already showing, so the top of the
     page never repeats itself. */
  const gridMovies = useMemo(() => {
    const shown = new Set(heroSlides.map((m) => m.id));
    return latestMovies.filter((m) => !shown.has(m.id));
  }, [latestMovies, heroSlides]);

  // Pool for "More Like This" — the sheet scores it on shared genres (ours and
  // TMDB's) and tops it up with TMDB's own recommendations.
  const sheetRelated = useMemo(() => (sheetMovie ? movies : []), [sheetMovie, movies]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUserEmail(session.user.email);
    });
  }, []);

  // Open the mobile sheet, then enrich it from watch_html (matched by slug, then
  // title) — that table holds the title logo, backdrop and trailer for our uploads,
  // which the plain movies row is missing.
  const openMobileSheet = async (movie) => {
    /* A live match is not a title: it has no detail sheet, no episodes and no
       file. Both the desktop button and the phone card land here, so the
       redirect belongs here rather than at each call site. */
    if (movie?.liveKind === LIVE_CRICKET) {
      navigate(`/match-center/${movie.match.hash}`);
      return;
    }
    setSheetMovie(movie);   // show immediately with what we already have
    try {
      let { data } = await supabase.from("watch_html").select("*").eq("slug", movie.slug).limit(1);
      if ((!data || !data.length) && movie.title) {
        ({ data } = await supabase.from("watch_html").select("*").ilike("title", movie.title).limit(1));
      }
      const w = data && data[0];
      if (!w) return;
      const localEps = Array.isArray(w.episodes) ? w.episodes : [];
      setSheetMovie(prev => (prev && prev.slug === movie.slug) ? {
        ...prev,
        title_logo:   prev.title_logo  || w.title_logo || "",
        trailer_key:  prev.trailer_key || w.trailer_codes || null,   // watch_html stores the key in trailer_codes
        cover_poster: w.cover_poster || prev.cover_poster || prev.poster,
        poster:       prev.poster || w.poster,
        tmdb_id:      prev.tmdb_id || w.tmdb_id,
        imdb_id:      prev.imdb_id || w.imdb_id || null,
        // Episodes present means it's a series, whatever the row says.
        content_type: localEps.length ? "tv" : (prev.content_type || w.content_type),
        episodes:     localEps,
        // Our own streams — carried through so the watch page offers AnchorHD
        // and Multi Audio for a title we host, not just the third-party servers.
        html_code:    prev.html_code || w.html_code || null,
        hls_url:      prev.hls_url   || w.hls_url   || null,
        video_url:    prev.video_url || w.video_url || null,
        // The sheet plays through our own player whenever we have an upload row.
        has_watch_html: true,
        watch_slug:   w.slug || prev.slug,
      } : prev);
    } catch { /* enrichment is best-effort */ }
  };

  const handleCardClick = (movie, event) => {
    event.stopPropagation();
    event.preventDefault();
    openMobileSheet(movie);
  };

  /* The desktop overlay plays through its host rather than navigating itself,
     so the home page has to supply the same route the mobile sheet builds for
     itself: our own watch page when the title is resolvable, and the
     admin-supplied embed only when it is not. */
  const playFromDetail = (movie, opts = {}) => {
    const { autoPlay: _a, episode, ...intent } = opts;
    const canPlayInternally = !!(movie.tmdb_id || movie.imdb_id || movie.has_watch_html);
    if (!canPlayInternally && movie.watchUrl) {
      window.location.href = ownUrl(movie.watchUrl);
      return;
    }
    navigate(`/watch/${movie.watch_slug || movie.slug}`, {
      state: { autoPlay: true, autoPlayEpisode: episode || null, ...intent },
    });
    setSheetMovie(null);
  };

  useEffect(() => {
    supabase.from("stories").select("*")
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data, error }) => { if (!error) setStories(data || []); })
      .then(() => setStoriesLoading(false), () => setStoriesLoading(false));
  }, []);

  // One read per render pass, not one per card.
  const viewedStories = useMemo(() => readViewedStories(), [stories]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error(err); }
  };

  const formatTimeAgo = (timestamp) => {
    const diff = new Date() - new Date(timestamp);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleShareComplete = () => {
    setShowSharePopup(false);
    localStorage.setItem("hasJoinedTelegram", "true");
  };

  /* The page gutter, applied per band rather than once on the shell — the hero
     has to reach both edges, so it cannot sit inside a padded parent. */
  const GUTTER = "px-4 sm:px-6 lg:px-8 2xl:px-12";

  return (
    <div className="w-full bg-gray-950 min-h-dvh">

      {/* ── ON-AIR TELECAST ─────────────────────────────────────────────── */}
      <div className={`flex flex-col items-center ${GUTTER}`}>
        <LiveShowBanner />
      </div>

      {/* ── HERO SPOTLIGHT — full bleed, pinned behind everything below ─── */}
      <HeroSpotlight movies={heroSlides} onOpen={openMobileSheet} />

      {/* Everything from here rides over the pinned hero — z-10 against the
          hero's z-0, so as the page scrolls the catalogue travels across it.

          It starts exactly at the hero's bottom edge and not a pixel higher.
          An earlier version pulled this band up 96px for a soft cross-fade,
          which looked right and broke the hero: a div hit-tests over its whole
          box whether or not anything is painted there, so that strip sat on
          top of Watch now, Download and the five progress bars and swallowed
          every click. The hero's own bottom scrim already fades to gray-950,
          so the seam needs no help. */}
      <div className="relative z-10">
        {/* The band's leading edge, softened. Pinned behind the hero, this band
            slides up across the artwork as you scroll and its top was cutting
            a hard horizontal line through the picture.

            Absolutely positioned and pointer-events-none, so unlike the earlier
            negative-margin version it paints over the hero without taking its
            clicks. Its opacity rides --hero-p: at rest there is no fade at all,
            which keeps the hero's own buttons and progress bars at full
            strength, and it ramps in (x3, so it is fully on early) the moment
            the page starts to move and the edge would otherwise show. */}
        <div aria-hidden="true"
          className="hidden sm:block absolute inset-x-0 -top-28 h-28 pointer-events-none
                     sm:-ml-[72px] bg-gradient-to-b from-transparent to-gray-950"
          style={{ opacity: "calc(var(--hero-p, 0) * 3)" }} />

        {/* The ground runs the full width of the window while the content on it
            stays clear of the rail. Without the break-out the band covered only
            the padded area, and since the hero now passes under the rail, a
            72px ribbon of artwork stayed visible down the left of the
            catalogue as the page scrolled. Pull the box left, push the padding
            back: same content position, wider background. */}
        <div className="bg-gray-950 sm:-ml-[72px] sm:pl-[72px]">
          <div className={`flex flex-col items-center ${GUTTER}`}>

      {/* The "Live Now" strip that used to sit here is gone: the hero leads
          with the same matches, and repeating them twenty pixels below it said
          the same thing twice. */}

      {/* ── STORIES ─────────────────────────────────────────────────────── */}
      {(storiesLoading || stories.length > 0) && (
        <div className="w-full max-w-[1800px] mt-6">
          <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 border border-white/[0.06]">
            <h2 className="text-xs font-black text-gray-300 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" /> Featured Stories
            </h2>
            <ScrollRow className="py-1" label="Featured stories">
              {storiesLoading
                ? Array.from({ length: 6 }, (_, i) => <StorySkeleton key={i} />)
                : stories.map((story, idx) => (
                  <button key={story.id} type="button"
                    onClick={() => { setActiveStory(story); setActiveStoryIndex(idx); }}
                    aria-label={`Open story: ${story.title || "untitled"}`}
                    className="flex-shrink-0 flex flex-col items-center group cursor-pointer rounded-xl
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950">
                    <span className={`block w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none ${
                      viewedStories.has(story.id)
                        ? "bg-white/15" : "bg-gradient-to-tr from-blue-500 to-cyan-400"
                    }`}>
                      <span className="block bg-gray-950 rounded-full w-full h-full p-1 overflow-hidden">
                        <img src={story.poster_url} loading="lazy"
                          className="w-full h-full object-cover rounded-full"
                          alt={story.title ? `${story.title} poster` : ""} />
                      </span>
                    </span>
                    <span className="text-[11px] text-gray-300 mt-2 truncate w-16 text-center">{story.title}</span>
                  </button>
                ))}
            </ScrollRow>
          </div>
        </div>
      )}

      {/* ── CATALOGUE ───────────────────────────────────────────────────── */}
      {/* The catalogue no longer announces itself. "Fresh Releases", the
          language chips and the invite button were a heading, a filter bar and
          a button-only row standing between the hero and the posters — three
          bands of chrome before any artwork, and once the first two went the
          third was left holding an empty row on its own. The posters are the
          page, so they start immediately under the hero; language is still
          browsable from the rail, and inviting moved to the footer. */}
      <section className="w-full max-w-[1800px] mt-6 mb-10 sm:mb-12">

        {/* Admin panel */}
        {isAdmin && (
          <div className="w-full p-4 mb-6 bg-red-950/20 border border-red-500/30 rounded-2xl text-center space-y-3">
            <Link to="/admin" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-red-400 hover:text-red-300 font-black uppercase italic tracking-tighter transition-colors">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping motion-reduce:animate-none" aria-hidden="true" />
              Access secure admin panel
            </Link>
            <a href="https://upload.1anchormovies.buzz" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-cyan-400 hover:text-cyan-300 font-black uppercase italic tracking-tighter transition-colors">
              <MonitorPlay className="w-4 h-4" aria-hidden="true" /> R2 movie uploader
            </a>
          </div>
        )}

        {/* Poster grid. Cards are buttons — they were divs with onClick and
            entirely unreachable by keyboard — and the title now sits on the
            artwork under a scrim instead of in a separate strip below it, so
            a row of cards reads as one band of artwork rather than as
            alternating bars of poster and grey. */}
        <div ref={movieGridRef} className={POSTER_GRID}>
          {movies.length === 0
            ? Array.from({ length: 12 }, (_, i) => <PosterSkeleton key={i} />)
            : gridMovies.map((movie, i) => (
              <article key={movie.id}
                className="group relative rounded-xl overflow-hidden bg-white/[0.03] ring-1 ring-white/[0.06]
                           transition-all duration-300 hover:ring-white/25 hover:-translate-y-1
                           focus-within:ring-blue-400 motion-reduce:transform-none
                           hover:shadow-2xl hover:shadow-black/60">
                <button type="button"
                  onClick={e => handleCardClick(movie, e)}
                  aria-label={`${movie.title} — open details`}
                  className="block w-full text-left cursor-pointer focus:outline-none">
                  <span className="block aspect-[2/3] relative overflow-hidden">
                    <img src={movie.poster || movie.poster_url || "/default-poster.jpg"} alt=""
                      loading={i < 6 ? "eager" : "lazy"}
                      fetchPriority={i < 6 ? "high" : "auto"}
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:transform-none" />

                    {/* Scrim carrying the title — always on, so the name is
                        readable without hovering. */}
                    <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/75 to-transparent" />

                    {movie.note && (
                      <span className="absolute top-2 left-2 text-[9px] font-black bg-red-600 text-white px-2 py-1 rounded-md uppercase tracking-wide">
                        {movie.note}
                      </span>
                    )}
                    {movie.imdb && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-black
                                       bg-black/70 backdrop-blur-md text-amber-300 px-2 py-1 rounded-md border border-white/10">
                        <Star className="w-2.5 h-2.5 fill-current" aria-hidden="true" />{movie.imdb}
                      </span>
                    )}

                    <span className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                      <span className="block text-[12px] sm:text-[13px] font-bold text-white leading-snug line-clamp-2"
                        style={{ color: movie.linkColor || "" }}>
                        {String(movie.title).split("(")[0].trim()}
                      </span>
                      <span className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-gray-300">
                        {movie.subCategory && <span className="uppercase tracking-wider">{movie.subCategory}</span>}
                        {movie.subCategory && <span className="text-gray-600" aria-hidden="true">·</span>}
                        <span>{formatTimeAgo(movie.homepage_added_at || movie.created_at)}</span>
                      </span>
                    </span>
                  </span>
                </button>

                {/* Actions rise out of the bottom edge on hover, and on keyboard
                    focus too — the old pair was reachable by mouse only. */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 flex gap-2 translate-y-full opacity-0 pointer-events-none
                                bg-gradient-to-t from-black via-black/90 to-transparent
                                transition-all duration-300 motion-reduce:transition-none
                                group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto
                                group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto
                                hidden sm:flex">
                  {movie.watchUrl && (
                    <a href={ownUrl(movie.watchUrl)}
                      className="flex-1 bg-white text-black text-[11px] font-black py-2.5 rounded-lg flex items-center justify-center gap-1.5
                                 hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      onClick={e => {
                        e.stopPropagation();
                      }}>
                      <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> Play
                    </a>
                  )}
                  <Link to={`/search-torrent?q=${encodeURIComponent(movie.title || "")}`}
                    aria-label={`Download links for ${movie.title}`}
                    title="Download links"
                    className="px-3 bg-white/15 backdrop-blur-md text-white border border-white/20 rounded-lg flex items-center justify-center
                               hover:bg-white/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    onClick={e => e.stopPropagation()}>
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
        </div>

        {/* Loaded, but this filter has nothing behind it. */}
        {movies.length > 0 && gridMovies.length === 0 && (
          <div className="py-20 text-center">
            <ImageOff className="w-10 h-10 text-gray-700 mx-auto mb-4" aria-hidden="true" />
            <p className="text-gray-300 font-black uppercase tracking-widest text-xs">
              Nothing here in the catalogue
            </p>
            <p className="text-gray-500 text-[11px] mt-2">New titles appear as soon as they are published.</p>
          </div>
        )}

        {/* Telegram banner — moved below the catalogue. It used to sit between
            the heading and the posters, so the first thing under "Fresh
            Releases" was an ad for a different platform. */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/30 to-cyan-900/20 rounded-2xl p-5 sm:p-6 border border-blue-500/15 mt-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <span className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                <FaTelegramPlane className="text-blue-500 text-2xl" aria-hidden="true" />
              </span>
              <div className="text-center sm:text-left">
                <h3 className="text-white font-bold text-base sm:text-lg">Never miss a release</h3>
                <p className="text-blue-200/70 text-sm mt-0.5">Join our channel for instant HD links.</p>
              </div>
            </div>
            <a href="https://t.me/anchor2025" target="_blank" rel="noopener noreferrer"
              className="bg-cyan-500 hover:bg-cyan-400 text-black px-7 py-3 rounded-2xl font-black text-sm tracking-widest
                         shadow-xl shadow-cyan-500/20 transition-colors flex items-center gap-2 shrink-0
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950">
              <Zap className="w-4 h-4 fill-current" aria-hidden="true" /> Join Telegram
            </a>
          </div>
        </div>
      </section>

          </div>
        </div>
      </div>
      {/* ── end of the band that rides over the hero ───────────────────── */}

      {/* ── DETAIL SURFACE — overlay on desktop, sheet on a phone ───────── */}
      {isDesktop ? (
        <DesktopDetailOverlay
          movie={sheetMovie}
          onClose={() => setSheetMovie(null)}
          onNavigate={playFromDetail}
          onSelectMovie={openMobileSheet}
          relatedMovies={sheetRelated}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
        />
      ) : (
        <MobileDetailSheet
          movie={sheetMovie}
          onClose={() => setSheetMovie(null)}
          relatedMovies={sheetRelated}
          onSelectMovie={openMobileSheet}
        />
      )}

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full py-12 text-center border-t border-gray-900 mt-12 bg-gray-950 sm:-ml-[72px] sm:pl-[72px]">
        <div className="flex flex-col items-center gap-4">
          <Link to="/"><img src="/logo_39.png" className="h-8 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-200" alt="AnchorMovies home"/></Link>
          <button onClick={handleCopy} type="button"
            className="inline-flex items-center gap-2 bg-white/[0.06] text-gray-200 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold
                       hover:bg-white/[0.12] hover:text-white transition-colors duration-200
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950">
            {copied ? "Link copied" : "Invite friends"} <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <p className="text-gray-600 text-[10px] tracking-[0.3em] font-bold uppercase">© AnchorMovies 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default Header;
