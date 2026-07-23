import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Tv2, Trophy, ChevronRight, Activity, Clapperboard, Home, PlayCircle, CalendarDays } from "lucide-react";
import HeroSection from "./HeroSection";
import { absUrl, jsonLd } from "../utils/seo";

function encodeMatchHash(payload) {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}


const API_BASE      = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
const FIFA_API_BASE = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION = "17";
const FIFA_SEASON      = "285023";
const FIFA_STAGE       = "289273";
const WT20_SERIES_ID   = "12672";


 
// ─── BCCI HELPERS ─────────────────────────────────────────────────────────────
// Known non-senior-men's competition IDs:
// 238 = Women's internationals
// 357, 358 = Women U19
// 389, 390 = Women A / emerging
// 393 = India A / A-tour (not senior men's)
const BCCI_EXCLUDE_COMP_IDS = new Set([238, 357, 358, 389, 390, 393]);
function isIndiaMensMatch(m) {
  if (BCCI_EXCLUDE_COMP_IDS.has(Number(m.CompetitionID))) return false;
  // Safety-net: filter any match whose name contains women/junior/A-team keywords
  const name = (m.MatchName || "").toLowerCase();
  if (/women|\bw19\b|wu19|under.?19|\bwomen\b|\.a\b| a vs | vs a |india a\b/i.test(m.MatchName || "")) return false;
  return true;
}
function bcciFmt(type) {
  const MAP = { "One Day D/N":"ODI","One Day":"ODI","T20":"T20I","Test":"Test","Test D/N":"Test" };
  return MAP[type] || type || "MATCH";
}
function bcciFmtDate(s) {
  try { return new Date(s).toLocaleDateString("en-IN", { day:"numeric", month:"short", timeZone:"Asia/Kolkata" }); }
  catch { return s; }
}
// BCCI-style countdown badge: "4 HOURS TO GO" / "2 DAYS TO GO"
function countdownLabel(dateStr) {
  if (!dateStr) return "";
  const diffMs = new Date(dateStr) - new Date();
  if (diffMs <= 0) return "Starting soon";
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins} MIN${mins!==1?"S":""} TO GO`;
  const hrs = Math.round(diffMs / 3600000);
  if (hrs < 24) return `${hrs} HOUR${hrs!==1?"S":""} TO GO`;
  const days = Math.round(hrs / 24);
  return `${days} DAY${days!==1?"S":""} TO GO`;
}

// ─── INDIA HIGHLIGHTS ─────────────────────────────────────────────────────────
// Returns the FULL video list so we can show a FIFA-style multi-clip carousel.
// Each item includes short_code → used as /bccilink/videos/{short_code} for streaming.

async function fetchIndiaHighlights(smMatchId) {
  if (!smMatchId) return null;
  const k = `highlights_all_${smMatchId}`;
  const cached = getCached(k);
  if (cached !== undefined && cached !== null) return cached;

  try {
    const res = await fetch(`${API_BASE}/api/bcci/highlight?smMatchId=${smMatchId}`);
    if (!res.ok) {
      console.warn("[highlight] backend responded", res.status, "for smMatchId", smMatchId);
      return null;
    }
    const json = await res.json();
    const videos = json.data || [];

    if (!videos.length) {
      console.warn("[highlight] no videos returned for smMatchId", smMatchId);
      setCache(k, null);
      return null;
    }

    // Map every video — preserve short_code for stream extraction
    const mapped = videos.map(v => ({
      id:        v._id || v.id,
      title:     v.title || "Untitled",
      thumbnail: v.thumbnail_image || v.imageUrl || v.imageBackup || null,
      duration:  v.duration || 0,
      views:     v.views_count || v.views || 0,
      shortCode:  v.short_code || null,       // ← bccilink stream key
      urlSegment: v.titleUrlSegment || null,  // ← fallback
    }));

    setCache(k, mapped);
    return mapped;
  } catch (e) {
    console.error("[highlight] fetch failed for smMatchId", smMatchId, e);
    return null;
  }
}

// ─── FIFA HIGHLIGHTS ──────────────────────────────────────────────────────────
const FIFA_VIDEOS_API = "https://cxm-api.fifa.com/fifaplusweb/api/sections/matchdetails/videos";

async function fetchFifaHighlight(matchId, stageId = FIFA_STAGE) {
  if (!matchId) return null;
  const k = `fifa_highlight_${matchId}`;
  const cached = getCached(k);
  if (cached !== undefined && cached !== null) return cached;

  try {
    const url = `${FIFA_VIDEOS_API}?locale=en&competitionId=${FIFA_COMPETITION}&seasonId=${FIFA_SEASON}&stageId=${stageId}&matchId=${matchId}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json();
    const items = json?.vodVideosBaseCarousel?.items || [];
    if (!items.length) { setCache(k, null); return null; }
    const vid = items.find(v => !/sign language/i.test(v.title || "")) || items[0];
    const highlight = {
      title: vid.title,
      thumbnail: vid.image?.src || null,
      watchPath: vid.readMorePageUrl || null,
    };
    setCache(k, highlight);
    return highlight;
  } catch (e) {
    console.error("[fifa highlight] fetch failed", matchId, e);
    return null;
  }
}

// ─── IPL HIGHLIGHTS ───────────────────────────────────────────────────────────
// Fetches all highlight videos for one IPL 2026 match via the backend proxy.
async function fetchIplMatchHighlights(smMatchId) {
  if (!smMatchId) return null;
  const k = `ipl_hl_${smMatchId}`;
  const cached = getCached(k);
  if (cached !== undefined && cached !== null) return cached;

  try {
    const res = await fetch(`${API_BASE}/api/ipl/highlight-videos?smMatchId=${smMatchId}`);
    if (!res.ok) { setCache(k, null); return null; }
    const json = await res.json();
    const vids = json.videos || [];
    if (!vids.length) { setCache(k, null); return null; }
    const mapped = vids.map(v => ({
      id:             v.id,
      title:          v.title || "Untitled",
      thumbnail:      v.thumbnail || null,
      duration:       v.duration || 0,
      mediaId:        v.mediaId || null,
      titleUrlSegment: v.titleUrlSegment || null,
      shortCode:      v.shortCode || null,
    }));
    setCache(k, mapped);
    return mapped;
  } catch (e) {
    console.error("[ipl highlight] fetch failed", smMatchId, e);
    return null;
  }
}



