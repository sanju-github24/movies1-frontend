import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { absUrl, jsonLd } from "../utils/seo";
import {
  ArrowLeft, RefreshCw, Trophy, Star, AlertCircle,
  Tv2, Signal, Maximize2, PlayCircle
} from "lucide-react";
import { CRICKET_CHANNELS, FOOTBALL_CHANNELS } from "./channels";

const API_BASE      = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
const FIFA_API_BASE = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION = "17";
const FIFA_SEASON      = "285023";
const FIFA_STAGE       = "289273";

export function encodeMatchHash(payload) {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
export function decodeMatchHash(hash) {
  try {
    const b64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch { return null; }
}

/* ── Design tokens ── */
const ECB_NAVY  = "#001B4E";
const ECB_RED   = "#CF142B";

/* ── Team data ── */
const ICC_TEAM_COLORS = {
  ENG: { primary: "#003087", accent: "#CF142B", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  SL:  { primary: "#003087", accent: "#FF8000", flag: "🇱🇰" },
  AUS: { primary: "#00843D", accent: "#FFD700", flag: "🇦🇺" },
  SA:  { primary: "#007A4D", accent: "#FFB81C", flag: "🇿🇦" },
  IND: { primary: "#1a56db", accent: "#FF671F", flag: "🇮🇳" },
  AFG: { primary: "#003366", accent: "#D32011", flag: "🇦🇫" },
  PAK: { primary: "#01411C", accent: "#FFFFFF", flag: "🇵🇰" },
  NZ:  { primary: "#000000", accent: "#FFFFFF", flag: "🇳🇿" },
  WI:  { primary: "#7B1113", accent: "#FDB913", flag: "🏴" },
  SCO: { primary: "#003087", accent: "#FFD700", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  IRE: { primary: "#169B62", accent: "#FFFFFF", flag: "🇮🇪" },
  BAN: { primary: "#006A4E", accent: "#F42A41", flag: "🇧🇩" },
  NED: { primary: "#FF6600", accent: "#FFFFFF", flag: "🇳🇱" },
};
function getIccTeam(code) { return ICC_TEAM_COLORS[code] || { primary: "#1f2937", accent: "#fff", flag: "🏏" }; }
function getFifaFlagUrl(code) { return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`; }

const BCCI_FORMAT_LABEL = { "One Day D/N":"ODI","One Day":"ODI","T20":"T20I","Test":"Test","Test D/N":"Test" };
function bcciFmt(type) { return BCCI_FORMAT_LABEL[type] || type || "MATCH"; }
function bcciFmtDate(s) {
  try { return new Date(s).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"}); }
  catch { return s; }
}
function bcciSlugify(str) { return (str||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function bcciBuildScoreUrl(m) {
  return `https://scores2.bcci.tv/getMatchCenterDetails?competitionID=${m.CompetitionID}&seriesName=${bcciSlugify(m.CompetitionName)}&matchID=${m.MatchID}&matchOrder=${bcciSlugify(m.MatchOrder)}&SERIES_ID=${m.CompetitionID}&widgetType=international`;
}
function fifaTeamName(t) { return t?.TeamName?.find(x=>x.Locale==="en-GB")?.Description || t?.Abbreviation || ""; }
function fifaGroupName(m) { return m.GroupName?.find(x=>x.Locale==="en-GB")?.Description || ""; }
function fifaCity(m) { return m.Stadium?.CityName?.find(x=>x.Locale==="en-GB")?.Description || ""; }
function fifaStadium(m) { return m.Stadium?.Name?.find(x=>x.Locale==="en-GB")?.Description || ""; }
function getFifaStatus(m) {
  if (m.MatchStatus === 3) return "live";
  if (m.HomeTeamScore !== null && m.HomeTeamScore !== undefined) return "finished";
  return "upcoming";
}
function fmtIST(d) {
  try { return new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"}); }
  catch { return ""; }
}
function fmtDateIST(d) {
  try { return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",timeZone:"Asia/Kolkata"}); }
  catch { return ""; }
}
function ecbInitials(name) {
  return (name || "").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── CACHE (shared style with Homeies.jsx) ────────────────────────────────────
const _cache = {};
function getCached(k) { const e = _cache[k]; return (e && Date.now() - e.ts < 600000) ? e.data : null; }
function setCache(k, d) { _cache[k] = { data: d, ts: Date.now() }; }

// ─── BCCI SQUAD FETCH ────────────────────────────────────────────────────────
async function fetchBcciSquad(matchID) {
  if (!matchID) return null;
  const k = `squad_${matchID}`;
  const cached = getCached(k);
  if (cached) return cached;
  try {
    const res = await fetch(`${API_BASE}/api/bcci/squad?matchID=${matchID}`);
    if (!res.ok) return null;
    const json = await res.json();
    setCache(k, json);
    return json;
  } catch { return null; }
}

// ─── BCCI MATCH SUMMARY FETCH ─────────────────────────────────────────────────
async function fetchBcciMatchSummary(matchID) {
  if (!matchID) return null;
  const k = `matchsummary_${matchID}`;
  const cached = getCached(k);
  if (cached) return cached;
  try {
    const res = await fetch(`${API_BASE}/api/bcci/matchsummary?matchID=${matchID}`);
    if (!res.ok) return null;
    const json = await res.json();
    setCache(k, json);
    return json;
  } catch { return null; }
}

// ─── INDIA HIGHLIGHTS (routed through your backend to avoid CORS) ────────────
// Returns the full list of videos for a match so we can show a FIFA-style
// multi-clip grid. Each item includes short_code for stream extraction.
async function fetchIndiaHighlights(smMatchId) {
  if (!smMatchId) return null;
  const k = `highlights_all_${smMatchId}`;
  const cached = getCached(k);
  if (cached !== undefined && cached !== null) return cached;

  try {
    const res = await fetch(`${API_BASE}/api/bcci/highlight?smMatchId=${smMatchId}`);
    if (!res.ok) return null;
    const json = await res.json();
    const videos = json.data || [];
    if (!videos.length) { setCache(k, null); return null; }

    // Map every video to a normalised shape (preserve short_code for stream extraction)
    const mapped = videos.map(v => ({
      id:        v._id || v.id,
      title:     v.title || "Untitled",
      thumbnail: v.thumbnail_image || v.imageUrl || v.imageBackup || null,
      duration:  v.duration || 0,
      views:     v.views_count || v.views || 0,
      shortCode: v.short_code || null,         // ← used to build bccilink URL
      urlSegment: v.titleUrlSegment || null,   // ← fallback
    }));

    setCache(k, mapped);
    return mapped;
  } catch (e) {
    console.error("[highlights] fetch failed", e);
    return null;
  }
}

// ─── FIFA HIGHLIGHTS ──────────────────────────────────────────────────────────
const FIFA_VIDEOS_API = "https://cxm-api.fifa.com/fifaplusweb/api/sections/matchdetails/videos";

// NOTE: stageId varies per round (group stage / round of 32 / etc). If FIFA's
// calendar match objects expose their own stage id (e.g. m.IdStage), prefer
// that over the fixed FIFA_STAGE constant — confirm via the console log
// already present in FifaMatchCenter's highlight effect.
async function fetchFifaHighlight(matchId, stageId = FIFA_STAGE) {
  if (!matchId) return null;
  const k = `fifa_highlight_${matchId}`;
  const cached = getCached(k);
  if (cached !== undefined && cached !== null) return cached;

  try {
    const url = `${FIFA_VIDEOS_API}?locale=en&competitionId=${FIFA_COMPETITION}&seasonId=${FIFA_SEASON}&stageId=${stageId}&matchId=${matchId}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn("[fifa highlight] status", res.status, "matchId", matchId);
      return null;
    }
    const json = await res.json();
    const items = json?.vodVideosBaseCarousel?.items || [];
    if (!items.length) { setCache(k, null); return null; }

    // Prefer the standard cut over sign-language / accessibility variants
    const vid = items.find(v => !/sign language/i.test(v.title || "")) || items[0];

    const highlight = {
      title: vid.title,
      thumbnail: vid.image?.src || null,
      // readMorePageUrl looks like "/en/watch/SQUgNGrNai36KI7q8vHo6" — relative.
      // Verify the correct base domain once you click through on fifa.com.
      watchPath: vid.readMorePageUrl || null,
    };
    setCache(k, highlight);
    return highlight;
  } catch (e) {
    console.error("[fifa highlight] fetch failed", matchId, e);
    return null;
  }
}



/* ═══════════════════════════════════════════════════════════════════════════
   ECB SHARED ATOMS
═══════════════════════════════════════════════════════════════════════════ */

/* Pulsing live dot */
function PulsingDot({ color = "#ef4444", size = 8 }) {
  return (
    <span className="relative flex shrink-0" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-full w-full" style={{ background: color }} />
    </span>
  );
}

/* ── Highlight video card (generic — BCCI or FIFA) ── */
function EcbHighlightCard({ highlight, accent = ECB_RED, onOpen, loading = false }) {
  if (!highlight) return null;
  return (
    <button
      onClick={onOpen}
      disabled={loading}
      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors disabled:opacity-70"
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/10">
        {highlight.thumbnail && (
          <img src={highlight.thumbnail} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          {loading
            ? <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${accent}40`, borderTopColor: accent }} />
            : <PlayCircle size={22} className="text-white" />
          }
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: accent }}>
          ▶ Watch Highlights
        </p>
        <p className="text-[13px] font-bold text-white truncate">{highlight.title}</p>
      </div>
    </button>
  );
}
/* ECB red "Live Now" pill */
function LiveNowBadge({ countdown }) {
  return (
    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full" style={{ background: ECB_RED, color: "#fff" }}>
      <PulsingDot color="#fff" size={6} />
      Live Now{countdown ? ` · ${countdown}s` : ""}
    </span>
  );
}

/* ECB underline tab bar */
function EcbTabBar({ tabs, active, onChange, accent = ECB_RED }) {
  return (
    <div className="flex gap-0 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      {tabs.map(({ k, l }) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className="relative pb-3 pt-2 px-5 text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-colors"
          style={{ color: active === k ? "#fff" : "rgba(255,255,255,0.28)" }}
        >
          {l}
          {active === k && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full" style={{ background: accent }} />
          )}
        </button>
      ))}
    </div>
  );
}

/* ECB ball chip (over strip) */
function EcbBallChip({ label }) {
  const l = String(label).toUpperCase();
  let bg = "rgba(255,255,255,0.07)", border = "rgba(255,255,255,0.14)", color = "#6b7280";
  if (l === "W")             { bg = "#111827"; border = "#374151"; color = "#fff"; }
  else if (l === "4")        { bg = "#1d4ed8"; border = "#1d4ed8"; color = "#fff"; }
  else if (l === "6")        { bg = "#15803d"; border = "#15803d"; color = "#fff"; }
  else if (l.includes("NB")) { bg = "rgba(245,158,11,0.2)"; border = "rgba(245,158,11,0.4)"; color = "#f59e0b"; }
  else if (l === "WD")       { bg = "rgba(100,100,120,0.2)"; border = "rgba(100,100,120,0.3)"; color = "#9ca3af"; }
  else if (l === "·")        { color = "#374151"; }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-black border shrink-0 select-none"
      style={{
        backgroundColor: bg, borderColor: border, color,
        width: 38, height: 38,
        fontSize: l.length > 2 ? 8 : l.length > 1 ? 10 : 14,
        lineHeight: 1,
      }}
    >
      {l === "0" ? "·" : l}
    </span>
  );
}

