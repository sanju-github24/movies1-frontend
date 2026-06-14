import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Tv2, Trophy, ChevronRight, Activity, Clapperboard, Home } from "lucide-react";
import HeroSection from "./HeroSection";

const API_BASE      = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
const FIFA_API_BASE = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION = "17";
const FIFA_SEASON      = "285023";
const FIFA_STAGE       = "289273";
const WT20_SERIES_ID   = "12672";

// ─── BCCI HELPERS ─────────────────────────────────────────────────────────────
const BCCI_WOMENS_COMP_IDS = new Set([238]);
function isIndiaMensMatch(m) { return !BCCI_WOMENS_COMP_IDS.has(Number(m.CompetitionID)); }
function bcciFmt(type) {
  const MAP = { "One Day D/N":"ODI","One Day":"ODI","T20":"T20I","Test":"Test","Test D/N":"Test" };
  return MAP[type] || type || "MATCH";
}
function bcciFmtDate(s) {
  try { return new Date(s).toLocaleDateString("en-IN", { day:"numeric", month:"short", timeZone:"Asia/Kolkata" }); }
  catch { return s; }
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: isActive ? "rgba(139,92,246,0.15)" : "transparent",
                  color: isActive ? "#c4b5fd" : "#6b7280",
                  boxShadow: isActive ? "0 0 12px rgba(139,92,246,0.15)" : "none",
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

// ─── QUICK MATCH CARD ─────────────────────────────────────────────────────────
function QuickMatchCard({ sport, homeShort, awayShort, homeFlag, awayFlag,
  homeFlagImg, awayFlagImg, score, status, venue, time, tournament, result, link }) {
  const isLive     = status === "live";
  const isFinished = status === "finished";
  const accent      = sport === "cricket" ? "#8b5cf6" : "#1ed596";
  const accentBg    = sport === "cricket" ? "rgba(139,92,246,0.08)" : "rgba(30,213,150,0.08)";
  const accentBorder= sport === "cricket" ? "rgba(139,92,246,0.22)" : "rgba(30,213,150,0.22)";

  return (
    <Link to={link || "/live-cricket-tv"}
      className="block rounded-2xl border transition-all duration-200 overflow-hidden active:scale-[0.98] hover:border-white/20"
      style={{
        background: isLive ? accentBg : "rgba(255,255,255,0.02)",
        borderColor: isLive ? accentBorder : isFinished ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.06)",
        boxShadow: isLive ? `0 0 18px ${accentBg}` : "none",
      }}>
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest truncate max-w-[130px]">{tournament}</span>
          {isLive
            ? <span className="flex items-center gap-1 shrink-0"><PulsingDot color="#ef4444" size={5}/><span className="text-[8px] font-black text-red-400 uppercase">Live</span></span>
            : isFinished
              ? <span className="text-[8px] font-black text-emerald-500 uppercase shrink-0">FT</span>
              : <span className="text-[8px] text-gray-700 font-bold shrink-0">{time}</span>}
        </div>

        {/* Teams */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {homeFlagImg
              ? <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5"><img src={homeFlagImg} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/></div>
              : <span style={{fontSize:22,lineHeight:1}}>{homeFlag}</span>}
            <div className="min-w-0">
              <p className="text-[12px] font-black text-white uppercase tracking-tight">{homeShort}</p>
              {score?.home !== undefined && (isLive || isFinished) && (
                <p className="text-[10px] font-black" style={{color: isFinished ? "rgba(255,255,255,0.65)" : accent}}>{score.home}</p>
              )}
            </div>
          </div>
          <div className="shrink-0 text-center px-1">
            {(isLive||isFinished) && score?.home !== undefined
              ? <span className="text-[13px] font-black text-white/40">:</span>
              : <span className="text-[10px] font-black text-gray-700">vs</span>}
          </div>
          <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
            <div className="min-w-0 text-right">
              <p className="text-[12px] font-black text-white uppercase tracking-tight">{awayShort}</p>
              {score?.away !== undefined && score?.away !== null && (isLive || isFinished) && (
                <p className="text-[10px] font-black" style={{color: isFinished ? "rgba(255,255,255,0.65)" : accent}}>{score.away}</p>
              )}
            </div>
            {awayFlagImg
              ? <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5"><img src={awayFlagImg} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/></div>
              : <span style={{fontSize:22,lineHeight:1}}>{awayFlag}</span>}
          </div>
        </div>

        {venue && <p className="text-[8px] text-gray-700 mt-1.5 truncate">📍 {venue}</p>}
        {isFinished && result && <p className="text-[8px] font-black mt-0.5" style={{color:"#4ade80"}}>{result}</p>}
      </div>
    </Link>
  );
}

// ─── RESULT CARD (shared for cricket + football finished) ─────────────────────
function ResultCard({ sport, homeShort, awayShort, homeFlag, awayFlag, homeFlagImg, awayFlagImg,
  homeScore, awayScore, result, tournament, group, venue, link }) {
  const hWon = sport === "football" && typeof homeScore === "number" && typeof awayScore === "number" && homeScore > awayScore;
  const aWon = sport === "football" && typeof homeScore === "number" && typeof awayScore === "number" && awayScore > homeScore;

  return (
    <Link to={link || "/live-cricket-tv"}
      className="block rounded-2xl border transition-all overflow-hidden active:scale-[0.98] hover:border-white/15"
      style={{background:"rgba(255,255,255,0.02)", borderColor:"rgba(255,255,255,0.06)"}}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest truncate max-w-[150px]">
            {group ? `${group} · ` : ""}{tournament}
          </span>
          <span className="text-[8px] font-black text-emerald-500 uppercase shrink-0">FT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {homeFlagImg
              ? <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5"><img src={homeFlagImg} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/></div>
              : <span style={{fontSize:22,lineHeight:1}}>{homeFlag || "🏏"}</span>}
            <span className="text-[13px] font-black uppercase tracking-tight" style={{color: hWon ? "#4ade80" : "rgba(255,255,255,0.85)"}}>{homeShort}</span>
          </div>
          <div className="shrink-0 text-center px-1">
            {sport === "football"
              ? <span className="text-[15px] font-black text-white">{homeScore} : {awayScore}</span>
              : homeScore
                ? <div className="text-right"><p className="text-[9px] text-gray-500">{homeScore}</p>{awayScore && <p className="text-[9px] text-gray-500">{awayScore}</p>}</div>
                : <span className="text-[11px] font-black text-gray-700">vs</span>}
          </div>
          <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
            <span className="text-[13px] font-black uppercase tracking-tight" style={{color: aWon ? "#4ade80" : "rgba(255,255,255,0.85)"}}>{awayShort}</span>
            {awayFlagImg
              ? <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5"><img src={awayFlagImg} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/></div>
              : <span style={{fontSize:22,lineHeight:1}}>{awayFlag || "🏏"}</span>}
          </div>
        </div>
        {result && <p className="text-[8px] font-black mt-1.5" style={{color:"#4ade80"}}>{result}</p>}
        {venue && !result && <p className="text-[8px] text-gray-700 mt-1.5">📍 {venue}</p>}
      </div>
    </Link>
  );
}

// ─── LIVE NOW STRIP ───────────────────────────────────────────────────────────
function LiveNowStrip() {
  const [wt20All,        setWt20All]        = useState([]);
  const [fifaAll,        setFifaAll]        = useState([]);
  const [indiaLive,      setIndiaLive]      = useState([]);
  const [indiaUpcoming,  setIndiaUpcoming]  = useState([]);
  const [indiaRecent,    setIndiaRecent]    = useState([]);

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
      const res = await fetch(url, { headers: { Accept:"application/json" } });
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

  // ── Classify FIFA ──────────────────────────────────────────────────────────
  const todayStr      = new Date().toISOString().slice(0, 10);
  const fifaLive      = fifaAll.filter(m => getFifaStatus(m) === "live");
  const fifaToday     = fifaAll.filter(m => new Date(m.Date).toISOString().slice(0,10) === todayStr && getFifaStatus(m) !== "live");
  const fifaUpcoming  = fifaAll.filter(m => getFifaStatus(m) === "upcoming").sort((a,b)=>new Date(a.Date)-new Date(b.Date));
  const fifaRecent    = fifaAll.filter(m => getFifaStatus(m) === "finished").sort((a,b)=>new Date(b.Date)-new Date(a.Date));

  // ── Classify WT20 ──────────────────────────────────────────────────────────
  const wt20Live      = wt20All.filter(m => m.live);
  const wt20Recent    = wt20All.filter(m => m.recent && !m.live);
  const wt20Upcoming  = wt20All.filter(m => m.upcoming);

  // ── Live count for badge ───────────────────────────────────────────────────
  const liveCount = indiaLive.length + fifaLive.length + wt20Live.length;

  // ── Build live+today cards ─────────────────────────────────────────────────
  const liveCards = [
    // India live
    ...indiaLive.map(m => ({
      id: `ind-live-${m.MatchID}`,
      sport: "cricket",
      homeShort: m.HomeTeamCode || m.FirstBattingTeamCode || "IND",
      awayShort: m.AwayTeamCode || m.SecondBattingTeamCode || "",
      homeFlag: "🇮🇳",
      awayFlag: ICC_FLAGS[m.AwayTeamCode || m.SecondBattingTeamCode] || "🏏",
      homeFlagImg: m.MatchHomeTeamLogo || null,
      awayFlagImg: m.MatchAwayTeamLogo || null,
      status: "live",
      tournament: m.CompetitionName || "India Cricket",
      venue: m.GroundName ? `${m.GroundName}${m.city?`, ${m.city}`:""}` : "",
      score: (m["1FallScore"] || m["2FallScore"]) ? {
        home: m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]}` : null,
        away: m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]}` : null,
      } : undefined,
      link: "/live-cricket-tv",
    })),
    // WT20 live
    ...wt20Live.map(m => ({
      id: `wt20-live-${m.match_id}`,
      sport: "cricket",
      homeShort: m.teama_short || "—",
      awayShort: m.teamb_short || "—",
      homeFlag: ICC_FLAGS[m.teama_short] || "🏏",
      awayFlag: ICC_FLAGS[m.teamb_short] || "🏏",
      status: "live",
      tournament: "ICC WT20 WC 2026",
      venue: m.venue || "",
      score: m.scores?.[0] ? { home: `${m.scores[0].team_runs}/${m.scores[0].team_wickets}`, away: null } : undefined,
      link: "/live-cricket-tv",
    })),
    // FIFA live
    ...fifaLive.map(m => ({
      id: `fifa-live-${m.IdMatch}`,
      sport: "football",
      homeShort: fifaAbbr(m.Home) || "—",
      awayShort: fifaAbbr(m.Away) || "—",
      homeFlagImg: m.Home?.IdCountry ? getFifaFlag(m.Home.IdCountry) : null,
      awayFlagImg: m.Away?.IdCountry ? getFifaFlag(m.Away.IdCountry) : null,
      status: "live",
      tournament: "FIFA WC 2026",
      venue: m.Stadium?.CityName?.find(x=>x.Locale==="en-GB")?.Description || "",
      score: m.HomeTeamScore !== null && m.HomeTeamScore !== undefined ? { home: m.HomeTeamScore, away: m.AwayTeamScore } : undefined,
      link: "/live-cricket-tv",
    })),
  ];

  // ── Build scheduled (today + next upcoming) ───────────────────────────────
  const scheduledCards = [
    // India upcoming (next 2)
    ...indiaUpcoming.slice(0, 2).map(m => ({
      id: `ind-up-${m.MatchID}`,
      sport: "cricket",
      homeShort: m.HomeTeamCode || "IND",
      awayShort: m.AwayTeamCode || "",
      homeFlag: "🇮🇳",
      awayFlag: ICC_FLAGS[m.AwayTeamCode] || "🏏",
      homeFlagImg: m.MatchHomeTeamLogo || null,
      awayFlagImg: m.MatchAwayTeamLogo || null,
      status: "upcoming",
      tournament: m.CompetitionName || "India Cricket",
      venue: m.GroundName ? `${m.GroundName}${m.city?`, ${m.city}`:""}` : "",
      time: `${bcciFmtDate(m.MatchDate)} IST`,
      link: "/live-cricket-tv",
    })),
    // WT20 upcoming (next 2)
    ...wt20Upcoming.slice(0, 2).map(m => ({
      id: `wt20-up-${m.match_id}`,
      sport: "cricket",
      homeShort: m.teama_short || "—",
      awayShort: m.teamb_short || "—",
      homeFlag: ICC_FLAGS[m.teama_short] || "🏏",
      awayFlag: ICC_FLAGS[m.teamb_short] || "🏏",
      status: "upcoming",
      tournament: "ICC WT20 WC 2026",
      venue: m.venue || "",
      time: m.match_time_ist ? `${m.match_time_ist} IST` : "",
      link: "/live-cricket-tv",
    })),
    // FIFA today (not live) + next upcoming
    ...[...fifaToday, ...fifaUpcoming.slice(0, 3)].slice(0, 3).map(m => ({
      id: `fifa-up-${m.IdMatch}`,
      sport: "football",
      homeShort: fifaAbbr(m.Home) || "—",
      awayShort: fifaAbbr(m.Away) || "—",
      homeFlagImg: m.Home?.IdCountry ? getFifaFlag(m.Home.IdCountry) : null,
      awayFlagImg: m.Away?.IdCountry ? getFifaFlag(m.Away.IdCountry) : null,
      status: "upcoming",
      tournament: "FIFA WC 2026",
      venue: m.Stadium?.CityName?.find(x=>x.Locale==="en-GB")?.Description || "",
      time: fmtIST(m.Date) ? `${fmtIST(m.Date)} IST` : "",
      link: "/live-cricket-tv",
    })),
  ];

  // ── Build recent results ──────────────────────────────────────────────────
  const recentResults = [
    // India recent (last 2)
    ...indiaRecent.slice(0, 2).map(m => {
      const homeIsFirst = String(m.FirstBattingTeamID) === String(m.HomeTeamID);
      const inn1 = m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]} (${m["1FallOvers"]} ov)` : null;
      const inn2 = m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]} (${m["2FallOvers"]} ov)` : null;
      return {
        id: `ind-fin-${m.MatchID}`, sport: "cricket",
        homeShort: m.HomeTeamCode || "IND",
        awayShort: m.AwayTeamCode || "",
        homeFlag: "🇮🇳",
        awayFlag: ICC_FLAGS[m.AwayTeamCode] || "🏏",
        homeFlagImg: m.MatchHomeTeamLogo || null,
        awayFlagImg: m.MatchAwayTeamLogo || null,
        homeScore: homeIsFirst ? inn1 : inn2,
        awayScore: homeIsFirst ? inn2 : inn1,
        result: m.Comments || m.Commentss || null,
        tournament: m.CompetitionName || "India Cricket",
        venue: m.GroundName || "",
        link: "/live-cricket-tv",
      };
    }),
    // WT20 recent (last 2)
    ...wt20Recent.slice(0, 2).map(m => {
      const score = m.scores?.[0];
      return {
        id: `wt20-fin-${m.match_id}`, sport: "cricket",
        homeShort: m.teama_short || "—",
        awayShort: m.teamb_short || "—",
        homeFlag: ICC_FLAGS[m.teama_short] || "🏏",
        awayFlag: ICC_FLAGS[m.teamb_short] || "🏏",
        homeScore: score ? `${score.team_runs}/${score.team_wickets} (${score.team_overs} ov)` : null,
        result: m.match_result || null,
        tournament: "ICC WT20 WC 2026",
        venue: m.venue || "",
        link: "/live-cricket-tv",
      };
    }),
    // FIFA recent results (last 4)
    ...fifaRecent.slice(0, 4).map(m => {
      const group = m.GroupName?.find(x=>x.Locale==="en-GB")?.Description || "";
      const city  = m.Stadium?.CityName?.find(x=>x.Locale==="en-GB")?.Description || "";
      const hWon  = m.HomeTeamScore > m.AwayTeamScore;
      const aWon  = m.AwayTeamScore > m.HomeTeamScore;
      return {
        id: `fifa-fin-${m.IdMatch}`, sport: "football",
        homeShort: fifaAbbr(m.Home) || "—",
        awayShort: fifaAbbr(m.Away) || "—",
        homeFlagImg: m.Home?.IdCountry ? getFifaFlag(m.Home.IdCountry) : null,
        awayFlagImg: m.Away?.IdCountry ? getFifaFlag(m.Away.IdCountry) : null,
        homeScore: m.HomeTeamScore, awayScore: m.AwayTeamScore,
        result: hWon ? `${fifaAbbr(m.Home)} win` : aWon ? `${fifaAbbr(m.Away)} win` : "Draw",
        tournament: "FIFA WC 2026", group, venue: city,
        link: "/live-cricket-tv",
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
            {liveCards.slice(0, 6).map(c => <QuickMatchCard key={c.id} {...c}/>)}
          </div>
        </div>
      )}

      {/* ── Scheduled / Today ── */}
      {showScheduled && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span style={{fontSize:13}}>📅</span>
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">
                {showLive ? "Next Up" : "Today & Upcoming"}
              </span>
            </div>
            <Link to="/live-cricket-tv" className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors font-bold">
              Schedule <ChevronRight size={12}/>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {scheduledCards.slice(0, 6).map(c => <QuickMatchCard key={c.id} {...c}/>)}
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
            {recentResults.slice(0, 6).map(r => <ResultCard key={r.id} {...r}/>)}
          </div>
        </div>
      )}
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