// ─── FIFA / MISC HELPERS ──────────────────────────────────────────────────────
const ICC_FLAGS = {
  ENG:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", SL:"🇱🇰", AUS:"🇦🇺", IND:"🇮🇳", AFG:"🇦🇫", SA:"🇿🇦",
  PAK:"🇵🇰", NZ:"🇳🇿", WI:"🏴", SCO:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", IRE:"🇮🇪", BAN:"🇧🇩", NED:"🇳🇱",
};
function getFifaFlag(code) { return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`; }
function fifaAbbr(t) { return t?.Abbreviation || t?.TeamName?.find(x=>x.Locale==="en-GB")?.Description || ""; }
function fmtIST(d) {
  try { return new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"}); }
  catch { return ""; }
}
function getFifaStatus(m) {
  if (m.MatchStatus === 3) return "live";
  if (m.HomeTeamScore !== null && m.HomeTeamScore !== undefined) return "finished";
  return "upcoming";
}

// ─── SIDE BUILDER ─────────────────────────────────────────────────────────────
// Bundles code + name + logo + score + overs into ONE object per team so a
// logo/flag can never end up paired with the wrong code or score.
function buildSide({ code, name, logo, score, overs }) {
  return {
    code: code || "—",
    name: name || code || "—",
    logo: logo || null,
    score: (score === undefined) ? null : score,
    overs: overs || null,
  };
}

// Resolve a short team code from an (optional) code and the team NAME.
// NEVER defaults to "IND" — for away tours (e.g. India in Zimbabwe) the home
// team is Zimbabwe, so a hardcoded IND fallback mismatches the logo.
const TEAM_NAME_TO_CODE = {
  "india":"IND","zimbabwe":"ZIM","australia":"AUS","england":"ENG","pakistan":"PAK",
  "sri lanka":"SL","south africa":"SA","new zealand":"NZ","west indies":"WI",
  "bangladesh":"BAN","afghanistan":"AFG","ireland":"IRE","netherlands":"NED",
  "nepal":"NEP","scotland":"SCO","namibia":"NAM","oman":"OMA","united states":"USA",
  "united states of america":"USA","uae":"UAE","canada":"CAN","malaysia":"MAS",
};
function teamCode(code, name) {
  if (code) return code;
  const n = (name || "").trim();
  if (!n) return "—";
  return TEAM_NAME_TO_CODE[n.toLowerCase()] || n.slice(0, 3).toUpperCase();
}

// ─── CACHE ────────────────────────────────────────────────────────────────────
const _cache = {};
function getCached(k) { const e=_cache[k]; return (e&&Date.now()-e.ts<600000)?e.data:null; }
function setCache(k,d) { _cache[k]={data:d,ts:Date.now()}; }

// ─── SHARED ───────────────────────────────────────────────────────────────────
function PulsingDot({ color="#ef4444", size=7 }) {
  return (
    <span className="relative flex shrink-0" style={{width:size,height:size}}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{background:color}}/>
      <span className="relative inline-flex rounded-full h-full w-full" style={{background:color}}/>
    </span>
  );
}

// ─── TOP NAV ──────────────────────────────────────────────────────────────────
function TopNav() {
  const loc = useLocation();

  const navItems = [
    { to: "/",              label: "Home",      icon: <Home size={14}/> },
    { to: "/live-cricket-tv", label: "Cricket", icon: <span style={{fontSize:13}}>🏏</span> },
    { to: "/live-cricket-tv?tab=football", label: "Football", icon: <span style={{fontSize:13}}>⚽</span> },
    { to: "/watch",         label: "Watch",     icon: <Tv2 size={14}/> },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="shrink-0">
          <img src="/logo_39.png" className="h-6 w-auto" alt="logo" />
        </Link>

        {/* Nav pills */}
        <nav className="flex items-center gap-1 bg-white/[0.04] rounded-2xl p-1 border border-white/[0.07]">
          {navItems.map(({ to, label, icon }) => {
            const isActive = to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to.split("?")[0]);
            return (
              <Link key={to} to={to}
                aria-current={isActive ? "page" : undefined}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all duration-200 hover:text-white hover:bg-white/[0.06]"
                style={{
                  background: isActive ? "rgba(139,92,246,0.16)" : "transparent",
                  color: isActive ? "#c4b5fd" : "#8b8fa3",
                  boxShadow: isActive ? "0 0 14px rgba(139,92,246,0.2)" : "none",
                }}>
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Live badge */}
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1.5 rounded-full border shrink-0"
          style={{ color:"#ef4444", borderColor:"rgba(239,68,68,0.25)", background:"rgba(239,68,68,0.06)" }}>
          <PulsingDot color="#ef4444" size={5}/>
          <span className="hidden sm:inline">Live</span>
        </div>
      </div>
    </header>
  );
}

// ─── TEAM BADGE (circular for cricket, square for football — BCCI-style) ─────
// Tracks image-load failure in state and falls back to the flag/globe glyph,
// instead of hiding a broken <img> and leaving an empty box (the previous bug).
function TeamBadge({ team, sport, size = 44 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasLogo = !!team.logo && !imgFailed;

  if (sport === "football") {
    return hasLogo ? (
      <div className="rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/5 flex items-center justify-center" style={{ width:size, height:size }}>
        <img src={team.logo} alt="" className="w-full h-full object-cover" onError={()=>setImgFailed(true)}/>
      </div>
    ) : (
      <div className="rounded-lg border border-white/10 shrink-0 bg-white/5 flex items-center justify-center" style={{ width:size, height:size }}>
        <span style={{ fontSize:size*0.55, lineHeight:1 }}>🌍</span>
      </div>
    );
  }

  const flag = ICC_FLAGS[team.code] || "🏏";
  return hasLogo ? (
    <div className="rounded-full overflow-hidden border border-white/10 bg-white/5 shrink-0 flex items-center justify-center" style={{ width:size, height:size }}>
      <img src={team.logo} alt="" className="w-full h-full object-contain" style={{padding:"12%"}} onError={()=>setImgFailed(true)}/>
    </div>
  ) : (
    <div className="rounded-full border border-white/10 bg-white/5 shrink-0 flex items-center justify-center" style={{ width:size, height:size }}>
      <span style={{ fontSize:size*0.55, lineHeight:1 }}>{flag}</span>
    </div>
  );
}

// ─── BCCI-STYLE MATCH CARD (shared: live / scheduled / finished, cricket + football) ──
function MatchCard({ sport, status, leagueLabel, matchLabel, statusLabel, home, away, venue, link, result, tossText, highlight }) {
  const isLive     = status === "live";
  const isFinished = status === "finished";
  const accent     = sport === "cricket" ? "#8b5cf6" : "#1ed596";
  const hWon = isFinished && typeof home.score === "number" && typeof away.score === "number" && home.score > away.score;
  const aWon = isFinished && typeof home.score === "number" && typeof away.score === "number" && away.score > home.score;
  const showCricketScores = sport === "cricket" && (isLive || isFinished) && (home.score || away.score);
  const showFootballScores = sport === "football" && (isLive || isFinished) && home.score !== null && home.score !== undefined;

  const [playerModal, setPlayerModal] = useState(null); // { src } when open
  const [streamLoading, setStreamLoading] = useState(false);

  const openHighlight = async (e, vid) => {
    e.preventDefault();
    e.stopPropagation();
    if (!vid) return;

    // Both cricket (BCCI) and football (FIFA) now go through the stream extractor
    const watchUrl = sport === "football"
      ? (vid.watchPath ? `https://www.fifa.com${vid.watchPath}` : null)
      : vid.shortCode
      ? `https://www.bcci.tv/bccilink/videos/${vid.shortCode}`
      : vid.urlSegment
      ? `https://www.bcci.tv/videos/${vid.urlSegment}`
      : null;

    if (!watchUrl || streamLoading) return;
    setStreamLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/get-stream?url=${encodeURIComponent(watchUrl)}`
      );
      const json = await res.json();
      if (res.ok && json.success && json.url) {
        const params = new URLSearchParams({ url: json.url, title: vid.title || "Watch" });
        setPlayerModal({ src: `/player.html?${params}`, title: vid.title || "Watch" });
        setStreamLoading(false);
        return;
      }
    } catch {}
    setStreamLoading(false);
    // Stream extraction failed — do NOT open external browser.
    // The user stays in-app; the button resets so they can retry.
  };

  // Pick the single "best" clip to show in the card footer
  // For cricket: prefer match highlights, else first video
  // For football: single highlight object
  const bestClip = Array.isArray(highlight)
    ? (highlight.find(v => (v.title || "").toLowerCase().includes("match highlights")) || highlight[0])
    : highlight;

  const fmtDur = d => {
    if (!d) return "";
    const m = Math.floor(d / 60), s = d % 60;
    return `${m}:${String(s).padStart(2,"0")}`;
  };

 return (
  <>
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
          <span style={{ color: accent, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em" }}>
            ▶ {playerModal.title || "Watch"}
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

  <Link to={link || "/live-cricket-tv"}
    className="group/card flex rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:border-white/25"
    style={{
      borderColor: isLive ? `${accent}55` : "rgba(255,255,255,0.08)",
      boxShadow: isLive ? `0 0 18px ${accent}22` : "0 1px 2px rgba(0,0,0,0.3)",
    }}
    onMouseEnter={e=>{ e.currentTarget.style.boxShadow = isLive ? `0 8px 28px ${accent}33` : "0 8px 24px rgba(0,0,0,0.45)"; }}
    onMouseLeave={e=>{ e.currentTarget.style.boxShadow = isLive ? `0 0 18px ${accent}22` : "0 1px 2px rgba(0,0,0,0.3)"; }}>
    {/* side accent bar */}
    <div className="w-1.5 shrink-0" style={{ background: accent }} />

    <div className="flex-1 bg-white/[0.02]">
      {/* header strip */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] gap-2">
        <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider truncate">
          {matchLabel ? `${matchLabel} · ` : ""}{leagueLabel}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1 shrink-0">
            <PulsingDot color="#ef4444" size={5}/>
            <span className="text-[8px] font-black text-red-400 uppercase">Live</span>
          </span>
        ) : isFinished ? (
          <span className="text-[8px] font-black text-emerald-500 uppercase shrink-0">FT</span>
        ) : (
          <span className="text-[8px] font-black uppercase shrink-0" style={{ color: accent }}>{statusLabel}</span>
        )}
      </div>

      {/* teams: badge-over-name, BCCI style */}
      <div className="flex items-center justify-between px-3 py-3 gap-2">
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <TeamBadge team={home} sport={sport} size={36}/>
          <span className="text-[11px] font-black uppercase truncate max-w-full" style={{ color: hWon ? "#4ade80" : "white" }}>
            {home.code}
          </span>
          {showCricketScores && home.score && (
            <span className="text-[9px] font-black" style={{ color: isFinished ? "rgba(255,255,255,0.65)" : accent }}>
              {home.score}{home.overs ? ` (${home.overs})` : ""}
            </span>
          )}
          {showFootballScores && (
            <span className="text-[12px] font-black" style={{ color: hWon ? "#4ade80" : "white" }}>{home.score}</span>
          )}
        </div>

        <div className="shrink-0 text-center px-1">
          {showFootballScores
            ? <span className="text-[12px] font-black text-white/40">:</span>
            : <span className="text-[10px] font-black text-gray-600">vs</span>}
        </div>

        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <TeamBadge team={away} sport={sport} size={36}/>
          <span className="text-[11px] font-black uppercase truncate max-w-full" style={{ color: aWon ? "#4ade80" : "rgba(255,255,255,0.85)" }}>
            {away.code}
          </span>
          {showCricketScores && away.score && (
            <span className="text-[9px] font-black" style={{ color: isFinished ? "rgba(255,255,255,0.65)" : accent }}>
              {away.score}{away.overs ? ` (${away.overs})` : ""}
            </span>
          )}
          {showFootballScores && (
            <span className="text-[12px] font-black" style={{ color: aWon ? "#4ade80" : "white" }}>{away.score}</span>
          )}
        </div>
      </div>

      {/* footer: highlight clip OR venue/result/toss */}
      {bestClip ? (
        <button
          onClick={e => openHighlight(e, bestClip)}
          disabled={streamLoading}
          className="w-full flex items-center gap-2.5 px-3 py-2 border-t border-white/[0.06] text-left hover:bg-white/[0.03] transition-colors disabled:opacity-70"
        >
          <div className="relative w-12 h-8 rounded-md overflow-hidden shrink-0 bg-white/5 border border-white/10">
            {bestClip.thumbnail && (
              <img src={bestClip.thumbnail} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              {streamLoading
                ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${accent}40`, borderTopColor: accent }} />
                : <PlayCircle size={14} className="text-white" />
              }
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: accent }}>
              {streamLoading ? "Extracting stream…" : "Watch Highlights"}
            </p>
            <p className="text-[8px] text-gray-500 truncate">
              {bestClip.title}
              {Array.isArray(highlight) && highlight.length > 1 ? ` +${highlight.length - 1} more` : ""}
            </p>
          </div>
        </button>
      ) : (
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06] gap-2">
          <span className="text-[8px] text-gray-600 font-bold truncate">
            {result ? result : tossText ? `🪙 ${tossText}` : venue ? `📍 ${venue}` : ""}
          </span>
          <span className="text-[8px] font-black uppercase shrink-0" style={{ color: accent }}>Match Info →</span>
        </div>
      )}
    </div>
  </Link>
  </>
);
}


