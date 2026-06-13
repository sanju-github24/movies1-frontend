import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FIFA_API_BASE = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION = "17";
const FIFA_SEASON = "285023";
const FIFA_STAGE = "289273";
const WT20_SERIES_ID = "12672";
const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";

// PERMANENT LOCAL FALLBACK ASSETS 
const PERMANENT_PUBLIC_FALLBACKS = {
  cricket: "/women_t20.jpg",
  football: "/fifa_2026.webp"
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const ICC_FLAGS = {
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", SL: "🇱🇰", AUS: "🇦🇺", IND: "🇮🇳", SA: "🇿🇦",
  PAK: "🇵🇰", NZ: "🇳🇿", WI: "🏴", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", IRE: "🇮🇪",
  BAN: "🇧🇩", NED: "🇳🇱",
};
function getFifaFlagUrl(code) {
  return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`;
}
function fifaTeamName(t) {
  return t?.Abbreviation || t?.TeamName?.find(x => x.Locale === "en-GB")?.Description || "";
}
function fmtIST(d) {
  try { return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }); }
  catch { return ""; }
}
function fmtDateIST(d) {
  try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }); }
  catch { return ""; }
}
function getFifaMatchStatus(m) {
  if (m.MatchStatus === 3) return "live";
  if (m.MatchStatus !== 3 && m.HomeTeamScore !== null && m.HomeTeamScore !== undefined) return "finished";
  return "upcoming";
}

// ─── CACHE (10 min) ───────────────────────────────────────────────────────────
const _cache = {};
function getCached(k) {
  const e = _cache[k];
  return (e && Date.now() - e.ts < 600000) ? e.data : null;
}
function setCache(k, d) { _cache[k] = { data: d, ts: Date.now() }; }

// ─── PULSING DOT ──────────────────────────────────────────────────────────────
function PulsingDot({ color = "#ef4444", size = 8 }) {
  return (
    <span className="relative flex shrink-0" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-full w-full" style={{ background: color }} />
    </span>
  );
}

// ─── CRICKET BACKGROUND ───────────────────────────────────────────────────────
function CricketHeroBg({ awayShort }) {
  const aFlag = ICC_FLAGS[awayShort] || "🏏";
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 opacity-[0.035]" style={{
        backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.5) 39px,rgba(255,255,255,0.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.5) 39px,rgba(255,255,255,0.5) 40px)",
      }} />
      <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.12]">
        <span style={{ fontSize: 220, lineHeight: 1, filter: "blur(3px)" }}>{aFlag}</span>
      </div>
      <div className="absolute" style={{
        top: "-40%", right: "-10%", width: "70%", height: "200%",
        background: "conic-gradient(from 200deg at 60% 50%,transparent 0deg,rgba(139,92,246,0.07) 30deg,transparent 60deg)",
        animation: "heroSlowSpin 20s linear infinite",
      }} />
    </div>
  );
}

// ─── FOOTBALL BACKGROUND ─────────────────────────────────────────────────────
function FootballHeroBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(255,255,255,1) 49px,rgba(255,255,255,1) 50px)",
      }} />
      <div className="absolute" style={{
        top: "-50%", right: "-20%", width: "80%", height: "200%",
        background: "conic-gradient(from 200deg at 60% 50%,transparent 0deg,rgba(30,213,150,0.07) 40deg,transparent 80deg)",
        animation: "heroSlowSpin 25s linear infinite",
      }} />
    </div>
  );
}

// ─── CRICKET SLIDE ────────────────────────────────────────────────────────────
function CricketSlide({ slide }) {
  const hFlag = ICC_FLAGS[slide.homeShort] || "🏏";
  const aFlag = ICC_FLAGS[slide.awayShort] || "🏏";
  const isLive = slide.status === "live";
  const isFinished = slide.status === "finished";
  const isUpcoming = slide.status === "upcoming";
  const isTossOnly = slide.status === "toss";
  
  const bgImg = PERMANENT_PUBLIC_FALLBACKS.cricket;

  return (
    <div className="relative w-full h-full select-none">
      <div className="absolute inset-0">
        <img src={bgImg} alt="" className="w-full h-full object-cover object-center animate-fade-in" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0015] via-[#0a0015]/85 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#030007] to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#030007] to-transparent" />
      </div>

      <CricketHeroBg awayShort={slide.awayShort} />
      
      <div className="relative z-10 flex flex-col justify-end h-full px-5 sm:px-8 pb-7 pt-5">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
            style={{ background: "rgba(139,92,246,0.15)", borderColor: "rgba(139,92,246,0.3)", color: "#a78bfa" }}>
            🏏 {slide.tournament}
          </span>
          {isLive && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-red-500/15 border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest">
              <PulsingDot color="#ef4444" size={6} />
              Live · {slide.viewCount || "55L Views"}
            </span>
          )}
          {isTossOnly && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-amber-500/15 border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-widest">
              <PulsingDot color="#f59e0b" size={6} />
              Toss Done
            </span>
          )}
          {isUpcoming && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-white/5 border-white/10 text-gray-400 text-[9px] font-black uppercase tracking-widest">
              📅 {slide.dateLabel} · {slide.timeLabel} IST
            </span>
          )}
          {isFinished && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-purple-500/15 border-purple-500/30 text-purple-400 text-[9px] font-black uppercase tracking-widest">
              ✓ Final Result
            </span>
          )}
        </div>

        {/* Teams + scores */}
        <div className="flex items-end gap-3 sm:gap-5 mb-2.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <span style={{ fontSize: 36, lineHeight: 1, filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.6))" }}>{hFlag}</span>
            <div>
              <span className="text-[42px] sm:text-[64px] font-black uppercase italic tracking-tighter leading-none text-white"
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.8)" }}>
                {slide.homeShort}
              </span>
              {(isLive || isFinished) && slide.homeScore && (
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-white leading-none">{slide.homeScore}</span>
                  {slide.homeOvers && <span className="text-[10px] text-gray-400 font-bold">({slide.homeOvers})</span>}
                </div>
              )}
            </div>
          </div>
          <div className="self-center pb-1">
            <span className="text-[13px] font-black text-gray-600 uppercase tracking-widest">vs</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div>
              <span className="text-[42px] sm:text-[64px] font-black uppercase italic tracking-tighter leading-none text-white/80"
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.8)" }}>
                {slide.awayShort}
              </span>
              {(isLive || isFinished) && slide.awayScore && (
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-white leading-none">{slide.awayScore}</span>
                  {slide.awayOvers && <span className="text-[10px] text-gray-400 font-bold">({slide.awayOvers})</span>}
                </div>
              )}
            </div>
            <span style={{ fontSize: 36, lineHeight: 1, filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.6))" }}>{aFlag}</span>
          </div>
        </div>

        {/* Info */}
        <div className="mb-4 space-y-1">
          {slide.tossText && (
            <p className="text-[11px] font-black flex items-center gap-1.5" style={{ color: "#f59e0b" }}>
              🪙 {slide.tossText}
            </p>
          )}
          <p className="text-[11px] text-gray-500 font-bold">📍 {slide.venue}</p>
          {slide.result && (
            <p className="text-[11px] font-black" style={{ color: isFinished ? "#a78bfa" : "#f59e0b" }}>{slide.result}</p>
          )}
        </div>

        <Link to="/live-cricket-tv"
          className="flex items-center gap-2 w-fit px-5 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 hover:scale-[1.03]"
          style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", boxShadow: "0 0 28px rgba(139,92,246,0.45),0 4px 15px rgba(0,0,0,0.4)", color: "#fff" }}>
          <Play size={16} fill="currentColor" />
          {isLive ? "Watch Live" : isFinished ? "View Scorecard" : "Watch Now"}
        </Link>
      </div>
    </div>
  );
}

// ─── FOOTBALL SLIDE ───────────────────────────────────────────────────────────
function FootballSlide({ slide }) {
  const isLive = slide.status === "live";
  const isFinished = slide.status === "finished";
  const isUpcoming = slide.status === "upcoming";
  const hWon = isFinished && slide.homeScore > slide.awayScore;
  const aWon = isFinished && slide.awayScore > slide.homeScore;
  const isDraw = isFinished && slide.homeScore === slide.awayScore;

  const bgImg = PERMANENT_PUBLIC_FALLBACKS.football;

  return (
    <div className="relative w-full h-full select-none">
      <div className="absolute inset-0">
        <img src={bgImg} alt="" className="w-full h-full object-cover object-center animate-fade-in" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#001a0a] via-[#001a0a]/85 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#000d05] to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#000d05] to-transparent" />
      </div>

      <FootballHeroBg />
      
      <div className="relative z-10 flex flex-col justify-end h-full px-5 sm:px-8 pb-7 pt-5">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
            style={{ background: "rgba(30,213,150,0.12)", borderColor: "rgba(30,213,150,0.3)", color: "#1ed596" }}>
            ⚽ FIFA World Cup 2026™
          </span>
          {slide.group && (
            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#9ca3af" }}>
              {slide.group}
            </span>
          )}
          {isLive && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-red-500/15 border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest">
              <PulsingDot color="#ef4444" size={6} />
              {slide.minute ? `${slide.minute}'` : "Live"}
            </span>
          )}
          {isFinished && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
              ✓ Full Time
            </span>
          )}
          {isUpcoming && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-white/5 border-white/10 text-gray-400 text-[9px] font-black uppercase tracking-widest">
              📅 {slide.dateLabel} · {slide.timeLabel} IST
            </span>
          )}
        </div>

        {/* Teams + scores */}
        <div className="flex items-end gap-3 sm:gap-5 mb-2.5">
          <div className="flex items-center gap-2 sm:gap-3">
            {slide.homeFlagImg && (
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/5">
                <img src={slide.homeFlagImg} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
              </div>
            )}
            <div>
              <span className="text-[42px] sm:text-[64px] font-black uppercase italic tracking-tighter leading-none"
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.8)", color: hWon ? "#4ade80" : "white" }}>
                {slide.homeShort}
              </span>
              {(isLive || isFinished) && slide.homeScore !== undefined && slide.homeScore !== null && (
                <p className="text-2xl sm:text-3xl font-black leading-none mt-0.5"
                  style={{ color: hWon ? "#4ade80" : "white" }}>{slide.homeScore}</p>
              )}
            </div>
          </div>

          <div className="self-center pb-1">
            {(isLive || isFinished)
              ? <span className="text-2xl font-black text-white/40">:</span>
              : <span className="text-[13px] font-black text-gray-600 uppercase tracking-widest">vs</span>
            }
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div>
              <span className="text-[42px] sm:text-[64px] font-black uppercase italic tracking-tighter leading-none"
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.8)", color: aWon ? "#4ade80" : "rgba(255,255,255,0.8)" }}>
                {slide.awayShort}
              </span>
              {(isLive || isFinished) && slide.awayScore !== undefined && slide.awayScore !== null && (
                <p className="text-2xl sm:text-3xl font-black leading-none mt-0.5"
                  style={{ color: aWon ? "#4ade80" : "white" }}>{slide.awayScore}</p>
              )}
            </div>
            {slide.awayFlagImg && (
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/5">
                <img src={slide.awayFlagImg} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mb-4 space-y-1">
          {slide.venue && <p className="text-[11px] text-gray-500 font-bold">📍 {slide.venue}</p>}
          {isFinished && (
            <p className="text-[11px] font-black" style={{ color: "#4ade80" }}>
              {isDraw ? "Match drawn" : `${hWon ? slide.homeShort : slide.awayShort} win · FT ${slide.homeScore}–${slide.awayScore}`}
            </p>
          )}
          {isLive && slide.minute && (
            <p className="text-[11px] font-black text-amber-400">{slide.minute}' · Match in progress</p>
          )}
        </div>

        <Link to="/live-cricket-tv"
          className="flex items-center gap-2 w-fit px-5 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 hover:scale-[1.03]"
          style={{ background: "linear-gradient(135deg,#1ed596,#059669)", boxShadow: "0 0 28px rgba(30,213,150,0.4),0 4px 15px rgba(0,0,0,0.4)", color: "#fff" }}>
          <Play size={16} fill="currentColor" />
          {isLive ? "Watch Live" : isFinished ? "Match Highlights" : "Watch Now"}
        </Link>
      </div>
    </div>
  );
}