/* Stat row for summary/overview tabs */
function EcbStatRow({ label, value, color = "rgba(255,255,255,0.75)", sub }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span className="text-xs text-white/35 font-medium shrink-0 w-36">{label}</span>
      <div className="text-right">
        <span className="text-xs font-semibold" style={{ color }}>{value}</span>
        {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── ECB Hero block: two teams + innings, used by all three match centers ── */
function EcbHero({
  /* left team */ homeCode, homeName, homeLogo, homeFlag,
  /* right team */ awayCode, awayName, awayLogo, awayFlag,
  /* scores: array of { label, score, overs } for each team */
  homeInnings, awayInnings,
  /* meta */ isLive, isFinished, isUpcoming,
  statusText, tossText, seriesText, venueText,
  matchTypeText, countdown, refreshing, onRefresh,
  accentColor,
  
  children, // slot: live players / over strip / result / upcoming
}) {
  const navy = accentColor
    ? `linear-gradient(160deg, #001836 0%, #000D22 60%, #000810 100%)`
    : `linear-gradient(160deg, ${ECB_NAVY} 0%, #000D28 60%, #000810 100%)`;

  return (
    <div className="overflow-hidden rounded-3xl" style={{ background: navy, border: "1px solid rgba(255,255,255,0.08)" }}>

      {/* Series / venue bar */}
      <div className="flex items-center justify-between px-5 py-3 gap-2 flex-wrap" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {seriesText && <span className="text-[10px] font-bold text-white/50 truncate">{seriesText}</span>}
          {matchTypeText && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-[10px] text-white/35">{matchTypeText}</span>
            </>
          )}
          {venueText && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-[10px] text-white/30 truncate">📍 {venueText}</span>
            </>
          )}
          {tossText && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-[10px] text-white/25 italic truncate">🪙 {tossText}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isLive && <LiveNowBadge countdown={countdown} />}
          {isFinished && !isLive && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
              ✓ Full Time
            </span>
          )}
          <button
            onClick={onRefresh}
            className={`w-7 h-7 flex items-center justify-center rounded-full text-white/25 hover:text-white hover:bg-white/5 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Two-team hero */}
      <div className="px-5 sm:px-9 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Home */}
        <div className="flex-1 flex flex-col gap-2 items-start text-left">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/30">{homeCode}</p>
          <h2
            className="font-black text-white leading-none"
            style={{ fontSize: "clamp(1.5rem, 3.8vw, 2.6rem)", letterSpacing: "-0.025em" }}
          >
            {homeName || homeCode || "—"}
          </h2>
          {homeInnings?.length > 0 ? (
            <div className="flex gap-5 mt-1 flex-wrap">
              {homeInnings.map((inn, i) => inn && (
                <div key={i}>
                  <p className="text-[9px] text-white/25 uppercase font-semibold">{inn.label || (i === 0 ? "1st Inn" : "2nd Inn")}</p>
                  <p className="text-xl font-black text-white">{inn.score}</p>
                  {inn.overs && <p className="text-[9px] text-white/20">{inn.overs}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/20 mt-1">Yet to bat</p>
          )}
        </div>

        {/* VS + crests */}
        <div className="hidden sm:flex flex-col items-center gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-white/[0.04] flex items-center justify-center">
              {homeLogo
                ? <img src={homeLogo} alt="" className="w-full h-full object-contain p-1" onError={e => { e.target.style.display = "none"; }} />
                : homeLogo === null
                  ? <span className="text-2xl">{homeFlag}</span>
                  : <span className="text-xl font-black text-white/20">{ecbInitials(homeName || homeCode)}</span>
              }
            </div>
            <span className="text-[10px] font-black text-white/15 uppercase tracking-widest">vs</span>
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-white/[0.04] flex items-center justify-center">
              {awayLogo
                ? <img src={awayLogo} alt="" className="w-full h-full object-contain p-1" onError={e => { e.target.style.display = "none"; }} />
                : awayLogo === null
                  ? <span className="text-2xl">{awayFlag}</span>
                  : <span className="text-xl font-black text-white/20">{ecbInitials(awayName || awayCode)}</span>
              }
            </div>
          </div>
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col gap-2 items-end text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/30">{awayCode}</p>
          <h2
            className="font-black text-white leading-none"
            style={{ fontSize: "clamp(1.5rem, 3.8vw, 2.6rem)", letterSpacing: "-0.025em" }}
          >
            {awayName || awayCode || "—"}
          </h2>
          {awayInnings?.length > 0 ? (
            <div className="flex gap-5 mt-1 flex-wrap justify-end">
              {awayInnings.map((inn, i) => inn && (
                <div key={i} className="text-right">
                  <p className="text-[9px] text-white/25 uppercase font-semibold">{inn.label || (i === 0 ? "1st Inn" : "2nd Inn")}</p>
                  <p className="text-xl font-black text-white">{inn.score}</p>
                  {inn.overs && <p className="text-[9px] text-white/20">{inn.overs}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/20 mt-1">Yet to bat</p>
          )}
        </div>
      </div>

      {/* Status band */}
      {statusText && (
        <div className="px-5 py-3.5 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.22)" }}>
          <p className="text-[13px] font-black text-white leading-snug">{statusText}</p>
        </div>
      )}

      {/* Injected slot */}
      {children}
    </div>
  );
}

/* ── ECB live player cards: bowler | striker | non-striker ── */
/* ── ECB premium live player cards: bowler | striker | non-striker ── */
function EcbCreaseCards({ 
  bowlerName, bowlerFigures, bowlerEco, bowlerOvers,
  strikerName, strikerRuns, strikerBalls, strikerFours, strikerSixes, strikerSR,
  nonStrikerName, nonStrikerRuns, nonStrikerBalls,
  strikerImg, nonStrikerImg, bowlerImg,
}) {
  return (
    <div className="w-full bg-white text-slate-900 border-t border-b border-slate-200 flex flex-col md:flex-row relative overflow-hidden select-none">
      
      {/* 1. BOWLER SECTION */}
      {bowlerName && (
        <div className="flex-1 flex items-stretch justify-between p-4 border-b md:border-b-0 md:border-r border-slate-100 relative bg-slate-50/60 min-h-[130px]">
          <div className="flex flex-col justify-between h-full max-w-[55%] z-10 relative">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-sans">
                Bowling
              </span>
              <h4 className="text-sm font-black text-slate-900 mt-2 tracking-tight leading-tight break-words">
                {bowlerName}
              </h4>
            </div>
            <div className="mt-2">
              <p className="text-xl font-black text-slate-900 leading-none">
                {bowlerFigures}
              </p>
              <p className="text-[10px] text-slate-500 font-bold mt-1 whitespace-nowrap">
                {bowlerOvers} ov · Eco {bowlerEco}
              </p>
            </div>
          </div>

          {/* Fixed Bowler Image Containment */}
          {bowlerImg && (
            <div className="absolute right-0 bottom-0 top-0 w-1/2 pointer-events-none overflow-hidden flex items-end justify-end z-0">
              <img 
                src={bowlerImg} 
                alt="" 
                className="h-[110%] w-auto max-w-full object-contain object-bottom object-right translate-y-1.5 filter drop-shadow-[-4px_2px_8px_rgba(0,0,0,0.05)]"
                onError={e => { e.target.style.display = "none"; }} 
              />
            </div>
          )}
        </div>
      )}

      {/* 2. BATSMEN COMBINED GRID */}
      <div className="flex-[2] flex flex-row relative bg-white min-h-[130px]">
        
        {/* STRIKER PANEL */}
        {strikerName && (
          <div className="flex-1 flex items-stretch justify-between p-4 border-r border-slate-100 relative bg-white">
            <div className="flex flex-col justify-between h-full max-w-[55%] z-10 relative">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded font-sans inline-flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" /> On Strike
                </span>
                <h4 className="text-sm font-black text-slate-900 mt-2 tracking-tight leading-tight break-words">
                  {strikerName}
                </h4>
              </div>
              <div className="mt-2">
                <p className="text-xl font-black text-slate-900 leading-none">
                  {strikerRuns} <span className="text-xs font-bold text-slate-400 font-sans">({strikerBalls})</span>
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-1 whitespace-nowrap">
                  {[strikerFours > 0 && `${strikerFours}×4`, strikerSixes > 0 && `${strikerSixes}×6`, strikerSR && `SR ${strikerSR}`].filter(Boolean).join("  ")}
                </p>
              </div>
            </div>

            {/* Striker Cutout */}
            {strikerImg && (
              <div className="absolute right-0 bottom-0 top-0 w-1/2 pointer-events-none overflow-hidden flex items-end justify-end z-0">
                <img 
                  src={strikerImg} 
                  alt="" 
                  className="h-[115%] w-auto max-w-full object-contain object-bottom object-right translate-y-1 filter drop-shadow-[-4px_2px_6px_rgba(0,0,0,0.04)]"
                  onError={e => { e.target.style.display = "none"; }} 
                />
              </div>
            )}
          </div>
        )}

        {/* NON-STRIKER PANEL */}
        {nonStrikerName && (
          <div className="flex-1 flex items-stretch justify-between p-4 relative bg-slate-50/10">
            <div className="flex flex-col justify-between h-full max-w-[55%] z-10 relative pl-2">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-sans">
                  Non-Striker
                </span>
                <h4 className="text-sm font-black text-slate-900 mt-2 tracking-tight leading-tight break-words">
                  {nonStrikerName}
                </h4>
              </div>
              <div className="mt-2">
                <p className="text-xl font-black text-slate-900 leading-none">
                  {nonStrikerRuns} <span className="text-xs font-bold text-slate-400 font-sans">({nonStrikerBalls})</span>
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">—</p>
              </div>
            </div>

            {/* Non-Striker Cutout */}
            {nonStrikerImg && (
              <div className="absolute right-0 bottom-0 top-0 w-1/2 pointer-events-none overflow-hidden flex items-end justify-end z-0">
                <img 
                  src={nonStrikerImg} 
                  alt="" 
                  className="h-[115%] w-auto max-w-full object-contain object-bottom object-right translate-y-1 filter drop-shadow-[-4px_2px_6px_rgba(0,0,0,0.04)]"
                  onError={e => { e.target.style.display = "none"; }} 
                />
              </div>
            )}
          </div>
        )}

        {/* Central Partnership Pill Indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden sm:flex flex-col items-center justify-center bg-white border border-slate-200/90 shadow-md rounded-xl px-2 py-1 min-w-[75px]">
          <span className="text-[7px] font-black uppercase tracking-wider text-slate-400 leading-none">Partnership</span>
          <span className="text-xs font-black text-slate-800 mt-0.5">
            {parseInt(strikerRuns || 0) + parseInt(nonStrikerRuns || 0)}
          </span>
        </div>

      </div>
    </div>
  );
}
/* ── ECB over strip ── */
function EcbOverStrip({ balls, bowlerName }) {
  const emptyCount = Math.max(0, 6 - balls.length);
  return (
    <div
      className="px-5 py-3.5 flex items-center gap-2.5 overflow-x-auto"
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.25)" }}
    >
      <div className="shrink-0 mr-1">
        <p className="text-[8px] font-black uppercase tracking-widest text-white/20">This over</p>
        {bowlerName && <p className="text-[9px] font-bold text-white/35 mt-0.5 truncate max-w-[60px]">{bowlerName}</p>}
      </div>
      {Array.from({ length: emptyCount }).map((_, i) => (
        <span key={`e${i}`} className="inline-flex items-center justify-center rounded-full shrink-0"
          style={{ width: 38, height: 38, background: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(255,255,255,0.09)" }} />
      ))}
      {balls.map((ball, i) => <EcbBallChip key={i} label={ball} />)}
    </div>
  );
}

/* ── ECB result banner (inside hero) ── */
function EcbResultBanner({ resultText, mom, momRuns, momWkts, momImg }) {
  if (!resultText && !mom) return null;
  return (
    <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(74,222,128,0.04)" }}>
      {resultText && (
        <div className="flex items-center gap-2.5 mb-3">
          <Trophy size={14} className="text-amber-400 shrink-0" />
          <p className="text-[13px] font-black" style={{ color: "#4ade80" }}>{resultText}</p>
        </div>
      )}
      {mom && (
        <div className="flex items-center gap-3 pt-3" style={{ borderTop: resultText ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
          {momImg ? (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
              <img src={momImg} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <Star size={16} className="text-amber-400" />
            </div>
          )}
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-amber-400">Player of the Match</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[12px] font-black text-white">{mom}</span>
              {momRuns && momRuns !== "-" && <span className="text-[9px] text-white/35">{momRuns}R</span>}
              {momWkts && momWkts !== "-" && <span className="text-[9px] text-white/35">{momWkts}W</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Batting table (shared by BCCI + WT20) ── */
function EcbBattingTable({ rows }) {
  if (!rows?.length) return <p className="text-center text-white/20 text-xs py-10">No batting data</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {["Batter","Dismissal","R","B","4s","6s","SR"].map((h, i) => (
              <th key={h} className={`py-3 text-[9px] font-black text-white/22 uppercase tracking-[0.18em] ${i===0?"pl-5 text-left":"text-right px-2.5"} ${i===6?"pr-5":""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <td className="pl-5 py-3.5 text-[11px] font-bold" style={{ color: b.isNotOut ? "#fcd34d" : "rgba(255,255,255,0.82)" }}>
                {b.name}{b.isNotOut ? " ★" : ""}
              </td>
              <td className="px-2.5 py-3.5 text-[9px] text-white/28 italic max-w-[110px] truncate">{b.dismissal}</td>
              <td className="px-2.5 py-3.5 text-right text-sm font-black text-white">{b.runs ?? "—"}</td>
              <td className="px-2.5 py-3.5 text-right text-sm text-white/38">{b.balls ?? "—"}</td>
              <td className="px-2.5 py-3.5 text-right text-sm" style={{ color: "#60a5fa" }}>{b.fours ?? "—"}</td>
              <td className="px-2.5 py-3.5 text-right text-sm" style={{ color: "#a78bfa" }}>{b.sixes ?? "—"}</td>
              <td className="pr-5 py-3.5 text-right text-sm text-white/28 font-mono">{b.sr ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Bowling table (shared) ── */
function EcbBowlingTable({ rows }) {
  if (!rows?.length) return <p className="text-center text-white/20 text-xs py-10">No bowling data</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {["Bowler","O","M","R","W","Eco"].map((h, i) => (
              <th key={h} className={`py-3 text-[9px] font-black text-white/22 uppercase tracking-[0.18em] ${i===0?"pl-5 text-left":"text-right px-2.5"} ${i===5?"pr-5":""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <td className="pl-5 py-3.5 text-[11px] font-bold" style={{ color: b.isCurrent ? "#93c5fd" : "rgba(255,255,255,0.82)" }}>
                {b.name}{b.isCurrent ? " ●" : ""}
              </td>
              <td className="px-2.5 py-3.5 text-right text-sm text-white font-mono">{b.overs ?? "—"}</td>
              <td className="px-2.5 py-3.5 text-right text-sm text-white/38">{b.maidens ?? "—"}</td>
              <td className="px-2.5 py-3.5 text-right text-sm font-bold text-white">{b.runs ?? "—"}</td>
              <td className="px-2.5 py-3.5 text-right text-sm font-black" style={{ color: "#4ade80" }}>{b.wickets ?? "—"}</td>
              <td className="pr-5 py-3.5 text-right text-sm text-white/38">{b.eco ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Scorecard section header ── */
function EcbSectionHeader({ label }) {
  return (
    <div className="px-5 py-3" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span className="text-[9px] font-black text-white/28 uppercase tracking-[0.22em]">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INNINGS + BALL-BY-BALL
   The scorecard used to come from getMatchCenterDetails, which now answers 200
   with an empty body — so every innings tab read "not available". These pull
   from the scoring feed the scoreboard itself uses, via our own API.

   Scorecard and commentary are fetched separately on purpose: a full ODI is
   ~34 KB of scorecard against ~190 KB of ball-by-ball prose, so the commentary
   only loads when someone actually opens that tab.
═══════════════════════════════════════════════════════════════════════════ */
function useInnings(type, matchId, isTest) {
  const [innings, setInnings] = useState(null);
  const [error, setError]     = useState(null);

  const reload = useCallback(async () => {
    if (!matchId || !type) return;
    try {
      const r = await fetch(`${API_BASE}/api/cricket/innings?type=${type}&id=${encodeURIComponent(matchId)}${isTest ? "&test=1" : ""}`);
      const j = await r.json();
      // The old path failed by returning {ok:false} with HTTP 200, so the
      // caller's `if (!json)` guard never fired and the error sailed through as
      // data. Check the flag, not just the status.
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setInnings(j.innings || []); setError(null);
    } catch (e) { setError(e.message); setInnings([]); }
  }, [type, matchId, isTest]);

  useEffect(() => { reload(); }, [reload]);
  // Track the live score without re-pulling commentary.
  useEffect(() => { const t = setInterval(reload, 30000); return () => clearInterval(t); }, [reload]);

  return { innings, error, reload };
}

/* Innings selector — one pill per innings, so a Test shows all four. */
function InningsSelector({ innings, active, onChange }) {
  if (!innings?.length) return null;
  return (
    <div className="flex gap-2 px-5 py-3.5 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      {innings.map(inn => {
        const ex = inn.Extras?.[0] || {};
        const on = inn.number === active;
        return (
          <button
            key={inn.number}
            onClick={() => onChange(inn.number)}
            className="shrink-0 px-3.5 py-2 rounded-xl text-left transition-colors"
            style={{
              background: on ? "rgba(207,20,43,0.14)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${on ? "rgba(207,20,43,0.5)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <span className="block text-[9px] font-black uppercase tracking-widest" style={{ color: on ? ECB_RED : "rgba(255,255,255,0.3)" }}>
              {ex.BattingTeamName || `Innings ${inn.number}`}
            </span>
            <span className="block text-sm font-black text-white mt-0.5">{ex.Total || "—"}</span>
          </button>
        );
      })}
    </div>
  );
}

/* One delivery's chip label: extras have to be read off their own flags,
   because a wide's Runs field carries the penalty run, not "wd". */
function ballChipLabel(b) {
  if (b.IsWicket === "1") return "W";
  if (b.IsWide === "1")   return "WD";
  if (b.IsNoBall === "1") return "NB";
  return String(b.ActualRuns ?? b.BallRuns ?? "0");
}

function BallByBall({ type, matchId, inning }) {
  const [overs, setOvers]     = useState(null);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setOvers(null); setError(null);
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/cricket/balls?type=${type}&id=${encodeURIComponent(matchId)}&inning=${inning}`);
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        if (!cancelled) setOvers(j.overs || []);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [type, matchId, inning]);

  if (error)  return <p className="text-center text-white/20 text-xs py-10">Ball-by-ball unavailable</p>;
  if (!overs) return <p className="text-center text-white/20 text-xs py-10">Loading commentary…</p>;
  if (!overs.length) return <p className="text-center text-white/20 text-xs py-10">No deliveries bowled yet</p>;

  return (
    <div>
      {overs.map(ov => (
        <div key={ov.overNo} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Over {ov.overNo}</span>
              {ov.bowler && <span className="text-[10px] text-white/30 ml-2 truncate">{ov.bowler}</span>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] text-white/35">
                {ov.runs} run{ov.runs === 1 ? "" : "s"}{ov.wickets ? ` · ${ov.wickets} wkt` : ""}
              </span>
              {ov.scoreAfter && <span className="text-xs font-black text-white font-mono">{ov.scoreAfter}</span>}
            </div>
          </div>

          <div className="px-5 py-3 flex items-center gap-2 overflow-x-auto">
            {ov.balls.map((b, i) => <EcbBallChip key={i} label={ballChipLabel(b)} />)}
          </div>

          <div className="px-5 pb-3.5 space-y-1.5">
            {ov.balls.map((b, i) => {
              const text = b.Commentry || b.NewCommentry;
              if (!text) return null;
              return (
                <p key={i} className="text-[11px] leading-relaxed text-white/45">
                  <span className="font-mono font-black text-white/70 mr-1.5">
                    {(b.CommentOver || "").replace(/^Over\s*/i, "")}
                  </span>
                  {text}
                </p>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Scorecard wrapper card ── */
function EcbScorecardCard({ children }) {
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(0,5,18,0.97)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE CHANNEL SWITCHER
═══════════════════════════════════════════════════════════════════════════ */
function ResultPopup({ result, mom, momRuns, momWickets, momImg, sport }) {
  const [visible, setVisible] = useState(false);
  const accent = sport === "football" ? "#34d399" : "#4ade80";
  const accentBg = sport === "football" ? "rgba(52,211,153,0.07)" : "rgba(74,222,128,0.07)";
  const accentBorder = sport === "football" ? "rgba(52,211,153,0.2)" : "rgba(74,222,128,0.2)";
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);
  return (
    <div className="transition-all duration-500 space-y-3" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(14px)" }}>
      <div className="rounded-2xl border overflow-hidden" style={{ background: accentBg, borderColor: accentBorder }}>
        <div className="flex items-center gap-4 px-5 py-4 border-b" style={{ borderColor: accentBorder }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}>
            <Trophy size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Match Result</p>
            <p className="text-base font-black leading-tight" style={{ color: accent }}>{result || "Match completed"}</p>
          </div>
        </div>
        {mom && (
          <div className="px-5 py-4 flex items-center gap-4">
            {momImg
              ? <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0"><img src={momImg} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} /></div>
              : <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}><Star size={18} className="text-amber-400" /></div>
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5"><Star size={10} className="text-amber-400 shrink-0" /><span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Player of the Match</span></div>
              <p className="text-sm font-black text-white truncate">{mom}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {momRuns && momRuns !== "-" && <span className="text-[10px] text-gray-400 font-bold">{momRuns} runs</span>}
                {momWickets && momWickets !== "-" && <span className="text-[10px] text-gray-400 font-bold">{momWickets} wkts</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LivePlayer({ sport }) {
  const channels = sport === "football" ? FOOTBALL_CHANNELS : CRICKET_CHANNELS;
  const [active, setActive] = useState(channels[0]);
  const [switching, setSwitching] = useState(false);
  const playerRef = useRef(null);
  const switchTo = (ch) => {
    if (ch.id === active.id) return;
    setSwitching(true);
    setTimeout(() => { setActive(ch); setSwitching(false); }, 300);
  };
  const goFullscreen = () => {
    if (!document.fullscreenElement) playerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08]" style={{ background: "#000" }}>
      <div className="flex" style={{ minHeight: 220 }}>
        <div className="flex-1 relative" ref={playerRef}>
          {switching ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin mb-2" style={{ borderColor: `${active.color}30`, borderTopColor: active.color }} />
              <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: active.color }}>Switching…</p>
            </div>
          ) : (
            <iframe key={active.id} src={active.url} className="absolute inset-0 w-full h-full border-none" style={{ minHeight: 220 }} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen scrolling="no" />
          )}
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
            <PulsingDot color={active.color} size={6} />
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: active.color }}>Live</span>
          </div>
          <button onClick={goFullscreen} className="absolute top-2 right-2 z-20 p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ background: "rgba(0,0,0,0.5)" }}>
            <Maximize2 size={11} className="text-gray-400 hover:text-white" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-1 px-2 py-1.5" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
            <AlertCircle size={8} className="text-gray-600 shrink-0" />
            <p className="text-[7px] text-gray-600 font-bold uppercase tracking-wider truncate">Third-party · Use Chrome · Disable ad-blocker if needed</p>
          </div>
        </div>
        <div className="flex flex-col border-l border-white/[0.07] overflow-y-auto shrink-0" style={{ width: 96, background: "rgba(255,255,255,0.02)" }}>
          <div className="px-2 pt-2 pb-1.5 border-b border-white/[0.06]">
            <p className="text-[7px] font-black text-gray-700 uppercase tracking-widest text-center">Channels</p>
          </div>
          <div className="flex flex-col gap-0.5 p-1.5 flex-1">
            {channels.map((ch) => {
              const isActive = active.id === ch.id;
              return (
                <button key={ch.id} onClick={() => switchTo(ch)} className="flex flex-col items-center gap-1.5 px-1.5 py-2 rounded-xl border transition-all duration-200 active:scale-95 w-full" style={{ background: isActive ? ch.bg : "transparent", borderColor: isActive ? ch.border : "transparent", boxShadow: isActive ? `0 0 10px ${ch.glow}` : "none" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ background: isActive ? `${ch.color}15` : "rgba(255,255,255,0.05)", border: `1px solid ${isActive ? ch.border : "rgba(255,255,255,0.07)"}` }}>
                    {ch.useIcon ? <Tv2 size={14} style={{ color: isActive ? ch.color : "#4b5563" }} /> : <img src={ch.logo} alt="" className="w-full h-full object-contain p-0.5" style={{ filter: isActive ? "none" : "grayscale(100%) brightness(0.35)" }} />}
                  </div>
                  <span className="text-[8px] font-black uppercase leading-tight text-center" style={{ color: isActive ? ch.color : "#4b5563" }}>{ch.sub}</span>
                  {isActive && <div className="w-4 h-0.5 rounded-full" style={{ background: ch.color }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveChannelSwitcher({ sport, isLive, isFinished, result, mom, momRuns, momWickets, momImg }) {
  if (isLive) return <LivePlayer sport={sport} />;
  if (isFinished) return <ResultPopup result={result} mom={mom} momRuns={momRuns} momWickets={momWickets} momImg={momImg} sport={sport} />;
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BCCI MATCH CENTER — ECB style
═══════════════════════════════════════════════════════════════════════════ */
/* ── Skill badge for player role ── */
function SkillBadge({ skill }) {
  const cfg = {
    "Batsman":       { bg: "rgba(59,130,246,0.18)",  color: "#93c5fd", label: "BAT" },
    "All Rounder":   { bg: "rgba(139,92,246,0.18)",  color: "#c4b5fd", label: "ALL" },
    "Bowler":        { bg: "rgba(239,68,68,0.18)",   color: "#fca5a5", label: "BWL" },
    "Wicket Keeper": { bg: "rgba(245,158,11,0.18)",  color: "#fcd34d", label: "WK"  },
  }[skill] || { bg: "rgba(100,116,139,0.18)", color: "#94a3b8", label: "—" };
  return (
    <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

/* ── Single player card in the squad list ── */
function SquadPlayerCard({ player }) {
  const [imgFailed, setImgFailed] = useState(false);
  const isCap = player.IsCaptain === "1";
  const isVc  = player.IsViceCaptain === "1";
  const isWk  = player.IsWK === "1";
  const initials = (player.PlayerShortName || player.PlayerName || "").trim().split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.025] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10 bg-white/5 flex items-center justify-center">
        {!imgFailed && player.PlayerImage
          ? <img src={player.PlayerImage} alt="" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
          : <span className="text-[10px] font-black text-white/30">{initials}</span>}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-bold text-white truncate">{(player.PlayerName || "").trim()}</span>
          {isCap && <span className="text-[8px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">C</span>}
          {isVc  && <span className="text-[8px] font-black text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded">VC</span>}
          {isWk  && <span className="text-[8px] font-black text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">WK</span>}
          <SkillBadge skill={player.PlayerSkill} />
        </div>
        <p className="text-[9px] text-white/30 mt-0.5 truncate">
          {player.BattingType && <span>{player.BattingType}</span>}
          {player.BattingType && player.BowlingProficiency && <span className="mx-1 text-white/15">·</span>}
          {player.BowlingProficiency && <span>{player.BowlingProficiency}</span>}
        </p>
      </div>
    </div>
  );
}

/* ── Squad panel for one team ── */
function SquadPanel({ players, teamName, teamLogo, teamCode }) {
  const [imgFailed, setImgFailed] = useState(false);
  const batsmen    = players.filter(p => p.PlayerSkill === "Batsman");
  const allRounders = players.filter(p => p.PlayerSkill === "All Rounder");
  const keepers    = players.filter(p => p.PlayerSkill === "Wicket Keeper");
  const bowlers    = players.filter(p => p.PlayerSkill === "Bowler");
  const sections = [
    { label: "Batsmen",       items: batsmen },
    { label: "All Rounders",  items: allRounders },
    { label: "Wicket Keepers",items: keepers },
    { label: "Bowlers",       items: bowlers },
  ].filter(s => s.items.length > 0);
  return (
    <div>
      {/* Team header */}
      <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
          {!imgFailed && teamLogo
            ? <img src={teamLogo} alt="" className="w-full h-full object-contain p-1" onError={() => setImgFailed(true)} />
            : <span className="text-xs font-black text-white/40">{teamCode?.slice(0,3) || "—"}</span>}
        </div>
        <div>
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">{teamCode}</p>
          <p className="text-[13px] font-black text-white leading-tight">{teamName}</p>
        </div>
        <span className="ml-auto text-[9px] font-black text-white/20 uppercase tracking-wider">{players.length} Players</span>
      </div>
      {sections.map(sec => (
        <div key={sec.label}>
          <div className="px-4 py-2" style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-[8px] font-black text-white/25 uppercase tracking-[0.2em]">{sec.label}</span>
          </div>
          {sec.items.map((p, i) => <SquadPlayerCard key={p.PlayerID || i} player={p} />)}
        </div>
      ))}
    </div>
  );
}

/* ── Match summary panel ── */
function MatchSummaryPanel({ summary, isFinished }) {
  const ms = summary?.postMatch?.[0] || summary?.liveMatch?.[0] || null;
  if (!ms && !isFinished) return (
    <p className="text-center text-white/25 text-xs py-12">Summary available after match ends.</p>
  );
  if (!ms) return (
    <p className="text-center text-white/25 text-xs py-12">Match summary not yet available.</p>
  );
  const postHtml = ms.PostMatchCommentary || "";
  const preHtml  = ms.PreMatchCommentary  || "";
  return (
    <div className="space-y-0">
      {/* Quick result */}
      {ms.Comments && (
        <div className="px-5 py-4" style={{ background: "rgba(74,222,128,0.05)", borderBottom: "1px solid rgba(74,222,128,0.12)" }}>
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Result</p>
          <p className="text-sm font-black text-green-400">{ms.Comments}</p>
        </div>
      )}
      {/* MOM */}
      {ms.MOM && (
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {ms.MOMImage && (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
              <img src={ms.MOMImage} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display="none"; }} />
            </div>
          )}
          <div>
            <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Player of the Match</p>
            <p className="text-sm font-black text-white">{ms.MOM}</p>
            <div className="flex gap-3 mt-0.5">
              {ms.MOMWicket && ms.MOMWicket !== "-" && <span className="text-[9px] text-white/35">{ms.MOMWicket} wkts</span>}
              {ms.MOMRC && ms.MOMRC !== "-" && <span className="text-[9px] text-white/35">{ms.MOMRC} runs conceded</span>}
            </div>
          </div>
        </div>
      )}
      {/* Post-match commentary */}
      {postHtml && (
        <div className="px-5 py-5">
          <p className="text-[8px] font-black text-white/25 uppercase tracking-widest mb-3">Post Match</p>
          <div
            className="text-[12px] leading-relaxed text-white/60 space-y-3"
            style={{ maxHeight: 480, overflowY: "auto" }}
            dangerouslySetInnerHTML={{ __html: postHtml.replace(/<img[^>]*>/gi, "") }}
          />
        </div>
      )}
      {/* Pre-match commentary (collapsed if post exists) */}
      {preHtml && !postHtml && (
        <div className="px-5 py-5">
          <p className="text-[8px] font-black text-white/25 uppercase tracking-widest mb-3">Pre Match</p>
          <div
            className="text-[12px] leading-relaxed text-white/60 space-y-3"
            style={{ maxHeight: 480, overflowY: "auto" }}
            dangerouslySetInnerHTML={{ __html: preHtml.replace(/<img[^>]*>/gi, "") }}
          />
        </div>
      )}
    </div>
  );
}

function BcciMatchCenter({ matchData, onMatchState }) {
  const [sc, setSc]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown]   = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [highlights, setHighlights] = useState(null);   // array of all match videos
  const [playerModal, setPlayerModal] = useState(null);  // { src, title }
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamingId, setStreamingId] = useState(null);  // id of clip being extracted
  const [squad, setSquad]           = useState(null);
  const [matchSummary, setMatchSummary] = useState(null);
  const matchRef = useRef(matchData);
  useEffect(() => { matchRef.current = matchData; }, [matchData]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      let json = null;
      try {
        const m = matchRef.current;
        const r = await fetch(`${API_BASE}/api/bcci/match?competitionID=${m.CompetitionID}&matchID=${m.MatchID}&matchOrder=${bcciSlugify(m.MatchOrder)}&seriesName=${bcciSlugify(m.CompetitionName)}`);
        if (r.ok) json = await r.json();
      } catch {}
      if (!json) {
        const r = await fetch(bcciBuildScoreUrl(matchRef.current));
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        json = await r.json();
      }
      setSc(json); setLastUpdate(new Date()); setCountdown(30); setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000); return () => clearInterval(t); }, [lastUpdate]);

  const rawMd = sc?.postMatch?.[0] || sc?.liveMatch?.[0] || sc?.upcomingMatch?.[0] || matchData;
  const isLive     = rawMd?.MatchStatus === "Live" || sc?.matchStatus === "live";
  const isFinished = !isLive && (rawMd?.WinningTeamID || rawMd?.MatchStatus === "Result" || rawMd?.MatchStatus === "Post" || sc?.matchStatus === "post" || !!rawMd?.Comments);
  const fmt        = bcciFmt(rawMd?.MatchType || matchData.MatchType);
  const curInn     = String(rawMd?.CurrentInnings || "1");

  const firstBatCode  = rawMd?.FirstBattingTeamCode  || "";
  const secondBatCode = rawMd?.SecondBattingTeamCode || "";
  const firstBatId    = String(rawMd?.FirstBattingTeamID  || "1");
  const secondBatId   = String(rawMd?.SecondBattingTeamID || "2");
  const homeId = String(rawMd?.HomeTeamID || "");
  const awayId = String(rawMd?.AwayTeamID || "");

  function teamLogo(id) {
    if (String(id) === homeId) return rawMd?.MatchHomeTeamLogo || rawMd?.HomeTeamLogo || null;
    if (String(id) === awayId) return rawMd?.MatchAwayTeamLogo || rawMd?.AwayTeamLogo || null;
    return null;
  }

  const firstTeamMeta  = getIccTeam(firstBatCode);
  const secondTeamMeta = getIccTeam(secondBatCode);

  const inn1Score = rawMd?.["1FallScore"] ? { score: `${rawMd["1FallScore"]}/${rawMd["1FallWickets"]}`, overs: `${rawMd["1FallOvers"]} ov` } : null;
  const inn2Score = rawMd?.["2FallScore"] ? { score: `${rawMd["2FallScore"]}/${rawMd["2FallWickets"]}`, overs: `${rawMd["2FallOvers"]} ov` } : null;
  const matchOvers    = rawMd?.MATCH_NO_OF_OVERS || "50";
  const tossText      = rawMd?.TossDetails || rawMd?.TossText || "";
  const chasingText   = rawMd?.ChasingText || "";
  const resultComment = (rawMd?.Comments || rawMd?.Commentss || "").trim();
  const mom     = rawMd?.MOM || "";
  const momRuns = rawMd?.MOMRuns || "";
  const momWkts = rawMd?.MOMWicket || "";
  const momImg  = rawMd?.MOMImage || "";
  // Kept as a fallback only: getMatchCenterDetails stopped returning a body, so
  // in practice this is empty and the scoring feed below is what renders.
  const scorecardInn  = sc?.scorecardData?.innings || sc?.innings || [];

  const isTestMatch = /test/i.test(rawMd?.MatchType || matchData.MatchType || "");
  const { innings: feedInnings, error: inningsError } =
    useInnings("bcci", matchData?.MatchID, isTestMatch);

  // Default to the innings being played, and follow it when a new one starts —
  // but never override a reader who has picked one themselves.
  const [selInn, setSelInn] = useState(null);
  const touchedInn = useRef(false);
  useEffect(() => {
    if (touchedInn.current || !feedInnings?.length) return;
    setSelInn(feedInnings[feedInnings.length - 1].number);
  }, [feedInnings]);
  const pickInn = useCallback(n => { touchedInn.current = true; setSelInn(n); }, []);

  const activeInn = feedInnings?.find(i => i.number === selInn) || feedInnings?.[0] || null;

  useEffect(() => {
    onMatchState?.({ isLive: !!isLive, isFinished: !!isFinished, result: resultComment, mom, momRuns, momWickets: momWkts, momImg });
  }, [isLive, isFinished, resultComment, mom, momRuns, momWkts, momImg]);
  useEffect(() => {
    if (!isFinished) return;
    const smMatchId = rawMd?.SmMatchID || matchData?.SmMatchID || rawMd?.CompetitionID;
    let cancelled = false;
    (async () => {
      const h = await fetchIndiaHighlights(smMatchId);
      if (!cancelled) setHighlights(h);
    })();
    return () => { cancelled = true; };
  }, [isFinished, rawMd?.MatchID]);

  // Fetch squad data for this match
  useEffect(() => {
    if (!matchData?.MatchID) return;
    let cancelled = false;
    (async () => {
      const s = await fetchBcciSquad(matchData.MatchID);
      if (!cancelled) setSquad(s);
    })();
    return () => { cancelled = true; };
  }, [matchData?.MatchID]);

  // Fetch match summary (post-match/pre-match commentary)
  useEffect(() => {
    if (!matchData?.MatchID) return;
    let cancelled = false;
    (async () => {
      const s = await fetchBcciMatchSummary(matchData.MatchID);
      if (!cancelled) setMatchSummary(s);
    })();
    return () => { cancelled = true; };
  }, [matchData?.MatchID]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(207,20,43,0.2)", borderTopColor: ECB_RED }} />
      <p className="text-xs text-white/30 font-semibold uppercase tracking-widest">Loading match data</p>
    </div>
  );

  /* build over strip balls for BCCI */
  function bcciOverBalls() {
    if (!rawMd?.ThisOverBalls) return [];
    return String(rawMd.ThisOverBalls).split(",").map(b => {
      const t = b.trim().toUpperCase();
      if (t === "W") return "W";
      if (t === "WD") return "WD";
      if (t.includes("NB")) return t;
      return t === "0" ? "·" : t;
    });
  }
  const overBalls = bcciOverBalls();
  const curRR = curInn === "1" ? rawMd?.["1RunRate"] : rawMd?.["2RunRate"];

  /* batting rows for scorecard */
  function buildBattingRows(batting) {
    return (batting || []).map(b => ({
      name: b.PlayerName || b.BatsmanName || b.Name || "—",
      isNotOut: b.IsBatting || b.isNotOut || (b.OutDesc || "").toLowerCase() === "not out",
      dismissal: b.OutDesc || b.DismissalText || b.HowOut || "—",
      runs: b.Runs, balls: b.Balls, fours: b.Fours, sixes: b.Sixes, sr: b.StrikeRate,
    }));
  }
  function buildBowlingRows(bowling) {
    return (bowling || []).map(b => ({
      name: b.PlayerName || b.BowlerName || b.Name || "—",
      isCurrent: b.IsBowling || b.isCurrentBowler || false,
      overs: b.Overs, maidens: b.Maidens, runs: b.Runs, wickets: b.Wickets, eco: b.Economy,
    }));
  }

  return (
    <div className="space-y-4">
      <EcbHero
        homeCode={firstBatCode}  homeName={rawMd?.FirstBattingTeamName  || matchData.HomeTeamName}
        homeLogo={teamLogo(firstBatId)}   homeFlag={firstTeamMeta.flag}
        awayCode={secondBatCode} awayName={rawMd?.SecondBattingTeamName || matchData.AwayTeamName}
        awayLogo={teamLogo(secondBatId)}  awayFlag={secondTeamMeta.flag}
        homeInnings={inn1Score ? [inn1Score] : []}
        awayInnings={inn2Score ? [inn2Score] : []}
        isLive={!!isLive} isFinished={!!isFinished}
        statusText={isLive ? (chasingText || "") : ""}
        tossText={tossText}
        seriesText={rawMd?.CompetitionName || matchData.CompetitionName}
        venueText={rawMd?.GroundName || matchData.GroundName}
        matchTypeText={`${fmt} · ${rawMd?.MatchOrder || matchData.MatchOrder} · ${matchOvers} ov`}
        countdown={countdown} refreshing={refreshing} onRefresh={() => load()}
      >

        
        {/* Live crease cards */}
        {isLive && rawMd?.CurrentStrikerName && (
          <EcbCreaseCards
            bowlerName={rawMd.CurrentBowlerName}
            bowlerFigures={`${rawMd.BowlerWickets}/${rawMd.BowlerRuns}`}
            bowlerEco={parseFloat(rawMd.BowlerEconomy || 0).toFixed(2)}
            bowlerOvers={rawMd.BowlerOvers}
            bowlerImg={rawMd.BowlerImage}
            strikerName={rawMd.CurrentStrikerName}
            strikerRuns={rawMd.StrikerRuns}
            strikerBalls={rawMd.StrikerBalls}
            strikerFours={rawMd.StrikerFours}
            strikerSixes={rawMd.StrikerSixes}
            strikerSR={rawMd.StrikerSR}
            strikerImg={rawMd.StrikerImage}
            nonStrikerName={rawMd.CurrentNonStrikerName}
            nonStrikerRuns={rawMd.NonStrikerRuns}
            nonStrikerBalls={rawMd.NonStrikerBalls}
            nonStrikerImg={rawMd.NonStrikerImage}
          />
        )}

        {/* Over strip */}
        {isLive && overBalls.length > 0 && (
          <EcbOverStrip balls={overBalls} bowlerName={rawMd?.CurrentBowlerName} />
        )}
{/* Result banner */}
{isFinished && <EcbResultBanner resultText={resultComment} mom={mom} momRuns={momRuns} momWkts={momWkts} momImg={momImg} />}

{/* ── BCCI Multi-Video Highlights (FIFA-style scrollable list) ── */}
{isFinished && highlights && highlights.length > 0 && (
  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
    {/* section header */}
    <div className="flex items-center justify-between px-5 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: ECB_RED }}>
        ▶ Match Videos · {highlights.length} clips
      </p>
    </div>
    {/* horizontal scrollable clip strip */}
    <div
      className="flex gap-3 px-5 pb-4 overflow-x-auto"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {highlights.map(vid => {
        const isLoading = streamingId === vid.id && streamLoading;
        const watchUrl  = vid.shortCode
          ? `https://www.bcci.tv/bccilink/videos/${vid.shortCode}`
          : vid.urlSegment
          ? `https://www.bcci.tv/videos/${vid.urlSegment}`
          : null;
        const fmtDur = d => {
          if (!d) return "";
          const m = Math.floor(d / 60), s = d % 60;
          return `${m}:${String(s).padStart(2,"0")}`;
        };
        return (
          <button
            key={vid.id}
            disabled={streamLoading}
            onClick={async () => {
              if (!watchUrl || streamLoading) return;
              setStreamingId(vid.id);
              setStreamLoading(true);
              try {
                const res = await fetch(
                  `${API_BASE}/api/get-stream?url=${encodeURIComponent(watchUrl)}`
                );
                const json = await res.json();
                if (res.ok && json.success && json.url) {
                  const params = new URLSearchParams({ url: json.url, title: vid.title });
                  setPlayerModal({ src: `/player.html?${params}`, title: vid.title });
                  setStreamLoading(false);
                  setStreamingId(null);
                  return;
                }
              } catch {}
              setStreamLoading(false);
              setStreamingId(null);
              if (watchUrl) window.open(watchUrl, "_blank", "noopener,noreferrer");
            }}
            className="shrink-0 flex flex-col rounded-xl overflow-hidden text-left transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{
              width: 160,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${ isLoading ? ECB_RED : "rgba(255,255,255,0.09)"}`,
              boxShadow: isLoading ? `0 0 12px ${ECB_RED}44` : "none",
              transition: "border 0.2s, box-shadow 0.2s, transform 0.15s",
            }}
          >
            {/* thumbnail */}
            <div className="relative w-full" style={{ height: 90 }}>
              {vid.thumbnail ? (
                <img src={vid.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5" />
              )}
              {/* dark overlay + play/spinner */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                {isLoading ? (
                  <div
                    className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: `${ECB_RED}40`, borderTopColor: ECB_RED }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 30, height: 30,
                      background: "rgba(0,0,0,0.55)",
                      border: `1.5px solid rgba(255,255,255,0.35)`,
                    }}
                  >
                    <PlayCircle size={16} className="text-white" />
                  </div>
                )}
              </div>
              {/* duration badge */}
              {vid.duration > 0 && (
                <span
                  className="absolute bottom-1.5 right-1.5 text-[9px] font-black text-white px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.72)" }}
                >
                  {fmtDur(vid.duration)}
                </span>
              )}
            </div>
            {/* meta */}
            <div className="px-2.5 py-2 flex flex-col gap-0.5">
              <p className="text-[10px] font-bold text-white leading-snug line-clamp-2" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {vid.title}
              </p>
              {vid.views > 0 && (
                <p className="text-[8px] text-white/30 font-medium">
                  {(vid.views / 1000).toFixed(0)}K views
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </div>
)}

{/* Fullscreen player modal */}
{playerModal && (
  <div
    style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.96)",
      display: "flex", flexDirection: "column",
    }}
  >
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px", background: "rgba(0,0,0,0.7)", flexShrink: 0,
    }}>
      <span style={{ color: ECB_RED, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em" }}>
        ▶ {playerModal.title}
      </span>
      <button
        onClick={() => setPlayerModal(null)}
        style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", borderRadius: 8, width: 32, height: 32,
          cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >×</button>
    </div>
    <iframe
      src={playerModal.src}
      style={{ flex: 1, width: "100%", border: "none" }}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
    />
  </div>
)}

{/* Upcoming */}
{!isLive && !isFinished && !inn1Score && (
          <div className="px-5 py-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[9px] font-black text-white/25 uppercase tracking-widest">Match starts</p>
            <p className="text-xl font-black text-white mt-1">{bcciFmtDate(rawMd?.MatchDate || matchData.MatchDate)}</p>
            <p className="text-[11px] text-white/35 mt-0.5">{rawMd?.CustomMatchTime || rawMd?.MatchTime || matchData.MatchTime} IST</p>
          </div>
        )}
      </EcbHero>

      {/* Tabs */}
      <EcbScorecardCard>
        <EcbTabBar
          tabs={[
            { k: "overview",   l: "Overview"     },
            { k: "scorecard",  l: "Scorecard"    },
            { k: "bowling",    l: "Bowling"      },
            { k: "ballbyball", l: "Ball by Ball" },
            { k: "squads",     l: "Squads"       },
            { k: "summary",    l: "Summary"      },
          ]}
          active={tab} onChange={setTab} accent={ECB_RED}
        />

        {tab === "overview" && (
          <div>
            <EcbStatRow label="Format"   value={fmt} />
            <EcbStatRow label="Match"    value={rawMd?.MatchOrder || matchData.MatchOrder} />
            <EcbStatRow label="Venue"    value={`${rawMd?.GroundName || matchData.GroundName}`} />
            {tossText && <EcbStatRow label="Toss" value={tossText} />}
            <EcbStatRow label="Overs"    value={matchOvers} />
            {inn1Score && <EcbStatRow label={`${firstBatCode} — 1st Inn`}  value={inn1Score.score}  sub={inn1Score.overs} />}
            {inn2Score && <EcbStatRow label={`${secondBatCode} — 2nd Inn`} value={inn2Score.score} sub={inn2Score.overs} />}
            {isLive && curRR && parseFloat(curRR) > 0 && <EcbStatRow label="Current RR" value={parseFloat(curRR).toFixed(2)} color="#4ade80" />}
            <EcbStatRow label="Date"     value={bcciFmtDate(rawMd?.MatchDate || matchData.MatchDate)} />
            {lastUpdate && <EcbStatRow label="Updated" value={lastUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST"} />}
          </div>
        )}

        {tab === "scorecard" && (
          <div>
            <InningsSelector innings={feedInnings} active={selInn} onChange={pickInn} />
            {(() => {
              // A batting card lists the whole XI, including players who never
              // came in — showing eleven rows where five batted reads as a bug.
              const card = activeInn?.BattingCard
                || scorecardInn[(selInn || 1) - 1]?.batting
                || scorecardInn[(selInn || 1) - 1]?.BattingCard;
              const rows = buildBattingRows(
                (card || []).filter(b => b.PlayingOrder != null || Number(b.Balls) > 0),
              );
              if (!rows.length) {
                return <p className="text-center text-white/20 text-xs py-10">
                  {feedInnings === null ? "Loading scorecard…"
                    : inningsError ? "Scorecard unavailable" : "No innings played yet"}
                </p>;
              }
              const ex = activeInn?.Extras?.[0] || {};
              const fow = activeInn?.FallOfWickets || [];
              return (
                <>
                  <EcbSectionHeader label={`${ex.BattingTeamName || `Innings ${selInn}`} · Batting`} />
                  <EcbBattingTable rows={rows} />
                  {ex.TotalExtras !== undefined && (
                    <EcbStatRow
                      label="Extras"
                      value={ex.TotalExtras}
                      sub={`b ${ex.Byes || 0} · lb ${ex.LegByes || 0} · w ${ex.Wides || 0} · nb ${ex.NoBalls || 0}`}
                    />
                  )}
                  {ex.Total && <EcbStatRow label="Total" value={ex.Total} sub={ex.CurrentRunRate ? `RR ${ex.CurrentRunRate}` : undefined} />}
                  {fow.length > 0 && (
                    <>
                      <EcbSectionHeader label="Fall of wickets" />
                      <div className="px-5 py-3.5 flex flex-wrap gap-x-4 gap-y-1.5">
                        {fow.map((w, i) => (
                          <span key={i} className="text-[11px] text-white/40">
                            <span className="font-mono font-black text-white/70">{w.Score}</span> {w.PlayerName}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {tab === "bowling" && (
          <div>
            <InningsSelector innings={feedInnings} active={selInn} onChange={pickInn} />
            {(() => {
              const card = activeInn?.BowlingCard
                || scorecardInn[(selInn || 1) - 1]?.bowling
                || scorecardInn[(selInn || 1) - 1]?.BowlingCard;
              // Bowling cards carry the full fielding side; drop anyone who
              // hasn't bowled a ball.
              const rows = buildBowlingRows(
                (card || []).filter(b => Number(b.TotalLegalBallsBowled) > 0 || parseFloat(b.Overs) > 0),
              );
              if (!rows.length) {
                return <p className="text-center text-white/20 text-xs py-10">
                  {feedInnings === null ? "Loading bowling…"
                    : inningsError ? "Bowling data unavailable" : "No overs bowled yet"}
                </p>;
              }
              const ex = activeInn?.Extras?.[0] || {};
              return (
                <>
                  <EcbSectionHeader label={`${ex.BowlingTeamName || `Innings ${selInn}`} · Bowling`} />
                  <EcbBowlingTable rows={rows} />
                </>
              );
            })()}
          </div>
        )}

        {tab === "ballbyball" && (
          <div>
            <InningsSelector innings={feedInnings} active={selInn} onChange={pickInn} />
            {feedInnings === null
              ? <p className="text-center text-white/20 text-xs py-10">Loading…</p>
              : selInn
                ? <BallByBall type="bcci" matchId={matchData.MatchID} inning={selInn} />
                : <p className="text-center text-white/20 text-xs py-10">No deliveries bowled yet</p>}
          </div>
        )}

        {tab === "squads" && (
          squad
            ? (
              <div>
                {/* Team A squad */}
                {(squad.squadA?.length > 0 || squad.squadB?.length > 0) ? (
                  <>
                    {squad.squadA?.length > 0 && (
                      <SquadPanel
                        players={squad.squadA}
                        teamName={squad.squadA[0]?.TeamName || "Team A"}
                        teamCode={squad.squadA[0]?.TeamCode || ""}
                        teamLogo={squad.squadA[0]?.TeamImage || null}
                      />
                    )}
                    {/* Divider between teams */}
                    {squad.squadA?.length > 0 && squad.squadB?.length > 0 && (
                      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />
                    )}
                    {squad.squadB?.length > 0 && (
                      <SquadPanel
                        players={squad.squadB}
                        teamName={squad.squadB[0]?.TeamName || "Team B"}
                        teamCode={squad.squadB[0]?.TeamCode || ""}
                        teamLogo={squad.squadB[0]?.TeamImage || null}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-center text-white/20 text-xs py-10">Squad data unavailable</p>
                )}
              </div>
            )
            : <p className="text-center text-white/20 text-xs py-10">Loading squad…</p>
        )}

        {tab === "summary" && (
          <MatchSummaryPanel summary={matchSummary} isFinished={!!isFinished} />
        )}
      </EcbScorecardCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WT20 MATCH CENTER — ECB style
═══════════════════════════════════════════════════════════════════════════ */
function Wt20MatchCenter({ matchId, onMatchState }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown]   = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
  const idRef = useRef(matchId);
  useEffect(() => { idRef.current = matchId; }, [matchId]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const r = await fetch(`${API_BASE}/api/wt20/scorecard?game_id=${idRef.current}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j.data || j); setLastUpdate(new Date()); setCountdown(30); setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000); return () => clearInterval(t); }, [lastUpdate]);

  const md       = data?.Matchdetail || {};
  const series   = md.Series || {};
  const venue    = md.Venue  || {};
  const teams    = data?.Teams   || {};
  const innings  = data?.Innings || [];
  const isLive   = md.Match?.Live === true;
  const isComplete = !isLive && innings.some(i => i.Total);

  useEffect(() => {
    if (!data) return;
    onMatchState?.({ isLive: !!isLive, isFinished: !!isComplete, result: md.Status || "", mom: "", momRuns: "", momWickets: "", momImg: "" });
  }, [isLive, isComplete, md.Status, data]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(207,20,43,0.2)", borderTopColor: ECB_RED }} />
      <p className="text-xs text-white/30 font-semibold uppercase tracking-widest">Loading match data</p>
    </div>
  );
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
      <AlertCircle size={28} className="text-red-500/50" />
      <p className="text-sm text-white/35">{error || "No data"}</p>
      <button onClick={() => load()} className="px-5 py-2.5 rounded-xl border text-sm font-semibold text-white/50" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Try again</button>
    </div>
  );

  const homeId   = md.Team_Home;  const awayId   = md.Team_Away;
  const homeTeam = teams[homeId]; const awayTeam = teams[awayId];
  const tossWon  = teams[md.Tosswonby];

  function innScore(team) {
    const inn = innings.find(i => String(i.Battingteam) === String(team));
    if (!inn || inn.Total === undefined || inn.Total === "") return [];
    return [{ score: `${inn.Total}/${inn.Wickets}`, overs: `${inn.Overs}/${inn.AllottedOvers || 20} ov` }];
  }

  const currentInn = innings[0];
  const curBatId   = currentInn ? String(currentInn.Battingteam)  : null;
  const curBowlId  = currentInn ? String(currentInn.Bowlingteam)  : null;
  const onCrease   = (currentInn?.Batsmen || []).filter(b => b.Isbatting || b.Howout === "Batting");
  const striker    = onCrease.find(b => b.Isonstrike) || onCrease[0];
  const nonStriker = onCrease.find(b => !b.Isonstrike);
  const curBowler  = currentInn?.Bowlers?.find(b => b.Isbowlingnow);
  const thisOver   = curBowler?.ThisOver || [];

  function wt20pName(teamId, playerId, short = true) {
    const p = teams?.[teamId]?.Players?.[playerId];
    if (!p) return `#${playerId}`;
    return short ? (p.Name_Short || p.Name_Full) : (p.Name_Full || p.Name_Short);
  }

  /* build batting rows */
  function buildBatRows(inn) {
    const batted = (inn?.Batsmen || []).filter(b => b.Balls !== "" && b.Balls !== undefined);
    const btId = String(inn?.Battingteam);
    const blId = String(inn?.Bowlingteam);
    return batted.map(b => {
      const isBatting = b.Howout === "Batting";
      const bowlerN   = b.Bowler ? wt20pName(blId, b.Bowler) : "";
      return {
        name: wt20pName(btId, b.Batsman),
        isNotOut: isBatting,
        dismissal: isBatting ? "not out" : `${b.Howout_short || b.Howout || "—"}${bowlerN ? ` b ${bowlerN}` : ""}`,
        runs: b.Runs, balls: b.Balls, fours: b.Fours, sixes: b.Sixes, sr: parseFloat(b.Strikerate || 0).toFixed(1),
      };
    });
  }
  function buildBowlRows(inn) {
    return (inn?.Bowlers || []).filter(b => Number(b.Balls_Bowled) > 0).map(b => ({
      name: wt20pName(String(inn?.Bowlingteam), b.Bowler),
      isCurrent: !!b.Isbowlingnow,
      overs: b.Overs, maidens: b.Maidens, runs: b.Runs, wickets: b.Wickets, eco: parseFloat(b.Economyrate || 0).toFixed(2),
    }));
  }

  return (
    <div className="space-y-4">
      <EcbHero
        homeCode={homeTeam?.Name_Short || ""} homeName={homeTeam?.Name_Full} homeLogo={null} homeFlag={getIccTeam(homeTeam?.Name_Short).flag}
        awayCode={awayTeam?.Name_Short || ""} awayName={awayTeam?.Name_Full} awayLogo={null} awayFlag={getIccTeam(awayTeam?.Name_Short).flag}
        homeInnings={innScore(homeId)} awayInnings={innScore(awayId)}
        isLive={isLive} isFinished={isComplete}
        statusText={md.Status || ""}
        tossText={tossWon ? `${tossWon.Name_Short} elected to ${md.Toss_elected_to}` : ""}
        seriesText={series.Series_short_display_name || "ICC WT20 WC 2026"}
        venueText={venue.Name || ""}
        matchTypeText="T20I"
        countdown={countdown} refreshing={refreshing} onRefresh={() => load()}
      >
        {/* Live crease cards */}
        {isLive && striker && (
          <EcbCreaseCards
            bowlerName={curBowler ? wt20pName(curBowlId, curBowler.Bowler, false) : null}
            bowlerFigures={curBowler ? `${curBowler.Wickets}/${curBowler.Runs}` : ""}
            bowlerEco={curBowler ? parseFloat(curBowler.Economyrate || 0).toFixed(2) : ""}
            bowlerOvers={curBowler?.Overs}
            strikerName={wt20pName(curBatId, striker.Batsman, false)}
            strikerRuns={striker.Runs}
            strikerBalls={striker.Balls}
            strikerFours={striker.Fours}
            strikerSixes={striker.Sixes}
            strikerSR={striker.Strikerate}
            nonStrikerName={nonStriker ? wt20pName(curBatId, nonStriker.Batsman, false) : null}
            nonStrikerRuns={nonStriker?.Runs}
            nonStrikerBalls={nonStriker?.Balls}
          />
        )}

        {/* Over strip */}
        {isLive && thisOver.length > 0 && (
          <EcbOverStrip
            balls={thisOver.map(ball => {
              const runs = String(ball.B ?? ""); const type = String(ball.T ?? "").toLowerCase();
              if (type === "wk" || type === "w") return "W";
              if (type === "wd") return "WD";
              if (type === "nb") return `${runs}nb`;
              return runs === "0" ? "·" : runs;
            })}
            bowlerName={curBowler ? wt20pName(curBowlId, curBowler.Bowler) : ""}
          />
        )}

        {/* Result */}
        {isComplete && md.Status && <EcbResultBanner resultText={md.Status} />}
      </EcbHero>

      <EcbScorecardCard>
        <EcbTabBar
          tabs={[
            { k: "overview",  l: "Overview"  },
            { k: "scorecard", l: "Scorecard" },
            { k: "bowling",   l: "Bowling"   },
          ]}
          active={tab} onChange={setTab} accent={ECB_RED}
        />

        {tab === "overview" && (
          <div>
            <EcbStatRow label="Series"  value={series.Series_short_display_name || "ICC WT20 WC 2026"} />
            <EcbStatRow label="Venue"   value={venue.Name || "—"} />
            {tossWon && <EcbStatRow label="Toss" value={`${tossWon.Name_Short} elected to ${md.Toss_elected_to}`} />}
            {innings[0]?.Total !== undefined && <EcbStatRow label={`${teams[innings[0].Battingteam]?.Name_Short} — 1st Inn`} value={`${innings[0].Total}/${innings[0].Wickets}`} sub={`${innings[0].Overs} overs`} />}
            {innings[1]?.Total !== undefined && <EcbStatRow label={`${teams[innings[1].Battingteam]?.Name_Short} — 2nd Inn`} value={`${innings[1].Total}/${innings[1].Wickets}`} sub={`${innings[1].Overs} overs`} />}
            {innings[0]?.Runrate && <EcbStatRow label="Run Rate" value={parseFloat(innings[0].Runrate).toFixed(2)} color="#4ade80" />}
            {lastUpdate && <EcbStatRow label="Updated" value={lastUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST"} />}
          </div>
        )}

        {tab === "scorecard" && innings.map((inn, idx) => {
          const rows = buildBatRows(inn);
          if (!rows.length) return null;
          return (
            <div key={idx}>
              <EcbSectionHeader label={`Innings ${idx + 1} · ${teams[inn.Battingteam]?.Name_Short || "—"} Batting`} />
              <EcbBattingTable rows={rows} />
            </div>
          );
        })}

        {tab === "bowling" && innings.map((inn, idx) => {
          const rows = buildBowlRows(inn);
          if (!rows.length) return null;
          return (
            <div key={idx}>
              <EcbSectionHeader label={`Innings ${idx + 1} · ${teams[inn.Bowlingteam]?.Name_Short || "—"} Bowling`} />
              <EcbBowlingTable rows={rows} />
            </div>
          );
        })}
      </EcbScorecardCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FIFA MATCH CENTER — ECB style
═══════════════════════════════════════════════════════════════════════════ */
function FifaMatchCenter({ matchId, onMatchState }) {
  const [match, setMatch]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown]   = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [highlight, setHighlight]   = useState(null);
  const [playerModal, setPlayerModal] = useState(null); // { src, title } when open
  const [streamLoading, setStreamLoading] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const r = await fetch(`${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`FIFA API ${r.status}`);
      const j = await r.json();
      const found = (j.Results || []).find(m => m.IdMatch === matchId);
      if (!found) throw new Error("Match not found");
      setMatch(found); setLastUpdate(new Date()); setCountdown(30); setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [matchId]);

  useEffect(() => { load(); const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000); return () => clearInterval(t); }, [lastUpdate]);

  useEffect(() => {
    if (!match) return;
    const status = getFifaStatus(match || {});
    const isLive = status === "live";
    const isDone = status === "finished";
    const hName  = fifaTeamName(match.Home);
    const aName  = fifaTeamName(match.Away);
    const hWon   = isDone && match.HomeTeamScore > match.AwayTeamScore;
    const aWon   = isDone && match.AwayTeamScore > match.HomeTeamScore;
    const resultStr = isDone ? (hWon ? `${match.Home?.Abbreviation || hName} win` : aWon ? `${match.Away?.Abbreviation || aName} win` : "Draw") : "";
    onMatchState?.({ isLive, isFinished: isDone, result: resultStr, mom: "", momRuns: "", momWickets: "", momImg: "" });
  }, [match]);

   useEffect(() => {
    if (!match) return;
    if (getFifaStatus(match) !== "finished") return;
    console.log("[fifa highlight debug] match object:", match); // inspect once for a stage-id field
    const stageId = match.IdStage || FIFA_STAGE; // adjust key once confirmed from the log above
    let cancelled = false;
    (async () => {
      const h = await fetchFifaHighlight(match.IdMatch, stageId);
      if (!cancelled) setHighlight(h);
    })();
    return () => { cancelled = true; };
  }, [match]);

  const FIFA_GREEN = "#34d399";

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(52,211,153,0.2)", borderTopColor: FIFA_GREEN }} />
      <p className="text-xs text-white/30 font-semibold uppercase tracking-widest">Loading match data</p>
    </div>
  );
  if (error || !match) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
      <AlertCircle size={28} className="text-red-500/50" />
      <p className="text-sm text-white/35">{error || "Match not found"}</p>
      <button onClick={() => load()} className="px-5 py-2.5 rounded-xl border text-sm font-semibold text-white/50" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Try again</button>
    </div>
  );

  const status   = getFifaStatus(match);
  const isLive   = status === "live";
  const isDone   = status === "finished";
  const isUp     = status === "upcoming";
  const hTeam    = match.Home; const aTeam = match.Away;
  const hName    = fifaTeamName(hTeam); const aName = fifaTeamName(aTeam);
  const hScore   = match.HomeTeamScore; const aScore = match.AwayTeamScore;
  const hWon     = isDone && hScore > aScore;
  const aWon     = isDone && aScore > hScore;
  const isDraw   = isDone && hScore === aScore;
  const group    = fifaGroupName(match);
  const city     = fifaCity(match);
  const stadium  = fifaStadium(match);

  /* For the FIFA hero, scores show as "2" or "2 : 1" */
  const homeScore = (!isUp && hScore !== null && hScore !== undefined)
    ? [{ score: String(hScore), overs: hWon ? "WIN" : isDraw ? "DRAW" : "" }]
    : [];
  const awayScore = (!isUp && aScore !== null && aScore !== undefined)
    ? [{ score: String(aScore), overs: aWon ? "WIN" : isDraw ? "DRAW" : "" }]
    : [];

  const resultStr = isDone ? (hWon ? `${hTeam?.Abbreviation || hName} win` : aWon ? `${aTeam?.Abbreviation || aName} win` : "Draw") : "";

  return (
    <div className="space-y-4">
      <EcbHero
        homeCode={hTeam?.Abbreviation || hName.slice(0, 3).toUpperCase()}
        homeName={hName}
        homeLogo={getFifaFlagUrl(hTeam?.IdCountry)}
        homeFlag={null}
        awayCode={aTeam?.Abbreviation || aName.slice(0, 3).toUpperCase()}
        awayName={aName}
        awayLogo={getFifaFlagUrl(aTeam?.IdCountry)}
        awayFlag={null}
        homeInnings={homeScore}
        awayInnings={awayScore}
        isLive={isLive} isFinished={isDone}
        statusText={isLive ? `${match.MatchTime || "Live"}` : isUp ? `Kickoff ${fmtIST(match.Date)} IST` : ""}
        seriesText="FIFA World Cup 2026™"
        venueText={city ? `${city}${stadium ? ` · ${stadium}` : ""}` : ""}
        matchTypeText={group ? `${group} · #${match.MatchNumber || ""}` : `#${match.MatchNumber || ""}`}
        countdown={countdown} refreshing={refreshing} onRefresh={() => load()}
        accentColor={FIFA_GREEN}
      >
        {/* Result banner */}
        {isDone && <EcbResultBanner resultText={resultStr} />}

        {/* Highlights — click to scrape m3u8 → show fullscreen player modal */}
        {isDone && (
          <EcbHighlightCard
            highlight={highlight}
            accent={FIFA_GREEN}
            onOpen={async () => {
              if (!highlight?.watchPath) return;
              if (streamLoading) return;
              const watchUrl = `https://www.fifa.com${highlight.watchPath}`;
              const title = `${hTeam?.Abbreviation || hName} vs ${aTeam?.Abbreviation || aName} · FIFA WC 2026`;
              setStreamLoading(true);
              try {
                const res = await fetch(
                  `${API_BASE}/api/get-stream?url=${encodeURIComponent(watchUrl)}`
                );
                const json = await res.json();
                if (res.ok && json.success && json.url) {
                  const params = new URLSearchParams({ url: json.url, title });
                  setPlayerModal({ src: `/player.html?${params}`, title });
                  setStreamLoading(false);
                  return;
                }
              } catch {}
              setStreamLoading(false);
              // Fallback: open FIFA watch page directly
              window.open(watchUrl, "_blank", "noopener,noreferrer");
            }}
            loading={streamLoading}
          />
        )}

        {/* Fullscreen player modal */}
        {playerModal && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.96)",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Top bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", background: "rgba(0,0,0,0.7)", flexShrink: 0,
            }}>
              <span style={{ color: FIFA_GREEN, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                ▶ {playerModal.title}
              </span>
              <button
                onClick={() => setPlayerModal(null)}
                style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", borderRadius: 8, width: 32, height: 32,
                  cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >×</button>
            </div>
            {/* Player iframe fills the rest */}
            <iframe
              src={playerModal.src}
              style={{ flex: 1, width: "100%", border: "none" }}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Upcoming */}
        {isUp && (
          <div className="px-5 py-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[9px] font-black text-white/25 uppercase tracking-widest">Kickoff</p>
            <p className="text-xl font-black text-white mt-1">{fmtDateIST(match.Date)}</p>
            <p className="text-[11px] text-white/35 mt-0.5">{fmtIST(match.Date)} IST</p>
          </div>
        )}
      </EcbHero>

      {/* Match details card */}
      <EcbScorecardCard>
        <EcbTabBar tabs={[{ k: "info", l: "Match Info" }]} active="info" onChange={() => {}} accent={FIFA_GREEN} />
        <div>
          <EcbStatRow label="Competition" value="FIFA World Cup 2026" />
          {group && <EcbStatRow label="Group" value={group} />}
          {match.MatchNumber && <EcbStatRow label="Match" value={`#${match.MatchNumber}`} />}
          <EcbStatRow label="City" value={city || "—"} />
          {stadium && <EcbStatRow label="Stadium" value={stadium} />}
          <EcbStatRow label="Date" value={fmtDateIST(match.Date)} />
          <EcbStatRow label="Kickoff (IST)" value={fmtIST(match.Date)} />
          {hScore !== null && hScore !== undefined && <EcbStatRow label={hTeam?.Abbreviation || hName} value={`${hScore} goal${hScore !== 1 ? "s" : ""}`} color={hWon ? "#4ade80" : undefined} />}
          {aScore !== null && aScore !== undefined && <EcbStatRow label={aTeam?.Abbreviation || aName} value={`${aScore} goal${aScore !== 1 ? "s" : ""}`} color={aWon ? "#4ade80" : undefined} />}
          <EcbStatRow label="Status" value={isLive ? "Live" : isDone ? "Full Time" : "Upcoming"} color={isLive ? "#ef4444" : isDone ? "#4ade80" : undefined} />
          {lastUpdate && <EcbStatRow label="Updated" value={lastUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST"} />}
        </div>
      </EcbScorecardCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function MatchCenter() {
  // Two ways in. /match/:slug is the readable, stable URL — the one in the
  // sitemap and the one a person or Google sees. /match-center/:hash is the old
  // base64 link, kept working so anything already shared still opens.
  const { hash, slug } = useParams();
  const navigate  = useNavigate();

  const [resolved,      setResolved]      = useState(null);
  const [resolveError,  setResolveError]  = useState(false);
  const [canonicalSlug, setCanonicalSlug] = useState(slug || null);
  const payload = hash ? decodeMatchHash(hash) : resolved;

  // A hash link and its slug are the same match, so point the hash at the slug
  // as canonical — otherwise Google sees two URLs for one fixture and splits
  // whatever ranking either earns.
  useEffect(() => {
    if (slug) { setCanonicalSlug(slug); return; }
    const p = hash ? decodeMatchHash(hash) : null;
    if (!p?.type || !p?.matchId) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/match-resolve?type=${encodeURIComponent(p.type)}&id=${encodeURIComponent(p.matchId)}`)
      .then(r => r.json())
      .then(j => { if (!cancelled && j?.ok && j.slug) setCanonicalSlug(j.slug); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [hash, slug]);

  // A slug carries only the id, so the fixture has to be looked up.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setResolved(null); setResolveError(false);
    fetch(`${API_BASE}/api/match-resolve?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        if (j?.ok && j.payload) setResolved(j.payload);
        else setResolveError(true);
      })
      .catch(() => { if (!cancelled) setResolveError(true); });
    return () => { cancelled = true; };
  }, [slug]);

  const [matchState, setMatchState] = useState({
    isLive: false, isFinished: false,
    result: "", mom: "", momRuns: "", momWickets: "", momImg: "",
  });

  const isFootball = payload?.sport === "football";
  const isWt20     = payload?.type  === "wt20";
  const accent     = isFootball ? "#34d399" : isWt20 ? ECB_RED : ECB_RED;
  const sportLabel = isFootball ? "⚽ FIFA WC 2026" : isWt20 ? "♀ ICC WT20 WC 2026" : "🏏 India Cricket";
  const ambientBg  = isFootball
    ? "radial-gradient(ellipse 50% 28% at 50% 0%,rgba(52,211,153,0.1) 0%,transparent 50%)"
    : "radial-gradient(ellipse 50% 28% at 50% 0%,rgba(0,27,78,0.5) 0%,transparent 50%)";

  // A slug still being looked up isn't a broken link — don't flash an error at
  // the reader, or hand a crawler one while the fixture is still loading.
  if (slug && !payload && !resolveError) return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
      <p className="text-sm text-gray-500">Loading match…</p>
    </div>
  );

  if (!payload) return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertCircle size={32} className="text-red-500/40" />
      <p className="text-base text-gray-500">Invalid match link</p>
      <Link to="/" className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">Back to Home</Link>
    </div>
  );

  // Scores and fixtures are facts, and this is the page people search for by
  // team name — but it inherits index.html's site-wide title without this, so it
  // tells Google it's a movie download page.
  // Prefer the slug URL everywhere Google reads a URL; fall back to whatever
  // route we're actually on until the slug resolves.
  const canonicalPath = canonicalSlug ? `/match/${canonicalSlug}` : `/match-center/${hash}`;
  const matchTitle = `${payload.homeCode} vs ${payload.awayCode}`;
  const league     = payload.leagueLabel || (isFootball ? 'FIFA World Cup 2026' : 'Cricket');
  const seoTitle   = `${matchTitle} — Live Score, Scorecard & Result | ${league}`;
  const seoDesc    = `${matchTitle} live score and full scorecard for ${league}. Ball-by-ball updates, innings breakdown, squads and match result.`;

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans overflow-x-hidden">
      <Helmet prioritizeSeoTags>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={absUrl(canonicalPath)} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url" content={absUrl(canonicalPath)} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{jsonLd({
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: `${matchTitle} — ${league}`,
          description: seoDesc,
          url: absUrl(canonicalPath),
          sport: isFootball ? 'Football' : 'Cricket',
          eventStatus: matchState.isLive
            ? 'https://schema.org/EventScheduled'
            : 'https://schema.org/EventScheduled',
          competitor: [
            { '@type': 'SportsTeam', name: payload.homeCode },
            { '@type': 'SportsTeam', name: payload.awayCode },
          ],
        })}</script>
      </Helmet>

      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: ambientBg }} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "rgba(5,8,16,0.88)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/35 hover:text-white transition-colors shrink-0">
            <ArrowLeft size={17} />
            <span className="text-sm font-semibold hidden sm:inline">Back</span>
          </button>
          <div className="flex flex-col items-center min-w-0">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em]">{sportLabel}</p>
            <p className="text-sm font-black text-white truncate max-w-[200px]">
              {payload.homeCode} <span style={{ color: accent }}>vs</span> {payload.awayCode}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full border shrink-0"
            style={{ color: accent, borderColor: `${accent}30`, background: `${accent}08` }}>
            <Signal size={9} />
            <span className="hidden sm:inline">Center</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-5 py-6 pb-28">
        {/* Page title */}
        <div className="mb-6">
          <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.3em] mb-1">{sportLabel}</p>
          <h1 className="font-black tracking-tight leading-none text-white" style={{ fontSize: "clamp(2rem,6vw,3.5rem)", letterSpacing: "-0.03em" }}>
            {payload.homeCode} <span style={{ color: accent }}>vs</span> {payload.awayCode}
          </h1>
          {payload.leagueLabel && <p className="text-sm text-white/35 mt-2">{payload.leagueLabel}</p>}
        </div>

        {/* Live stream / result popup */}
        {(matchState.isLive || matchState.isFinished) && (
          <div className="mb-6">
            <LiveChannelSwitcher
              sport={payload.sport}
              isLive={matchState.isLive}
              isFinished={matchState.isFinished}
              result={matchState.result}
              mom={matchState.mom}
              momRuns={matchState.momRuns}
              momWickets={matchState.momWickets}
              momImg={matchState.momImg}
            />
          </div>
        )}

        {/* Match centers */}
        {payload.sport === "cricket" && payload.type === "bcci" && payload.matchData && (
          <BcciMatchCenter matchData={payload.matchData} onMatchState={setMatchState} />
        )}
        {payload.sport === "cricket" && payload.type === "wt20" && payload.matchId && (
          <Wt20MatchCenter matchId={payload.matchId} onMatchState={setMatchState} />
        )}
        {payload.sport === "football" && payload.type === "fifa" && payload.matchId && (
          <FifaMatchCenter matchId={payload.matchId} onMatchState={setMatchState} />
        )}
      </main>
    </div>
  );
}