// ─── LIVE NOW STRIP ───────────────────────────────────────────────────────────
function LiveNowStrip() {
  const [wt20All,        setWt20All]        = useState([]);
  const [fifaAll,        setFifaAll]        = useState([]);
  const [indiaLive,      setIndiaLive]      = useState([]);
  const [indiaUpcoming,  setIndiaUpcoming]  = useState([]);
  const [indiaRecent,    setIndiaRecent]    = useState([]);
  const [indiaHighlights, setIndiaHighlights] = useState({});
  const [fifaHighlights, setFifaHighlights] = useState({});

  // ── Load WT20 ──────────────────────────────────────────────────────────────
  const loadWt20 = useCallback(async () => {
    const k = "home_wt20_v2";
    const cached = getCached(k);
    if (cached) { setWt20All(cached); return; }
    try {
      const res = await fetch(`${API_BASE}/api/wt20/schedule?series_ids=${WT20_SERIES_ID}&game_count=8`);
      if (!res.ok) return;
      const json = await res.json();
      const m = json.data?.matches || [];
      setCache(k, m); setWt20All(m);
    } catch {}
  }, []);

  // ── Load FIFA ──────────────────────────────────────────────────────────────
  const loadFifa = useCallback(async () => {
    const k = "home_fifa_v2";
    const cached = getCached(k);
    if (cached) { setFifaAll(cached); return; }
    try {
      const url = `${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const json = await res.json();
      setCache(k, json.Results || []); setFifaAll(json.Results || []);
    } catch {}
  }, []);

  // ── Load India BCCI ────────────────────────────────────────────────────────
  const loadIndia = useCallback(async () => {
    const k = "home_india_v2";
    const cached = getCached(k);
    if (cached) {
      setIndiaLive(cached.live || []);
      setIndiaUpcoming(cached.upcoming || []);
      setIndiaRecent(cached.recent || []);
      return;
    }
    try {
      const [liveR, upR, recentR] = await Promise.allSettled([
        fetch(`${API_BASE}/api/bcci/live`),
        fetch(`${API_BASE}/api/bcci/upcoming`),
        fetch(`${API_BASE}/api/bcci/recent`),
      ]);
      const live     = liveR.status==="fulfilled" && liveR.value.ok ? (await liveR.value.json()).liveMatches || [] : [];
      const upcoming = upR.status==="fulfilled" && upR.value.ok ? (await upR.value.json()).upcomingMatches || [] : [];
      const recent   = recentR.status==="fulfilled" && recentR.value.ok
        ? ((await recentR.value.json()).recentMatches || (await recentR.value.json()).postMatches || []) : [];

      const payload = {
        live:     live.filter(isIndiaMensMatch),
        upcoming: upcoming.filter(isIndiaMensMatch),
        recent:   recent.filter(isIndiaMensMatch),
      };
      setCache(k, payload);
      setIndiaLive(payload.live); setIndiaUpcoming(payload.upcoming); setIndiaRecent(payload.recent);
    } catch {}
  }, []);

  useEffect(() => {
    loadWt20(); loadFifa(); loadIndia();
    const t = setInterval(() => { loadWt20(); loadFifa(); loadIndia(); }, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);


useEffect(() => {
  if (!indiaRecent.length) return;
  let cancelled = false;
  (async () => {
    const targets = indiaRecent.slice(0, 2);
    console.log("[highlight] indiaRecent sample:", targets[0]);
    const results = await Promise.allSettled(
      targets.map(m => fetchIndiaHighlights(m.SmMatchID || m.MatchID))
    );
    if (cancelled) return;
    const next = {};
    targets.forEach((m, i) => {
      const r = results[i];
      // Store the full array (or null) keyed by MatchID
      if (r.status === "fulfilled" && r.value) next[m.MatchID] = r.value;
    });
    setIndiaHighlights(prev => ({ ...prev, ...next }));
  })();
  return () => { cancelled = true; };
}, [indiaRecent]);

  // ── Classify FIFA ──────────────────────────────────────────────────────────
  const todayStr      = new Date().toISOString().slice(0, 10);
  const fifaLive      = fifaAll.filter(m => getFifaStatus(m) === "live");
  const fifaToday     = fifaAll.filter(m => new Date(m.Date).toISOString().slice(0,10) === todayStr && getFifaStatus(m) !== "live");
  const fifaUpcoming  = fifaAll.filter(m => getFifaStatus(m) === "upcoming").sort((a,b)=>new Date(a.Date)-new Date(b.Date));
  const fifaRecent    = fifaAll.filter(m => getFifaStatus(m) === "finished").sort((a,b)=>new Date(b.Date)-new Date(a.Date));

useEffect(() => {
  if (!fifaRecent.length) return;
  let cancelled = false;
  (async () => {
    const targets = fifaRecent.slice(0, 4);
    const results = await Promise.allSettled(
      targets.map(m => fetchFifaHighlight(m.IdMatch, m.IdStage || FIFA_STAGE))
    );
    if (cancelled) return;
    const next = {};
    targets.forEach((m, i) => {
      const r = results[i];
      if (r.status === "fulfilled" && r.value) next[m.IdMatch] = r.value;
    });
    setFifaHighlights(prev => ({ ...prev, ...next }));
  })();
  return () => { cancelled = true; };
}, [fifaRecent]);

  // ── Classify WT20 ──────────────────────────────────────────────────────────
  const wt20Live      = wt20All.filter(m => m.live);
  const wt20Recent    = wt20All.filter(m => m.recent && !m.live);
  const wt20Upcoming  = wt20All.filter(m => m.upcoming);

  // ── Live count for badge ───────────────────────────────────────────────────
  const liveCount = indiaLive.length + fifaLive.length + wt20Live.length;

  // ── Build live+today cards ─────────────────────────────────────────────────
  // Each match builds ONE home object + ONE away object together, so the
  // logo/flag, code, and score for a side can never get mismatched.
  const liveCards = [
    // India live
    ...indiaLive.map(m => {
      const home = buildSide({
        code: teamCode(m.HomeTeamCode || m.FirstBattingTeamCode, m.HomeTeamName),
        name: m.HomeTeamName,
        logo: m.MatchHomeTeamLogo,
        score: m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]}` : null,
      });
      const away = buildSide({
        code: teamCode(m.AwayTeamCode || m.SecondBattingTeamCode, m.AwayTeamName),
        name: m.AwayTeamName,
        logo: m.MatchAwayTeamLogo,
        score: m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]}` : null,
      });
      return {
        id: `ind-live-${m.MatchID}`,
        sport: "cricket",
        status: "live",
        home, away,
        leagueLabel: m.CompetitionName || "India Cricket",
        venue: m.GroundName ? `${m.GroundName}${m.city?`, ${m.city}`:""}` : "",
link: `/match-center/${encodeMatchHash({
  sport: "cricket",
  type: "bcci",
  homeCode: teamCode(m.HomeTeamCode || m.FirstBattingTeamCode, m.HomeTeamName),
  awayCode: teamCode(m.AwayTeamCode || m.SecondBattingTeamCode, m.AwayTeamName),
  leagueLabel: m.CompetitionName || "India Cricket",
  matchData: {
    MatchID: m.MatchID,
    CompetitionID: m.CompetitionID,
    MatchOrder: m.MatchOrder,
    CompetitionName: m.CompetitionName,
    HomeTeamName: m.HomeTeamName,
    AwayTeamName: m.AwayTeamName,
    MatchHomeTeamLogo: m.MatchHomeTeamLogo,
    MatchAwayTeamLogo: m.MatchAwayTeamLogo,
    HomeTeamCode: m.HomeTeamCode,
    AwayTeamCode: m.AwayTeamCode,
    MatchDate: m.MatchDate,
    MatchTime: m.MatchTime,
    GroundName: m.GroundName,
    MatchType: m.MatchType,
  },
})}`,
      };
    }),
    // WT20 live
    ...wt20Live.map(m => {
      const score = m.scores?.[0];
      const home = buildSide({ code: m.teama_short, name: m.teama_display_name, score: score ? `${score.team_runs}/${score.team_wickets}` : null });
      const away = buildSide({ code: m.teamb_short, name: m.teamb_display_name });
      return {
        id: `wt20-live-${m.match_id}`,
        sport: "cricket",
        status: "live",
        home, away,
        leagueLabel: "ICC WT20 WC 2026",
        venue: m.venue || "",
link: `/match-center/${encodeMatchHash({
  sport: "cricket",
  type: "wt20",
  matchId: m.match_id,
  homeCode: m.teama_short || "",
  awayCode: m.teamb_short || "",
  leagueLabel: "ICC WT20 WC 2026",
})}`,
      };
    }),
    // FIFA live
    ...fifaLive.map(m => {
      const home = buildSide({ code: fifaAbbr(m.Home) || "—", logo: m.Home?.IdCountry ? getFifaFlag(m.Home.IdCountry) : null, score: m.HomeTeamScore });
      const away = buildSide({ code: fifaAbbr(m.Away) || "—", logo: m.Away?.IdCountry ? getFifaFlag(m.Away.IdCountry) : null, score: m.AwayTeamScore });
      return {
        id: `fifa-live-${m.IdMatch}`,
        sport: "football",
        status: "live",
        home, away,
        leagueLabel: "FIFA WC 2026",
        venue: m.Stadium?.CityName?.find(x=>x.Locale==="en-GB")?.Description || "",
link: `/match-center/${encodeMatchHash({
  sport: "football",
  type: "fifa",
  matchId: m.IdMatch,
  homeCode: fifaAbbr(m.Home) || "—",
  awayCode: fifaAbbr(m.Away) || "—",
  leagueLabel: "FIFA WC 2026",
})}`,
      };
    }),
  ];

  // ── Build scheduled (today + next upcoming) ───────────────────────────────
  const scheduledCards = [
    // India upcoming (next 2)
    ...indiaUpcoming.slice(0, 2).map(m => {
      const home = buildSide({ code: teamCode(m.HomeTeamCode, m.HomeTeamName), name: m.HomeTeamName, logo: m.MatchHomeTeamLogo });
      const away = buildSide({ code: teamCode(m.AwayTeamCode, m.AwayTeamName), name: m.AwayTeamName, logo: m.MatchAwayTeamLogo });
      return {
        id: `ind-up-${m.MatchID}`,
        sport: "cricket",
        status: "upcoming",
        home, away,
        leagueLabel: m.CompetitionName || "India Cricket",
        venue: m.GroundName ? `${m.GroundName}${m.city?`, ${m.city}`:""}` : "",
        statusLabel: countdownLabel(m.MatchDate) || `${bcciFmtDate(m.MatchDate)} IST`,
        link: `/match-center/${encodeMatchHash({
  sport: "cricket",
  type: "bcci",
  homeCode: teamCode(m.HomeTeamCode, m.HomeTeamName),
  awayCode: teamCode(m.AwayTeamCode, m.AwayTeamName),
  leagueLabel: m.CompetitionName || "India Cricket",
  matchData: {
    MatchID: m.MatchID,
    CompetitionID: m.CompetitionID,
    MatchOrder: m.MatchOrder,
    CompetitionName: m.CompetitionName,
    HomeTeamName: m.HomeTeamName,
    AwayTeamName: m.AwayTeamName,
    MatchHomeTeamLogo: m.MatchHomeTeamLogo,
    MatchAwayTeamLogo: m.MatchAwayTeamLogo,
    HomeTeamCode: m.HomeTeamCode,
    AwayTeamCode: m.AwayTeamCode,
    MatchDate: m.MatchDate,
    MatchTime: m.MatchTime,
    GroundName: m.GroundName,
    MatchType: m.MatchType,
  },
})}`,
      };
    }),
    // WT20 upcoming (next 2)
    ...wt20Upcoming.slice(0, 2).map(m => {
      const home = buildSide({ code: m.teama_short, name: m.teama_display_name });
      const away = buildSide({ code: m.teamb_short, name: m.teamb_display_name });
      return {
        id: `wt20-up-${m.match_id}`,
        sport: "cricket",
        status: "upcoming",
        home, away,
        leagueLabel: "ICC WT20 WC 2026",
        venue: m.venue || "",
        statusLabel: (m.start_date && countdownLabel(m.start_date)) || (m.match_time_ist ? `${m.match_time_ist} IST` : ""),
        link: `/match-center/${encodeMatchHash({
  sport: "cricket",
  type: "wt20",
  matchId: m.match_id,
  homeCode: m.teama_short || "",
  awayCode: m.teamb_short || "",
  leagueLabel: "ICC WT20 WC 2026",
})}`,
      };
    }),
    // FIFA today (not live) + next upcoming
    ...[...fifaToday, ...fifaUpcoming.slice(0, 3)].slice(0, 3).map(m => {
      const home = buildSide({ code: fifaAbbr(m.Home) || "—", logo: m.Home?.IdCountry ? getFifaFlag(m.Home.IdCountry) : null });
      const away = buildSide({ code: fifaAbbr(m.Away) || "—", logo: m.Away?.IdCountry ? getFifaFlag(m.Away.IdCountry) : null });
      return {
        id: `fifa-up-${m.IdMatch}`,
        sport: "football",
        status: "upcoming",
        home, away,
        leagueLabel: "FIFA WC 2026",
        venue: m.Stadium?.CityName?.find(x=>x.Locale==="en-GB")?.Description || "",
        statusLabel: countdownLabel(m.Date) || (fmtIST(m.Date) ? `${fmtIST(m.Date)} IST` : ""),
        link: `/match-center/${encodeMatchHash({
  sport: "football",
  type: "fifa",
  matchId: m.IdMatch,
  homeCode: fifaAbbr(m.Home) || "—",
  awayCode: fifaAbbr(m.Away) || "—",
  leagueLabel: "FIFA WC 2026",
})}`,
      };
    }),
  ];

  // ── Build recent results ──────────────────────────────────────────────────
  const recentResults = [
    // India recent (last 2)
    ...indiaRecent.slice(0, 2).map(m => {
      const homeIsFirst = String(m.FirstBattingTeamID) === String(m.HomeTeamID);
      const inn1 = m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]} (${m["1FallOvers"]} ov)` : null;
      const inn2 = m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]} (${m["2FallOvers"]} ov)` : null;
      const home = buildSide({ code: teamCode(m.HomeTeamCode, m.HomeTeamName), name: m.HomeTeamName, logo: m.MatchHomeTeamLogo, score: homeIsFirst ? inn1 : inn2 });
      const away = buildSide({ code: teamCode(m.AwayTeamCode, m.AwayTeamName), name: m.AwayTeamName, logo: m.MatchAwayTeamLogo, score: homeIsFirst ? inn2 : inn1 });
      return {
        id: `ind-fin-${m.MatchID}`, sport: "cricket", status: "finished",
        home, away,
        result: m.Comments || m.Commentss || null,
        leagueLabel: m.CompetitionName || "India Cricket",
        venue: m.GroundName || "",
        highlight: indiaHighlights[m.MatchID] || null,
        // AFTER
link: `/match-center/${encodeMatchHash({
  sport: "cricket",
  type: "bcci",
  homeCode: teamCode(m.HomeTeamCode, m.HomeTeamName),
  awayCode: teamCode(m.AwayTeamCode, m.AwayTeamName),
  leagueLabel: m.CompetitionName || "India Cricket",
  matchData: {
    MatchID: m.MatchID,
    CompetitionID: m.CompetitionID,
    MatchOrder: m.MatchOrder,
    CompetitionName: m.CompetitionName,
    HomeTeamName: m.HomeTeamName,
    AwayTeamName: m.AwayTeamName,
    MatchHomeTeamLogo: m.MatchHomeTeamLogo,
    MatchAwayTeamLogo: m.MatchAwayTeamLogo,
    HomeTeamCode: m.HomeTeamCode,
    AwayTeamCode: m.AwayTeamCode,
    MatchDate: m.MatchDate,
    MatchTime: m.MatchTime,
    GroundName: m.GroundName,
    MatchType: m.MatchType,
  },
})}`,
      };
    }),
    // WT20 recent (last 2)
    ...wt20Recent.slice(0, 2).map(m => {
      const score = m.scores?.[0];
      const home = buildSide({ code: m.teama_short, name: m.teama_display_name, score: score ? `${score.team_runs}/${score.team_wickets} (${score.team_overs} ov)` : null });
      const away = buildSide({ code: m.teamb_short, name: m.teamb_display_name });
      return {
        id: `wt20-fin-${m.match_id}`, sport: "cricket", status: "finished",
        home, away,
        result: m.match_result || null,
        leagueLabel: "ICC WT20 WC 2026",
        venue: m.venue || "",
        link: `/match-center/${encodeMatchHash({
  sport: "cricket",
  type: "wt20",
  matchId: m.match_id,
  homeCode: m.teama_short || "",
  awayCode: m.teamb_short || "",
  leagueLabel: "ICC WT20 WC 2026",
})}`,
      };
    }),
    // FIFA recent results (last 4)
    ...fifaRecent.slice(0, 4).map(m => {
      const group = m.GroupName?.find(x=>x.Locale==="en-GB")?.Description || "";
      const city  = m.Stadium?.CityName?.find(x=>x.Locale==="en-GB")?.Description || "";
      const hWon  = m.HomeTeamScore > m.AwayTeamScore;
      const aWon  = m.AwayTeamScore > m.HomeTeamScore;
      const home = buildSide({ code: fifaAbbr(m.Home) || "—", logo: m.Home?.IdCountry ? getFifaFlag(m.Home.IdCountry) : null, score: m.HomeTeamScore });
      const away = buildSide({ code: fifaAbbr(m.Away) || "—", logo: m.Away?.IdCountry ? getFifaFlag(m.Away.IdCountry) : null, score: m.AwayTeamScore });
      return {
        id: `fifa-fin-${m.IdMatch}`, sport: "football", status: "finished",
        home, away,
        result: hWon ? `${home.code} win` : aWon ? `${away.code} win` : "Draw",
        leagueLabel: "FIFA WC 2026", matchLabel: group, venue: city,
        highlight: fifaHighlights[m.IdMatch] || null,
        link: `/match-center/${encodeMatchHash({
  sport: "football",
  type: "fifa",
  matchId: m.IdMatch,
  homeCode: fifaAbbr(m.Home) || "—",
  awayCode: fifaAbbr(m.Away) || "—",
  leagueLabel: "FIFA WC 2026",
})}`,
      };
    }),
  ];

  const showLive      = liveCards.length > 0;
  const showScheduled = scheduledCards.length > 0;
  const showResults   = recentResults.length > 0;

  if (!showLive && !showScheduled && !showResults) return null;

  return (
    <div className="space-y-8">

      {/* ── Live now ── */}
      {showLive && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-red-500"/>
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Live Now</span>
              <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/20 text-red-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                <PulsingDot color="#ef4444" size={5}/>{liveCount} Live
              </span>
            </div>
            <Link to="/live-cricket-tv" className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors font-bold">
              All <ChevronRight size={12}/>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveCards.slice(0, 6).map(c => <MatchCard key={c.id} {...c}/>)}
          </div>
        </div>
      )}

      {/* ── Scheduled / Today ── */}
      {showScheduled && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={13} className="text-violet-400"/>
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">
                {showLive ? "Next Up" : "Today & Upcoming"}
              </span>
            </div>
            <Link to="/live-cricket-tv" className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors font-bold">
              Schedule <ChevronRight size={12}/>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {scheduledCards.slice(0, 6).map(c => <MatchCard key={c.id} {...c}/>)}
          </div>
        </div>
      )}

      {/* ── Recent Results ── */}
      {showResults && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={13} className="text-amber-400"/>
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Recent Results</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentResults.slice(0, 6).map(r => <MatchCard key={r.id} {...r}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FIFA WC 2026 HIGHLIGHTS ROW (Hotstar-style) ─────────────────────────────
function FifaHighlightCard2026({ match, highlight, onPlay, loading }) {
  const FIFA_GREEN = "#34d399";
  const hName = match.Home?.Abbreviation || match.Home?.TeamName?.find(x => x.Locale === "en-GB")?.Description || "";
  const aName = match.Away?.Abbreviation || match.Away?.TeamName?.find(x => x.Locale === "en-GB")?.Description || "";
  const hScore = match.HomeTeamScore;
  const aScore = match.AwayTeamScore;
  const hFlag = match.Home?.IdCountry ? `https://api.fifa.com/api/v3/picture/flags-sq-1/${match.Home.IdCountry}` : null;
  const aFlag = match.Away?.IdCountry ? `https://api.fifa.com/api/v3/picture/flags-sq-1/${match.Away.IdCountry}` : null;
  const hWon = hScore !== null && aScore !== null && hScore > aScore;
  const aWon = hScore !== null && aScore !== null && aScore > hScore;
  const thumb = highlight?.thumbnail || null;
  const group = match.GroupName?.find(x => x.Locale === "en-GB")?.Description || "";

  return (
    <div
      className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        width: 220,
        background: "#0d1117",
        border: "1px solid rgba(52,211,153,0.12)",
        transition: "transform 0.18s, box-shadow 0.18s",
      }}
      onClick={onPlay}
    >
      {/* Thumbnail */}
      <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#111" }}>
        {thumb
          ? <img src={thumb} alt="" className="w-full h-full object-cover" style={{ display: "block" }} />
          : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)" }}>
              <span style={{ fontSize: 32 }}>⚽</span>
            </div>
          )
        }
        {/* Dark overlay + play button */}
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", transition: "background 0.18s" }}>
          {loading
            ? <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${FIFA_GREEN}40`, borderTopColor: FIFA_GREEN }} />
            : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.6)", border: `2px solid ${FIFA_GREEN}`, transition: "transform 0.15s" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill={FIFA_GREEN}><path d="M4 2.5l10 5.5-10 5.5z"/></svg>
              </div>
            )
          }
        </div>
        {/* FT badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider"
          style={{ background: "rgba(0,0,0,0.7)", color: FIFA_GREEN, border: `1px solid ${FIFA_GREEN}30` }}>FT</div>
        {/* Group label */}
        {group && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider"
            style={{ background: "rgba(0,0,0,0.7)", color: "rgba(255,255,255,0.6)" }}>{group.replace("Group ", "Grp ")}</div>
        )}
      </div>

      {/* Score row */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Home */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {hFlag && <img src={hFlag} alt="" className="w-7 h-7 rounded-md object-cover" />}
            <span className="text-[10px] font-black uppercase truncate w-full text-center" style={{ color: hWon ? "#4ade80" : "rgba(255,255,255,0.9)" }}>{hName}</span>
            {hScore !== null && hScore !== undefined && (
              <span className="text-[13px] font-black" style={{ color: hWon ? "#4ade80" : "white" }}>{hScore}</span>
            )}
          </div>
          {/* VS */}
          <span className="text-[10px] font-black text-white/30 shrink-0">:</span>
          {/* Away */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {aFlag && <img src={aFlag} alt="" className="w-7 h-7 rounded-md object-cover" />}
            <span className="text-[10px] font-black uppercase truncate w-full text-center" style={{ color: aWon ? "#4ade80" : "rgba(255,255,255,0.9)" }}>{aName}</span>
            {aScore !== null && aScore !== undefined && (
              <span className="text-[13px] font-black" style={{ color: aWon ? "#4ade80" : "white" }}>{aScore}</span>
            )}
          </div>
        </div>
        {/* Title */}
        {highlight?.title && (
          <p className="text-[8px] text-gray-600 mt-1.5 truncate">{highlight.title}</p>
        )}
      </div>
    </div>
  );
}

function FifaHighlightsRow() {
  const FIFA_GREEN = "#34d399";
  const [fifaAll, setFifaAll] = useState([]);
  const [highlights, setHighlights] = useState({}); // matchId → { title, thumbnail, watchPath }
  const [playerModal, setPlayerModal] = useState(null); // { src, title }
  const [loadingId, setLoadingId] = useState(null);    // matchId being extracted

  // Fetch all FIFA matches
  useEffect(() => {
    const k = "home_fifa_v2";
    const cached = getCached(k);
    if (cached) { setFifaAll(cached); return; }
    (async () => {
      try {
        const url = `${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const json = await res.json();
        const all = json.Results || [];
        setCache(k, all);
        setFifaAll(all);
      } catch {}
    })();
  }, []);