// ─── THUMBNAIL STRIP ─────────────────────────────────────────────────────────
function ThumbnailStrip({ slides, activeIdx, onSelect }) {
  return (
    <div className="absolute bottom-4 right-4 z-20 hidden sm:flex gap-2 items-end">
      {slides.map((slide, i) => {
        const isActive = i === activeIdx;
        const isCricket = slide.sport === "cricket";
        const accentActive = isCricket ? "rgba(139,92,246,0.7)" : "rgba(30,213,150,0.7)";
        const hFlag = isCricket ? (ICC_FLAGS[slide.homeShort] || "🏏") : "⚽";
        const aFlag = isCricket ? (ICC_FLAGS[slide.awayShort] || "🏏") : "🌍";
        const isLive = slide.status === "live";

        const stripBg = PERMANENT_PUBLIC_FALLBACKS[slide.sport];

        return (
          <button key={slide.id} onClick={() => onSelect(i)}
            className="relative rounded-xl overflow-hidden border transition-all duration-200 shrink-0 group"
            style={{
              width: 112, height: 70,
              borderColor: isActive ? accentActive : "rgba(255,255,255,0.1)",
              background: isCricket ? "#100025" : "#001a0a",
              boxShadow: isActive ? `0 0 16px ${isCricket ? "rgba(139,92,246,0.5)" : "rgba(30,213,150,0.5)"}` : "none",
              transform: isActive ? "scale(1.06)" : "scale(1)",
            }}>
            
            <div className="absolute inset-0 z-0">
              <img src={stripBg} alt="" className="w-full h-full object-cover brightness-[0.35] group-hover:scale-110 transition-transform duration-300" />
            </div>

            <div className="absolute inset-0 z-10 flex flex-col justify-between p-1.5">
              <div className="flex items-center justify-between">
                <span className="font-black rounded px-1 py-0.5 text-[7px]"
                  style={{ background: isCricket ? "rgba(139,92,246,0.25)" : "rgba(30,213,150,0.25)", color: isCricket ? "#c4b5fd" : "#6ee7b7" }}>
                  {isCricket ? "🏏 Cricket" : "⚽ Football"}
                </span>
                {isLive && (
                  <span className="flex items-center gap-0.5 bg-red-500/20 rounded px-1 py-0.5">
                    <PulsingDot color="#ef4444" size={4} />
                    <span className="text-[6px] font-black text-red-400">LIVE</span>
                  </span>
                )}
                {slide.status === "finished" && <span className="text-[6px] font-black text-emerald-400 bg-emerald-500/15 rounded px-1 py-0.5">FT</span>}
              </div>
              
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 16, lineHeight: 1 }}>{hFlag}</span>
                <div className="text-center">
                  <span className="text-[8px] font-black text-white/50 uppercase block">{slide.homeShort} vs {slide.awayShort}</span>
                  {(slide.status === "live" || slide.status === "finished") && slide.homeScore !== undefined && slide.homeScore !== null && (
                    <span className="text-[7px] font-black" style={{ color: isCricket ? "#c4b5fd" : "#6ee7b7" }}>
                      {slide.homeScore}{slide.sport === "football" ? `–${slide.awayScore}` : ""}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 16, lineHeight: 1 }}>{aFlag}</span>
              </div>
            </div>
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full z-20"
                style={{ background: isCricket ? "linear-gradient(90deg,#8b5cf6,#6d28d9)" : "linear-gradient(90deg,#1ed596,#059669)" }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
export default function HeroSection() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  
  const timerRef = useRef(null);

  // ── Build slides from live APIs ──────────────────────────────────────────
  const buildSlides = useCallback(async () => {
    const ck = "hero_slides_v2";
    const cached = getCached(ck);
    if (cached) { 
      setSlides(cached); 
      setLoading(false); 
      return; 
    }

    const built = [];

    // ── 1. WT20 matches ─────────────────────────────────────────────────────
    try {
      const res = await fetch(`${API_BASE}/api/wt20/schedule?series_ids=${WT20_SERIES_ID}&game_count=10`);
      if (res.ok) {
        const json = await res.json();
        const matches = json.data?.matches || [];
        const live = matches.filter(m => m.live);
        const recent = matches.filter(m => m.recent && !m.live);
        const upcoming = matches.filter(m => m.upcoming);
        const ordered = [...live, ...recent.slice(0, 2), ...upcoming.slice(0, 2)];

        for (const m of ordered.slice(0, 3)) {
          const homeShort = m.teama_short || m.teama_short_display_name || "—";
          const awayShort = m.teamb_short || m.teamb_short_display_name || "—";
          const score = m.scores?.[0];

          let status = "upcoming";
          if (m.live) status = "live";
          else if (m.recent) status = "finished";

          let homeScore = null, awayScore = null, homeOvers = null, awayOvers = null;
          let tossText = null, result = null;

          if (m.match_id && (status === "live" || status === "finished")) {
            try {
              const sr = await fetch(`${API_BASE}/api/wt20/scorecard?game_id=${m.match_id}`);
              if (sr.ok) {
                const sj = await sr.json();
                const sd = sj.data || sj;
                const md = sd.Matchdetail || {};
                const teams = sd.Teams || {};
                const innings = sd.Innings || [];
                const tossTeam = teams[md.Tosswonby];
                if (tossTeam) tossText = `${tossTeam.Name_Short} elected to ${md.Toss_elected_to}`;
                result = md.Status || null;

                const getScore = (short) => {
                  const inn = innings.filter(i => teams[i.Battingteam]?.Name_Short === short);
                  if (!inn.length) return null;
                  const last = inn[inn.length - 1];
                  return {
                    score: `${inn.reduce((s, i) => s + (i.Total ?? 0), 0)}/${last.Wickets ?? 0}`,
                    overs: `${last.Overs}/${last.AllottedOvers || 20}`,
                  };
                };
                const hs = getScore(homeShort);
                const as_ = getScore(awayShort);
                if (hs) { homeScore = hs.score; homeOvers = hs.overs; }
                if (as_) { awayScore = as_.score; awayOvers = as_.overs; }
              }
            } catch {}
          }

          if (!homeScore && score) {
            homeScore = `${score.team_runs}/${score.team_wickets}`;
            homeOvers = `${score.team_overs}/20`;
          }

          built.push({
            id: `wt20-${m.match_id}`,
            sport: "cricket",
            status,
            homeShort,
            awayShort,
            tournament: "ICC WT20 WC 2026",
            venue: m.venue || "England",
            homeScore,
            awayScore,
            homeOvers,
            awayOvers,
            tossText,
            result,
            dateLabel: m.start_date ? fmtDateIST(m.start_date) : "",
            timeLabel: m.match_time_ist || "",
            matchId: m.match_id,
          });
        }
      }
    } catch {}

    // ── 2. FIFA matches ──────────────────────────────────────────────────────
    try {
      const url = `${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const json = await res.json();
        const all = json.Results || [];
        const todayStr = new Date().toISOString().slice(0, 10);

        const live = all.filter(m => m.MatchStatus === 3);
        const finished = all
          .filter(m => m.MatchStatus !== 3 && m.HomeTeamScore !== null && m.HomeTeamScore !== undefined)
          .sort((a, b) => new Date(b.Date) - new Date(a.Date));
        const upcoming = all
          .filter(m => m.MatchStatus === 0 && (m.HomeTeamScore === null || m.HomeTeamScore === undefined))
          .sort((a, b) => new Date(a.Date) - new Date(b.Date));
        const todayFinished = finished.filter(m => new Date(m.Date).toISOString().slice(0, 10) === todayStr);

        const picks = [
          ...live.slice(0, 2),
          ...todayFinished.slice(0, 1),
          ...(live.length === 0 && todayFinished.length === 0 ? finished.slice(0, 1) : []),
          ...upcoming.slice(0, 2),
        ].slice(0, 3);

        for (let i = 0; i < picks.length; i++) {
          const m = picks[i];
          const status = getFifaMatchStatus(m);
          const hTeam = m.Home;
          const aTeam = m.Away;
          const hName = hTeam?.Abbreviation || fifaTeamName(hTeam) || "TBD";
          const aName = aTeam?.Abbreviation || fifaTeamName(aTeam) || "TBD";
          const group = m.GroupName?.find(x => x.Locale === "en-GB")?.Description || "";
          const city = m.Stadium?.CityName?.find(x => x.Locale === "en-GB")?.Description || "";
          const stadium = m.Stadium?.Name?.find(x => x.Locale === "en-GB")?.Description || "";

          built.push({
            id: `fifa-${m.IdMatch}`,
            sport: "football",
            status,
            homeShort: hName,
            awayShort: aName,
            homeFlagImg: hTeam?.IdCountry ? getFifaFlagUrl(hTeam.IdCountry) : null,
            awayFlagImg: aTeam?.IdCountry ? getFifaFlagUrl(aTeam.IdCountry) : null,
            tournament: "FIFA World Cup 2026™",
            group,
            venue: city ? `${city}${stadium ? ` · ${stadium}` : ""}` : stadium,
            homeScore: m.HomeTeamScore,
            awayScore: m.AwayTeamScore,
            minute: m.MatchTime || null,
            dateLabel: fmtDateIST(m.Date),
            timeLabel: fmtIST(m.Date),
          });
        }
      }
    } catch {}

    const order = { live: 0, toss: 1, finished: 2, upcoming: 3 };
    built.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));

    if (built.length > 0) {
      setCache(ck, built);
      setSlides(built);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    buildSlides();
    const t = setInterval(buildSlides, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [buildSlides]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goTo = useCallback((idx) => {
    if (idx === activeIdx || slides.length === 0) return;
    setTransitioning(true);
    setTimeout(() => { setActiveIdx(idx); setTransitioning(false); }, 280);
  }, [activeIdx, slides.length]);

  const goNext = useCallback(() => {
    if (slides.length === 0) return;
    goTo((activeIdx + 1) % slides.length);
  }, [activeIdx, goTo, slides.length]);

  const goPrev = useCallback(() => {
    if (slides.length === 0) return;
    goTo((activeIdx - 1 + slides.length) % slides.length);
  }, [activeIdx, goTo, slides.length]);

  // FIXED: Cleanup loop hook mapping to stable reference pointers to completely stop unmount memory leak crashes
  useEffect(() => {
    if (slides.length === 0) return;
    timerRef.current = setInterval(goNext, 8000);
    return () => clearInterval(timerRef.current);
  }, [goNext, slides.length]);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    if (slides.length > 0) timerRef.current = setInterval(goNext, 8000);
  };

  const handleSelect = (idx) => { goTo(idx); resetTimer(); };

  const active = slides[activeIdx];
  const isCricket = active?.sport === "cricket";

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading || !active) {
    return (
      <>
        <style>{`@keyframes heroSlowSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes heroProgress{from{width:0%}to{width:100%}}`}</style>
        <section className="relative w-full overflow-hidden" style={{ height: "clamp(340px,50vw,540px)", background: "#030007" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#0a0015 0%,#100025 50%,rgba(139,92,246,0.1) 100%)" }} />
          <div className="relative z-10 flex flex-col justify-end h-full px-5 sm:px-8 pb-7 pt-5">
            <div className="h-5 w-32 rounded-full bg-white/5 animate-pulse mb-3" />
            <div className="h-14 w-56 rounded-xl bg-white/5 animate-pulse mb-4" />
            <div className="h-4 w-44 rounded bg-white/5 animate-pulse mb-6" />
            <div className="h-11 w-36 rounded-2xl bg-purple-900/30 animate-pulse" />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes heroSlowSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes heroProgress{from{width:0%}to{width:100%}}
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <section className="relative w-full overflow-hidden" style={{ height: "clamp(340px,50vw,540px)", background: "#030007" }}>

        {/* Slide contents canvas layout stack frame */}
        <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: transitioning ? 0 : 1 }}>
          {isCricket
            ? <CricketSlide slide={active} />
            : <FootballSlide slide={active} />
          }
        </div>

        {/* Left arrow navigation trigger controls */}
        <button onClick={() => { goPrev(); resetTimer(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center border transition-all hover:scale-110 active:scale-95"
          style={{ background: "rgba(0,0,0,0.55)", borderColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
          <ChevronLeft size={17} className="text-white" />
        </button>

        {/* Right arrow desktop layout mapping offsets contextually */}
        <button onClick={() => { goNext(); resetTimer(); }}
          className="hidden sm:flex absolute top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full items-center justify-center border transition-all hover:scale-110 active:scale-95"
          style={{ right: slides.length > 1 ? "calc(0.75rem + 356px)" : "0.75rem", background: "rgba(0,0,0,0.55)", borderColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
          <ChevronRight size={17} className="text-white" />
        </button>

        {/* Right arrow mobile layout controls */}
        <button onClick={() => { goNext(); resetTimer(); }}
          className="sm:hidden absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center border transition-all hover:scale-110 active:scale-95"
          style={{ background: "rgba(0,0,0,0.55)", borderColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
          <ChevronRight size={17} className="text-white" />
        </button>

        {/* Progress dots mobile layouts context */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:hidden">
            {slides.map((_, i) => (
              <button key={i} onClick={() => handleSelect(i)} className="rounded-full transition-all"
                style={{
                  width: i === activeIdx ? 20 : 6, height: 6,
                  background: i === activeIdx ? (isCricket ? "#8b5cf6" : "#1ed596") : "rgba(255,255,255,0.2)",
                }} />
            ))}
          </div>
        )}

        {/* Thumbnail strip desktop grids panel wrapper */}
        {slides.length > 1 && (
          <ThumbnailStrip slides={slides} activeIdx={activeIdx} onSelect={handleSelect} />
        )}

        {/* Linear progress loading ticker overlay bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] z-30 bg-white/[0.04]">
          <div key={`${activeIdx}-${active.id}`}
            style={{
              height: "100%", borderRadius: "9999px",
              background: isCricket ? "linear-gradient(90deg,#8b5cf6,#6d28d9)" : "linear-gradient(90deg,#1ed596,#059669)",
              animation: "heroProgress 8s linear forwards",
            }} />
        </div>
      </section>
    </>
  );
}