// Finished matches sorted newest → oldest (most recent first)
const finished = fifaAll
  .filter(m => getFifaStatus(m) === "finished")
  .sort((a, b) => new Date(b.Date) - new Date(a.Date));

  // Fetch highlights for ALL finished matches (batched)
  useEffect(() => {
    if (!finished.length) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled(
        finished.map(m => fetchFifaHighlight(m.IdMatch, m.IdStage || FIFA_STAGE))
      );
      if (cancelled) return;
      const next = {};
      finished.forEach((m, i) => {
        const r = results[i];
        if (r.status === "fulfilled" && r.value) next[m.IdMatch] = r.value;
      });
      setHighlights(prev => ({ ...prev, ...next }));
    })();
    return () => { cancelled = true; };
  }, [finished.length]);

  const handlePlay = async (match) => {
    const h = highlights[match.IdMatch];
    if (!h?.watchPath) return;
    if (loadingId) return;
    const watchUrl = `https://www.fifa.com${h.watchPath}`;
    const hName = match.Home?.Abbreviation || "";
    const aName = match.Away?.Abbreviation || "";
    const title = `${hName} vs ${aName} · FIFA WC 2026`;
    setLoadingId(match.IdMatch);
    try {
      const res = await fetch(`${API_BASE}/api/get-stream?url=${encodeURIComponent(watchUrl)}`);
      const json = await res.json();
      if (res.ok && json.success && json.url) {
        const params = new URLSearchParams({ url: json.url, title });
        setPlayerModal({ src: `/player.html?${params}`, title });
        setLoadingId(null);
        return;
      }
    } catch {}
    setLoadingId(null);
    // Stream extraction failed — stay in-app, do NOT open external browser.
  };

  if (!finished.length) return null;

  return (
    <div className="mt-8">
      {/* Fullscreen player modal */}
      {playerModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.97)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", background: "rgba(0,0,0,0.8)", flexShrink: 0,
          }}>
            <span style={{ color: FIFA_GREEN, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em" }}>
              ▶ {playerModal.title}
            </span>
            <button onClick={() => setPlayerModal(null)} style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", borderRadius: 8, width: 32, height: 32,
              cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
          <iframe src={playerModal.src}
            style={{ flex: 1, width: "100%", border: "none" }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15 }}>⚽</span>
          <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">FIFA WC 2026 · All Matches</span>
          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider"
            style={{ background: "rgba(52,211,153,0.12)", color: FIFA_GREEN, border: "1px solid rgba(52,211,153,0.2)" }}>
            {finished.length} Played
          </span>
        </div>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3 overflow-x-auto pb-3"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(52,211,153,0.25) transparent",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {finished.map(match => (
          <FifaHighlightCard2026
            key={match.IdMatch}
            match={match}
            highlight={highlights[match.IdMatch] || null}
            loading={loadingId === match.IdMatch}
            onPlay={() => handlePlay(match)}
          />
        ))}
      </div>

      {/* Scroll hint fade-edge */}
      <style>{`
        .fifa-row::-webkit-scrollbar { height: 3px; }
        .fifa-row::-webkit-scrollbar-thumb { background: rgba(52,211,153,0.2); border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ─── INDIA MATCH HIGHLIGHTS ROW ───────────────────────────────────────────────
function IndiaHighlightCard({ match, videos, onPlay, loadingId }) {
  const INDIA_ACCENT = "#f59e0b"; // amber
  const homeCode = teamCode(match.HomeTeamCode, match.HomeTeamName);
  const awayCode = teamCode(match.AwayTeamCode, match.AwayTeamName);
  const homeLogo = match.MatchHomeTeamLogo || null;
  const awayLogo = match.MatchAwayTeamLogo || null;
  const [hImgFail, setHImgFail] = useState(false);
  const [aImgFail, setAImgFail] = useState(false);

  // Prefer "match highlights" clip, else first video
  const bestClip = Array.isArray(videos)
    ? (videos.find(v => (v.title || "").toLowerCase().includes("match highlights")) || videos[0])
    : null;

  const thumb = bestClip?.thumbnail || null;
  const isLoading = loadingId === (match.MatchID);

  // Score strings
  const homeIsFirst = String(match.FirstBattingTeamID) === String(match.HomeTeamID);
  const inn1 = match["1FallScore"] ? `${match["1FallScore"]}/${match["1FallWickets"]}` : null;
  const inn2 = match["2FallScore"] ? `${match["2FallScore"]}/${match["2FallWickets"]}` : null;
  const homeScore = homeIsFirst ? inn1 : inn2;
  const awayScore = homeIsFirst ? inn2 : inn1;

  return (
    <div
      className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        width: 220,
        background: "#0d0e0f",
        border: `1px solid rgba(245,158,11,0.12)`,
        transition: "transform 0.18s, box-shadow 0.18s",
      }}
      onClick={() => bestClip && onPlay(match, bestClip)}
    >
      {/* Thumbnail */}
      <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#111" }}>
        {thumb
          ? <img src={thumb} alt="" className="w-full h-full object-cover" style={{ display: "block" }} />
          : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1a0e00 0%, #2d1a00 50%, #1a0e00 100%)" }}>
              <span style={{ fontSize: 32 }}>🏏</span>
            </div>
          )
        }
        {/* Overlay + play button */}
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)" }}>
          {isLoading
            ? <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${INDIA_ACCENT}40`, borderTopColor: INDIA_ACCENT }} />
            : bestClip && (
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.6)", border: `2px solid ${INDIA_ACCENT}` }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill={INDIA_ACCENT}><path d="M4 2.5l10 5.5-10 5.5z"/></svg>
              </div>
            )
          }
        </div>
        {/* FT badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider"
          style={{ background: "rgba(0,0,0,0.7)", color: INDIA_ACCENT, border: `1px solid ${INDIA_ACCENT}30` }}>FT</div>
        {/* Format badge */}
        {match.MatchType && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider"
            style={{ background: "rgba(0,0,0,0.7)", color: "rgba(255,255,255,0.6)" }}>
            {match.MatchType === "One Day D/N" || match.MatchType === "One Day" ? "ODI"
              : match.MatchType === "T20" ? "T20I"
              : match.MatchType?.replace(" D/N", "") || match.MatchType}
          </div>
        )}
      </div>

      {/* Score row */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Home */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {homeLogo && !hImgFail
              ? <img src={homeLogo} alt="" className="w-7 h-7 rounded-full object-contain bg-white/5" onError={() => setHImgFail(true)} />
              : <span style={{ fontSize: 22 }}>🏏</span>
            }
            <span className="text-[10px] font-black uppercase truncate w-full text-center" style={{ color: "rgba(255,255,255,0.9)" }}>{homeCode}</span>
            {homeScore && <span className="text-[9px] font-bold text-white/50">{homeScore}</span>}
          </div>
          <span className="text-[10px] font-black text-white/30 shrink-0">vs</span>
          {/* Away */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {awayLogo && !aImgFail
              ? <img src={awayLogo} alt="" className="w-7 h-7 rounded-full object-contain bg-white/5" onError={() => setAImgFail(true)} />
              : <span style={{ fontSize: 22 }}>🏏</span>
            }
            <span className="text-[10px] font-black uppercase truncate w-full text-center" style={{ color: "rgba(255,255,255,0.9)" }}>{awayCode}</span>
            {awayScore && <span className="text-[9px] font-bold text-white/50">{awayScore}</span>}
          </div>
        </div>
        {bestClip?.title && (
          <p className="text-[8px] text-gray-600 mt-1.5 truncate">{bestClip.title}</p>
        )}
        {!bestClip && (
          <p className="text-[8px] text-gray-700 mt-1.5">Highlights loading…</p>
        )}
      </div>
    </div>
  );
}

function IndiaHighlightsRow() {
  const INDIA_ACCENT = "#f59e0b";
  const [recentMatches, setRecentMatches] = useState([]);
  const [highlights, setHighlights] = useState({}); // MatchID → video[]
  const [playerModal, setPlayerModal] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  // Fetch recent India matches
  useEffect(() => {
    const k = "india_highlights_row_v3";
    const cached = getCached(k);
    if (cached) { setRecentMatches(cached); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bcci/recent?count=30`);
        if (!res.ok) return;
        const json = await res.json();
        // Keep only India men's matches (excludes women's competition IDs)
        // Fetch 20 total so after filtering we reliably have 15 men's
        const all = (json.recentMatches || json.postMatches || []).filter(isIndiaMensMatch).slice(0, 15);
        setCache(k, all);
        setRecentMatches(all);
      } catch {}
    })();
  }, []);

  // Fetch highlights for all recent matches
  useEffect(() => {
    if (!recentMatches.length) return;
    let cancelled = false;
    (async () => {
      const targets = recentMatches.slice(0, 15);
      const results = await Promise.allSettled(
        targets.map(m => fetchIndiaHighlights(m.SmMatchID || m.MatchID))
      );
      if (cancelled) return;
      const next = {};
      targets.forEach((m, i) => {
        const r = results[i];
        if (r.status === "fulfilled" && r.value) next[m.MatchID] = r.value;
      });
      setHighlights(prev => ({ ...prev, ...next }));
    })();
    return () => { cancelled = true; };
  }, [recentMatches.length]);

  const handlePlay = async (match, vid) => {
    if (loadingId) return;
    const watchUrl = vid.shortCode
      ? `https://www.bcci.tv/bccilink/videos/${vid.shortCode}`
      : vid.urlSegment
      ? `https://www.bcci.tv/videos/${vid.urlSegment}`
      : null;
    if (!watchUrl) return;
    const title = vid.title || `${teamCode(match.HomeTeamCode, match.HomeTeamName)} vs ${teamCode(match.AwayTeamCode, match.AwayTeamName)} Highlights`;
    setLoadingId(match.MatchID);
    try {
      const res = await fetch(`${API_BASE}/api/get-stream?url=${encodeURIComponent(watchUrl)}`);
      const json = await res.json();
      if (res.ok && json.success && json.url) {
        const params = new URLSearchParams({ url: json.url, title });
        setPlayerModal({ src: `/player.html?${params}`, title });
        setLoadingId(null);
        return;
      }
    } catch {}
    setLoadingId(null);
    // Stay in-app — do NOT open an external browser tab
  };

  // Show last 15 India men's recent matches
  const displayMatches = recentMatches.slice(0, 15);

  if (!displayMatches.length) return null;

  return (
    <div className="mt-8">
      {/* Fullscreen player modal */}
      {playerModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.97)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", background: "rgba(0,0,0,0.8)", flexShrink: 0,
          }}>
            <span style={{ color: INDIA_ACCENT, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em" }}>
              ▶ {playerModal.title}
            </span>
            <button onClick={() => setPlayerModal(null)} style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", borderRadius: 8, width: 32, height: 32,
              cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
          <iframe src={playerModal.src}
            style={{ flex: 1, width: "100%", border: "none" }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15 }}>🇮🇳</span>
          <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">India Cricket · Highlights</span>
          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider"
            style={{ background: "rgba(245,158,11,0.12)", color: INDIA_ACCENT, border: "1px solid rgba(245,158,11,0.2)" }}>
            {displayMatches.length} Matches
          </span>
        </div>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3 overflow-x-auto pb-3"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(245,158,11,0.25) transparent",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {displayMatches.map(match => (
          <IndiaHighlightCard
            key={match.MatchID}
            match={match}
            videos={highlights[match.MatchID] || null}
            loadingId={loadingId}
            onPlay={handlePlay}
          />
        ))}
      </div>
    </div>
  );
}

// ─── IPL 2026 HIGHLIGHT CARD ──────────────────────────────────────────────────
// Clicking a match opens its match centre, the same as an India card does. It
// used to play the best clip straight from the card, which skipped the
// scorecard entirely — there was no route to an IPL match centre at all.
// Highlights are still one tap away: they sit below the scorecard there.
function iplMatchCenterLink(match) {
  return `/match-center/${encodeMatchHash({
    sport: "cricket",
    type: "ipl",
    matchId: String(match.smMatchId),
    homeCode: match.team1 || "",
    awayCode: match.team2 || "",
    leagueLabel: "Indian Premier League 2026",
    matchData: {
      MatchID: match.smMatchId,
      CompetitionName: "Indian Premier League 2026",
      MatchOrder: match.matchNum ? `Match ${match.matchNum}` : "",
      MatchDate: match.matchDate,
      MatchTime: match.time,
      GroundName: match.venue,
      HomeTeamName: match.team1,
      AwayTeamName: match.team2,
    },
  })}`;
}

function IplHighlightCard2026({ match, videos, loadingId }) {
  const IPL_ACCENT = "#f97316"; // IPL orange
  const [t1Fail, setT1Fail] = useState(false);
  const [t2Fail, setT2Fail] = useState(false);

  // Prefer match-highlights clip, else first video
  const bestClip = Array.isArray(videos)
    ? (videos.find(v => (v.title || "").toLowerCase().includes("match highlight")) || videos[0])
    : null;

  const thumb = bestClip?.thumbnail || null;
  const isLoading = loadingId === match.smMatchId;
  const isCompleted = match.status === "completed";

  return (
    <Link
      to={iplMatchCenterLink(match)}
      className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer group block"
      style={{
        width: 220,
        background: "#0d0a00",
        border: `1px solid rgba(249,115,22,0.15)`,
        transition: "transform 0.18s, box-shadow 0.18s",
        // No longer dimmed when there's no clip: the card now leads to a
        // scorecard, which is worth opening either way.
        opacity: 1,
      }}
    >
      {/* Thumbnail */}
      <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#111" }}>
        {thumb
          ? <img src={thumb} alt="" className="w-full h-full object-cover" style={{ display: "block" }} />
          : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1a0800 0%, #2d1200 50%, #1a0800 100%)" }}>
              <span style={{ fontSize: 32 }}>🏏</span>
            </div>
          )
        }
        {/* Overlay + play */}
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)" }}>
          {isLoading
            ? <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${IPL_ACCENT}40`, borderTopColor: IPL_ACCENT }} />
            : bestClip && (
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.65)", border: `2px solid ${IPL_ACCENT}` }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill={IPL_ACCENT}><path d="M4 2.5l10 5.5-10 5.5z"/></svg>
              </div>
            )
          }
        </div>
        {/* FT badge */}
        {isCompleted && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider"
            style={{ background: "rgba(0,0,0,0.75)", color: IPL_ACCENT, border: `1px solid ${IPL_ACCENT}30` }}>FT</div>
        )}
        {/* Match label badge */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider"
          style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.55)" }}>
          {match.matchLabel && !/^\d+$/.test(match.matchLabel)
            ? match.matchLabel.replace("Qualifier", "Q")
            : `M${match.matchNum}`
          }
        </div>
      </div>

      {/* Score row */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {match.team1Logo && !t1Fail
              ? <img src={match.team1Logo} alt="" className="w-7 h-7 rounded-full object-contain bg-white/5" onError={() => setT1Fail(true)} />
              : <span style={{ fontSize: 22 }}>🏏</span>
            }
            <span className="text-[10px] font-black uppercase truncate w-full text-center" style={{ color: "rgba(255,255,255,0.9)" }}>{match.team1}</span>
            {match.score1 && <span className="text-[9px] font-bold text-white/50">{match.score1}</span>}
          </div>
          <span className="text-[10px] font-black shrink-0" style={{ color: `${IPL_ACCENT}60` }}>vs</span>
          {/* Team 2 */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {match.team2Logo && !t2Fail
              ? <img src={match.team2Logo} alt="" className="w-7 h-7 rounded-full object-contain bg-white/5" onError={() => setT2Fail(true)} />
              : <span style={{ fontSize: 22 }}>🏏</span>
            }
            <span className="text-[10px] font-black uppercase truncate w-full text-center" style={{ color: "rgba(255,255,255,0.9)" }}>{match.team2}</span>
            {match.score2 && <span className="text-[9px] font-bold text-white/50">{match.score2}</span>}
          </div>
        </div>
        {/* clip title or result */}
        {bestClip?.title
          ? <p className="text-[8px] text-gray-600 mt-1.5 truncate">{bestClip.title}</p>
          : isCompleted && match.result
          ? <p className="text-[8px] text-gray-600 mt-1.5 truncate">{match.result}</p>
          : isCompleted
          ? <p className="text-[8px] text-gray-700 mt-1.5">Highlights loading…</p>
          : <p className="text-[8px] mt-1.5" style={{ color: `${IPL_ACCENT}70` }}>{match.matchDate}</p>
        }
      </div>
    </Link>
  );
}

// ─── IPL 2026 HIGHLIGHTS ROW ──────────────────────────────────────────────────
function IplHighlightsRow() {
  const IPL_ACCENT = "#f97316";
  const [matches, setMatches]   = useState([]);  // all IPL 2026 matches
  const [highlights, setHighlights] = useState({}); // smMatchId → videos[]

  // Fetch all IPL 2026 matches
  useEffect(() => {
    const k = "ipl_2026_all_matches_fe";
    const cached = getCached(k);
    if (cached) { setMatches(cached); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ipl/2026/all-matches`);
        if (!res.ok) return;
        const json = await res.json();
        const all = json.matches || [];
        setCache(k, all);
        setMatches(all);
      } catch {}
    })();
  }, []);

  // Completed matches, reversed (most recent first)
  const completed = [...matches]
    .filter(m => m.status === "completed")
    .reverse();

  // Lazy-fetch highlights for all completed matches
  useEffect(() => {
    if (!completed.length) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled(
        completed.map(m => fetchIplMatchHighlights(m.smMatchId))
      );
      if (cancelled) return;
      const next = {};
      completed.forEach((m, i) => {
        const r = results[i];
        if (r.status === "fulfilled" && r.value) next[m.smMatchId] = r.value;
      });
      setHighlights(prev => ({ ...prev, ...next }));
    })();
    return () => { cancelled = true; };
  }, [completed.length]);


  if (!completed.length) return null;

  return (
    <div className="mt-8">
      {/* Fullscreen player modal */}

      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15 }}>🏏</span>
          <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">IPL 2026 · All Matches</span>
          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider"
            style={{ background: "rgba(249,115,22,0.12)", color: IPL_ACCENT, border: "1px solid rgba(249,115,22,0.2)" }}>
            {completed.length} Played
          </span>
        </div>
      </div>

      {/* Horizontal scroll row — newest match first */}
      <div
        className="flex gap-3 overflow-x-auto pb-3"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(249,115,22,0.25) transparent",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {completed.map(match => (
          <IplHighlightCard2026
            key={match.smMatchId}
            match={match}
            videos={highlights[match.smMatchId] || null}
          />
        ))}
      </div>
    </div>
  );
}

// ─── CHANNEL SHORTCUT ─────────────────────────────────────────────────────────
function ChannelShortcut({ label, emoji, desc, color, bg, border, to }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl border p-3.5 transition-all active:scale-[0.98] hover:border-white/20"
      style={{background:bg, borderColor:border}}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{background:`${color}20`, border:`1px solid ${color}30`}}>
        <span style={{fontSize:20}}>{emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-white uppercase tracking-tight">{label}</p>
        <p className="text-[9px] text-gray-600 truncate">{desc}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <Tv2 size={12} style={{color}}/>
        <span className="text-[9px] font-black uppercase" style={{color}}>Watch</span>
      </div>
    </Link>
  );
}

// ─── TOURNAMENT BADGE ─────────────────────────────────────────────────────────
function TournamentBadge({ emoji, name, subtitle, color, bg, border, to }) {
  return (
    <Link to={to} className="flex flex-col gap-2 rounded-2xl border p-4 transition-all active:scale-[0.97] hover:border-white/20"
      style={{background:bg, borderColor:border}}>
      <div className="flex items-center justify-between">
        <span style={{fontSize:28}}>{emoji}</span>
        <ChevronRight size={14} style={{color}}/>
      </div>
      <div>
        <p className="text-[11px] font-black text-white uppercase tracking-tight leading-tight">{name}</p>
        <p className="text-[9px] text-gray-600 mt-0.5">{subtitle}</p>
      </div>
      <div className="h-0.5 rounded-full w-8" style={{background:color}}/>
    </Link>
  );
}

// ─── HOMEIES PAGE ─────────────────────────────────────────────────────────────
export default function Homeies({ searchTerm }) {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* Without this the page inherits index.html's site-wide title, so a live
          scores page announces itself to Google as a movie download site and can
          never rank for what it actually is. */}
      <Helmet prioritizeSeoTags>
        <title>Live Cricket Scores, IPL Points Table & Match Schedule</title>
        <meta
          name="description"
          content="Live cricket scores, ball-by-ball updates, full scorecards, points tables and fixtures for IPL, international cricket and the FIFA World Cup."
        />
        <link rel="canonical" href={absUrl('/sports')} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Live Cricket Scores, IPL Points Table & Match Schedule" />
        <meta
          property="og:description"
          content="Live scores, scorecards, points tables and fixtures for IPL, international cricket and the FIFA World Cup."
        />
        <meta property="og:url" content={absUrl('/sports')} />
        <meta name="twitter:card" content="summary_large_image" />
        {/* Breadcrumbs give Google the site's shape and can show under the result. */}
        <script type="application/ld+json">{jsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
            { '@type': 'ListItem', position: 2, name: 'Sports', item: absUrl('/sports') },
          ],
        })}</script>
      </Helmet>

      <div className="fixed inset-0 pointer-events-none z-0"
        style={{background:"radial-gradient(ellipse 70% 28% at 50% 0%, rgba(80,40,160,0.12) 0%, transparent 55%)"}}/>

      {/* ── TOP NAV ── */}
      <TopNav/>

      <main className="relative z-10 pb-24">
        {/* ── HERO ── */}
        <HeroSection/>

        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* ── LIVE / SCHEDULED / RECENT ── */}
          <div className="mt-6">
            <LiveNowStrip/>
          </div>

          {/* ── INDIA MATCH HIGHLIGHTS ── */}
          <IndiaHighlightsRow/>

          {/* ── IPL 2026 ALL MATCHES HIGHLIGHTS ── */}
          <IplHighlightsRow/>

          {/* ── FIFA WC 2026 ALL MATCHES HIGHLIGHTS ── */}
          <FifaHighlightsRow/>

          {/* ── WATCH LIVE SHORTCUTS ── */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Tv2 size={13} className="text-blue-400"/>
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Watch Live</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChannelShortcut label="Cricket Live TV" emoji="🏏"
                desc="Star Sports 1 · English & Hindi · ICC WT20 WC 2026"
                color="#8b5cf6" bg="rgba(139,92,246,0.05)" border="rgba(139,92,246,0.15)" to="/live-cricket-tv"/>
              <ChannelShortcut label="Football Live TV" emoji="⚽"
                desc="Sports18 · FIFA World Cup 2026 · English & Hindi"
                color="#1ed596" bg="rgba(30,213,150,0.05)" border="rgba(30,213,150,0.15)" to="/live-cricket-tv"/>
            </div>
          </div>

          {/* ── TOURNAMENTS ── */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={13} className="text-amber-400"/>
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Tournaments</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <TournamentBadge emoji="🏏" name="ICC WT20 WC 2026" subtitle="England · Jun–Jul 2026"
                color="#8b5cf6" bg="rgba(139,92,246,0.06)" border="rgba(139,92,246,0.15)" to="/live-cricket-tv"/>
              <TournamentBadge emoji="⚽" name="FIFA WC 2026™" subtitle="USA · Canada · Mexico"
                color="#1ed596" bg="rgba(30,213,150,0.06)" border="rgba(30,213,150,0.15)" to="/live-cricket-tv"/>
              <TournamentBadge emoji="🇮🇳" name="India Cricket" subtitle="ODI vs Afghanistan"
                color="#f59e0b" bg="rgba(245,158,11,0.05)" border="rgba(245,158,11,0.12)" to="/live-cricket-tv"/>
              <TournamentBadge emoji="📅" name="Fixtures" subtitle="All schedules"
                color="#60a5fa" bg="rgba(96,165,250,0.05)" border="rgba(96,165,250,0.12)" to="/live-cricket-tv"/>
            </div>
          </div>

          {/* ── FOOTER NOTE ── */}
          <div className="mt-10 pb-4">
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] px-4 py-3 flex items-center gap-3">
              <span className="text-lg">📡</span>
              <p className="text-[10px] text-gray-600 font-bold leading-relaxed">
                Streams are third-party embeds. Use Chrome and disable ad-blocker if the stream doesn't load. Match scores refresh every 10 minutes.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
