import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, Trophy, Star, AlertCircle,
  Tv2, Signal, RotateCcw
} from "lucide-react";

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
const BCCI_FORMAT_COLORS = {
  ODI:  { color:"#f59e0b", bg:"rgba(245,158,11,0.08)", border:"rgba(245,158,11,0.2)" },
  T20I: { color:"#a78bfa", bg:"rgba(167,139,250,0.08)", border:"rgba(167,139,250,0.2)" },
  Test: { color:"#f87171", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.2)" },
};
function bcciFmt(type) { return BCCI_FORMAT_LABEL[type] || type || "MATCH"; }
function bcciFmtColors(type) { return BCCI_FORMAT_COLORS[bcciFmt(type)] || BCCI_FORMAT_COLORS.ODI; }
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

/* ─── ATOMS ───────────────────────────────────────────────────────────────── */
function PulsingDot({ color="#ef4444", size=8 }) {
  return (
    <span className="relative flex shrink-0" style={{width:size,height:size}}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{background:color}}/>
      <span className="relative inline-flex rounded-full h-full w-full" style={{background:color}}/>
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full">
      <PulsingDot color="#ef4444" size={6}/> Live
    </span>
  );
}

/* ─── BALL CHIP — wider, easier to read ──────────────────────────────────── */
function BallChip({ label, small=false }) {
  const l = String(label).toUpperCase();
  const sz = small ? 36 : 42;
  const fs = l.length > 2 ? 9 : l.length > 1 ? 11 : 15;
  let bg = "rgba(255,255,255,0.05)";
  let border = "rgba(255,255,255,0.1)";
  let color = "#6b7280";

  if (l === "W")           { bg = "#dc2626"; border = "#b91c1c"; color = "#fff"; }
  else if (l === "4")      { bg = "#2563eb"; border = "#1d4ed8"; color = "#fff"; }
  else if (l === "6")      { bg = "#059669"; border = "#047857"; color = "#fff"; }
  else if (l.includes("NB")) { bg = "rgba(217,119,6,0.9)"; border = "#b45309"; color = "#fff"; }
  else if (l.includes("WD")) { bg = "rgba(68,64,60,0.8)"; border = "#57534e"; color = "#78716c"; }
  else if (l === "·" || l === "0") { color = "#374151"; }

  return (
    <span
      className="flex items-center justify-center rounded-full font-semibold shrink-0 select-none"
      style={{
        backgroundColor: bg, borderColor: border, color,
        width: sz, height: sz, fontSize: fs,
        border: `1.5px solid ${border}`,
        letterSpacing: 0,
        lineHeight: 1,
      }}
    >
      {l === "0" ? "·" : l}
    </span>
  );
}

/* ─── STAT ROW ────────────────────────────────────────────────────────────── */
function StatRow({ label, value, color="#e5e7eb", sub }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05]">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold" style={{color}}>{value}</span>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── TAB BAR ─────────────────────────────────────────────────────────────── */
function TabBar({ tabs, active, onChange, accent }) {
  return (
    <div className="flex gap-2 mb-6 p-1 rounded-2xl" style={{background:"rgba(255,255,255,0.04)"}}>
      {tabs.map(({k,l}) => (
        <button key={k} onClick={() => onChange(k)}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all"
          style={{
            background: active === k ? accent + "15" : "transparent",
            color: active === k ? accent : "#6b7280",
            border: `1px solid ${active === k ? accent + "30" : "transparent"}`,
          }}>
          {l}
        </button>
      ))}
    </div>
  );
}

/* ─── TEAM INNINGS CARD ───────────────────────────────────────────────────── */
function InningsCard({ code, name, logo, runs, wkts, overs, matchOvers, rr, isBatting, isWinner, isFinished, meta }) {
  const hasScore = !!runs;
  return (
    <div className="flex items-center gap-5 rounded-2xl px-5 py-5 transition-all"
      style={{
        background: isBatting
          ? `linear-gradient(135deg,${meta.primary}18 0%,${meta.primary}06 100%)`
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${
          isBatting ? `${meta.primary}35`
          : isWinner ? "rgba(74,222,128,0.2)"
          : "rgba(255,255,255,0.06)"
        }`,
      }}>
      {/* badge */}
      <div className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center overflow-hidden border border-white/10"
        style={{background:`${meta.primary}12`}}>
        {logo
          ? <img src={logo} alt="" className="w-full h-full object-contain p-1.5"
              onError={e=>{e.target.style.display="none";}}/>
          : <span style={{fontSize:36}}>{meta.flag}</span>
        }
      </div>

      {/* info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-2xl font-semibold tracking-tight" style={{color: isWinner ? "#4ade80" : "white"}}>{code}</span>
          {isBatting && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{background:"rgba(251,191,36,0.12)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.25)"}}>
              Batting
            </span>
          )}
          {isWinner && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{background:"rgba(74,222,128,0.12)",color:"#4ade80",border:"1px solid rgba(74,222,128,0.25)"}}>
              Won
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{name}</p>
        {rr && parseFloat(rr) > 0 && isBatting && (
          <p className="text-xs text-gray-400">CRR {parseFloat(rr).toFixed(2)}</p>
        )}
      </div>

      {/* score */}
      <div className="text-right shrink-0">
        {hasScore ? (
          <>
            <div className="text-4xl font-semibold leading-none" style={{color: isWinner ? "#4ade80" : "white"}}>
              {runs}<span className="text-2xl text-gray-500">/{wkts}</span>
            </div>
            {overs && (
              <p className="text-xs text-gray-500 mt-1">{overs} / {matchOvers} ov</p>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-600 font-medium">Yet to bat</span>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   BCCI CRICKET MATCH CENTER
════════════════════════════════════════════════════════════════════════════ */
function BcciMatchCenter({ matchData }) {
  const [sc, setSc]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("summary");
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown]   = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
  const matchRef = useRef(matchData);
  useEffect(() => { matchRef.current = matchData; }, [matchData]);

  const load = useCallback(async (silent=false) => {
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
    } catch(e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t=setInterval(()=>load(true),30000); return ()=>clearInterval(t); }, [load]);
  useEffect(() => { const t=setInterval(()=>setCountdown(c=>c<=1?30:c-1),1000); return ()=>clearInterval(t); }, [lastUpdate]);

  const rawMd = sc?.postMatch?.[0] || sc?.liveMatch?.[0] || sc?.upcomingMatch?.[0] || matchData;
  const isLive = rawMd?.MatchStatus==="Live" || sc?.matchStatus==="live";
  const isFinished = !isLive && (rawMd?.WinningTeamID || rawMd?.MatchStatus==="Result" || rawMd?.MatchStatus==="Post" || sc?.matchStatus==="post" || !!rawMd?.Comments);
  const fmt = bcciFmt(rawMd?.MatchType||matchData.MatchType);
  const fmtC = bcciFmtColors(rawMd?.MatchType||matchData.MatchType);
  const curInn = String(rawMd?.CurrentInnings||"1");

  const firstBatCode  = rawMd?.FirstBattingTeamCode||"";
  const secondBatCode = rawMd?.SecondBattingTeamCode||"";
  const firstBatName  = rawMd?.FirstBattingTeamName||"";
  const secondBatName = rawMd?.SecondBattingTeamName||"";
  const firstBatId    = String(rawMd?.FirstBattingTeamID||"1");
  const secondBatId   = String(rawMd?.SecondBattingTeamID||"2");
  const homeId        = String(rawMd?.HomeTeamID||"");
  const awayId        = String(rawMd?.AwayTeamID||"");

  function teamLogo(id) {
    if (String(id)===homeId) return rawMd?.MatchHomeTeamLogo||"";
    if (String(id)===awayId) return rawMd?.MatchAwayTeamLogo||"";
    return "";
  }

  const innRows = [
    { id:firstBatId,  code:firstBatCode,  name:firstBatName,  num:"1", runs:rawMd?.["1FallScore"]||"", wkts:rawMd?.["1FallWickets"]||"0", overs:rawMd?.["1FallOvers"]||"", rr:rawMd?.["1RunRate"]||"" },
    { id:secondBatId, code:secondBatCode, name:secondBatName, num:"2", runs:rawMd?.["2FallScore"]||"", wkts:rawMd?.["2FallWickets"]||"0", overs:rawMd?.["2FallOvers"]||"", rr:rawMd?.["2RunRate"]||"" },
  ];
  const matchOvers   = rawMd?.MATCH_NO_OF_OVERS||"50";
  const tossText     = rawMd?.TossDetails||rawMd?.TossText||"";
  const chasingText  = rawMd?.ChasingText||"";
  const resultComment = (rawMd?.Comments||rawMd?.Commentss||"").trim();

  const scorecardInn = sc?.scorecardData?.innings||sc?.innings||[];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{borderColor:`${fmtC.color}20`,borderTopColor:fmtC.color}}/>
      <p className="text-sm text-gray-600 font-medium">Loading match data</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── HERO CARD ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08]"
        style={{background:"linear-gradient(170deg,#0d0d1c 0%,#080810 100%)"}}>

        <div className="absolute inset-0 pointer-events-none"
          style={{background:`radial-gradient(ellipse 70% 45% at 50% 0%,${fmtC.color}12 0%,transparent 60%)`}}/>

        {/* ── TOP META BAR ── */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full"
              style={{background:fmtC.bg,color:fmtC.color,border:`1px solid ${fmtC.border}`}}>
              {fmt}
            </span>
            <span className="text-sm text-gray-500">{rawMd?.CompetitionName||matchData.CompetitionName}</span>
            <span className="text-gray-700 hidden sm:inline">·</span>
            <span className="text-sm text-gray-600 hidden sm:inline">{rawMd?.MatchOrder||matchData.MatchOrder}</span>
          </div>
          <div className="flex items-center gap-3">
            {isLive
              ? <LiveBadge/>
              : isFinished
                ? <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">Result</span>
                : <span className="text-xs font-medium text-gray-500">Upcoming</span>
            }
            <button onClick={()=>load()}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:text-white hover:bg-white/5 transition-all ${refreshing?"animate-spin":""}`}>
              <RefreshCw size={14}/>
            </button>
          </div>
        </div>

        {/* ── VENUE + TOSS ── */}
        <div className="relative px-6 py-3 border-b border-white/[0.04] flex items-center gap-3 flex-wrap">
          <span className="text-base">📍</span>
          <span className="text-sm text-gray-500">
            {rawMd?.GroundName||matchData.GroundName}{rawMd?.city?`, ${rawMd.city}`:""}
          </span>
          {tossText && (
            <>
              <span className="text-gray-700">·</span>
              <span className="text-sm text-gray-600">🪙 {tossText}</span>
            </>
          )}
        </div>

        {/* ── INNINGS ROWS ── */}
        <div className="relative p-5 space-y-3">
          {innRows.map(({ id, code, name, num, runs, wkts, overs, rr }) => {
            const isBatting = isLive && num===curInn;
            const isWinner  = isFinished && String(rawMd?.WinningTeamID)===String(id);
            const meta      = getIccTeam(code);
            const logo      = teamLogo(id);
            return (
              <InningsCard key={num} {...{code,name,logo,runs,wkts,overs,matchOvers,rr,isBatting,isWinner,isFinished,meta}}/>
            );
          })}
        </div>

        {/* ── LIVE PLAYERS ── */}
        {isLive && rawMd?.CurrentStrikerName && (
          <div className="relative border-t border-white/[0.06] px-6 py-5 space-y-4"
            style={{background:"rgba(0,0,0,0.2)"}}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">At the Crease</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Striker */}
              <div className="flex items-center gap-4 rounded-2xl p-4"
                style={{background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.15)"}}>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                  {rawMd.StrikerImage && <img src={rawMd.StrikerImage} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-400 font-medium">★ On strike</span>
                  </div>
                  <p className="text-base font-semibold text-white truncate">{rawMd.CurrentStrikerName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xl font-semibold text-white">{rawMd.StrikerRuns}</span>
                    <span className="text-sm text-gray-500">({rawMd.StrikerBalls}b)</span>
                    {rawMd.StrikerFours > 0 && <span className="text-xs text-blue-400">{rawMd.StrikerFours}×4</span>}
                    {rawMd.StrikerSixes > 0 && <span className="text-xs text-violet-400">{rawMd.StrikerSixes}×6</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">SR</p>
                  <p className="text-sm font-semibold text-white">{rawMd.StrikerSR}</p>
                </div>
              </div>

              {/* Non-striker */}
              {rawMd.CurrentNonStrikerName && (
                <div className="flex items-center gap-4 rounded-2xl p-4"
                  style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                    {rawMd.NonStrikerImage && <img src={rawMd.NonStrikerImage} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 font-medium">○ Non-striker</span>
                    <p className="text-base font-semibold text-gray-300 truncate">{rawMd.CurrentNonStrikerName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-semibold text-gray-300">{rawMd.NonStrikerRuns}</span>
                      <span className="text-sm text-gray-600">({rawMd.NonStrikerBalls}b)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bowler */}
            {rawMd.CurrentBowlerName && (
              <div className="flex items-center gap-4 rounded-2xl p-4"
                style={{background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.15)"}}>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                  {rawMd.BowlerImage && <img src={rawMd.BowlerImage} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-blue-400 font-medium">● Bowling</span>
                  <p className="text-base font-semibold text-white truncate">{rawMd.CurrentBowlerName}</p>
                </div>
                <div className="flex items-center gap-6 text-right shrink-0">
                  <div>
                    <p className="text-xs text-gray-500">Figures</p>
                    <p className="text-base font-semibold text-white">{rawMd.BowlerWickets}W — {rawMd.BowlerRuns}R</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Overs</p>
                    <p className="text-base font-semibold text-white">{rawMd.BowlerOvers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Eco</p>
                    <p className="text-base font-semibold text-white">{parseFloat(rawMd.BowlerEconomy||0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHASING / RESULT ── */}
        {(chasingText||resultComment) && (
          <div className="relative border-t border-white/[0.06] px-6 py-5 text-center"
            style={{background: isFinished ? "rgba(74,222,128,0.04)" : "transparent"}}>
            {isFinished && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <Trophy size={15} className="text-amber-400"/>
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Match Result</span>
              </div>
            )}
            <p className="text-lg font-semibold" style={{color: isLive ? "#fbbf24" : "#4ade80"}}>
              {resultComment||chasingText}
            </p>
            {rawMd?.MOM && (
              <div className="flex items-center justify-center gap-2.5 mt-4 pt-4 border-t border-white/5">
                <Star size={13} className="text-amber-400"/>
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Player of the Match</span>
                <span className="text-sm font-semibold text-white">{rawMd.MOM}</span>
                {rawMd.MOMRuns && rawMd.MOMRuns!=="-" && <span className="text-xs text-gray-500">{rawMd.MOMRuns}R</span>}
                {rawMd.MOMWicket && rawMd.MOMWicket!=="-" && <span className="text-xs text-gray-500">{rawMd.MOMWicket}W</span>}
              </div>
            )}
          </div>
        )}

        {/* ── UPCOMING ── */}
        {!isLive && !isFinished && !innRows[0].runs && (
          <div className="relative border-t border-white/[0.06] px-6 py-8 text-center space-y-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Match starts</p>
            <p className="text-3xl font-semibold text-white">{bcciFmtDate(rawMd?.MatchDate||matchData.MatchDate)}</p>
            <p className="text-base text-gray-500">{rawMd?.CustomMatchTime||rawMd?.MatchTime||matchData.MatchTime} IST</p>
          </div>
        )}

        {/* countdown */}
        {isLive && (
          <div className="relative px-6 py-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-xs text-gray-700">Auto-refreshes every 30s</span>
            <span className="text-xs font-semibold" style={{color:fmtC.color}}>{countdown}s</span>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <TabBar
        tabs={[{k:"summary",l:"Summary"},{k:"batting",l:"Batting"},{k:"bowling",l:"Bowling"}]}
        active={tab} onChange={setTab} accent={fmtC.color}
      />

      {/* ── SUMMARY TAB ── */}
      {tab==="summary" && (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <StatRow label="Format" value={fmt} color={fmtC.color}/>
          <StatRow label="Match" value={rawMd?.MatchOrder||matchData.MatchOrder}/>
          <StatRow label="Venue" value={`${rawMd?.GroundName||matchData.GroundName}${rawMd?.city?`, ${rawMd.city}`:""}`} color="#9ca3af"/>
          {tossText && <StatRow label="Toss" value={tossText} color="#9ca3af"/>}
          <StatRow label="Overs" value={matchOvers}/>
          {innRows[0].runs && <StatRow label={`${innRows[0].code} — 1st Innings`} value={`${innRows[0].runs}/${innRows[0].wkts}`} sub={`${innRows[0].overs} overs`}/>}
          {innRows[1].runs && <StatRow label={`${innRows[1].code} — 2nd Innings`} value={`${innRows[1].runs}/${innRows[1].wkts}`} sub={`${innRows[1].overs} overs`}/>}
          {innRows[0].rr && <StatRow label="1st Inn Run Rate" value={parseFloat(innRows[0].rr).toFixed(2)} color="#4ade80"/>}
          {innRows[1].rr && <StatRow label="2nd Inn Run Rate" value={parseFloat(innRows[1].rr).toFixed(2)} color="#4ade80"/>}
          <StatRow label="Date" value={bcciFmtDate(rawMd?.MatchDate||matchData.MatchDate)} color="#9ca3af"/>
        </div>
      )}

      {/* ── BATTING TAB ── */}
      {tab==="batting" && (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          {scorecardInn.length > 0 ? scorecardInn.map((inn,idx) => {
            const batting = inn.batting||inn.BattingCard||[];
            if (!batting.length) return null;
            return (
              <div key={idx}>
                <div className="px-5 py-3 border-b border-white/5" style={{background:"rgba(255,255,255,0.02)"}}>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Innings {idx+1}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {["Batter","Dismissal","R","B","4s","6s","SR"].map((h,i) => (
                          <th key={h} className={`py-3 text-xs font-semibold text-gray-600 uppercase tracking-widest
                            ${i===0?"pl-5 text-left":"text-right px-3"}
                            ${i===6?"pr-5":""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batting.map((b,i) => {
                        const name = b.PlayerName||b.BatsmanName||b.Name||"—";
                        const isBatting = b.IsBatting||b.isNotOut||(b.OutDesc||"").toLowerCase()==="not out";
                        const outDesc = b.OutDesc||b.DismissalText||b.HowOut||(isBatting?"not out":"—");
                        return (
                          <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                            <td className="pl-5 py-3.5">
                              <span className={`text-sm font-medium ${isBatting?"text-amber-400":"text-gray-300"}`}>
                                {name}{isBatting?" ★":""}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-xs text-gray-500 max-w-[100px] truncate">{outDesc}</td>
                            <td className="px-3 py-3.5 text-right text-sm font-semibold text-white">{b.Runs??"—"}</td>
                            <td className="px-3 py-3.5 text-right text-sm text-gray-500">{b.Balls??"—"}</td>
                            <td className="px-3 py-3.5 text-right text-sm text-blue-400">{b.Fours??"—"}</td>
                            <td className="px-3 py-3.5 text-right text-sm text-violet-400">{b.Sixes??"—"}</td>
                            <td className="pr-5 py-3.5 text-right text-sm text-gray-500">{b.StrikeRate??"—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }) : (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-600">Detailed batting scorecard not available</p>
              <p className="text-xs text-gray-700 mt-1">Scores shown in Summary</p>
            </div>
          )}
        </div>
      )}

      {/* ── BOWLING TAB ── */}
      {tab==="bowling" && (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          {scorecardInn.length > 0 ? scorecardInn.map((inn,idx) => {
            const bowling = inn.bowling||inn.BowlingCard||[];
            if (!bowling.length) return null;
            return (
              <div key={idx}>
                <div className="px-5 py-3 border-b border-white/5" style={{background:"rgba(255,255,255,0.02)"}}>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Innings {idx+1}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {["Bowler","O","M","R","W","Eco"].map((h,i) => (
                          <th key={h} className={`py-3 text-xs font-semibold text-gray-600 uppercase tracking-widest
                            ${i===0?"pl-5 text-left":"text-right px-3"}
                            ${i===5?"pr-5":""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bowling.map((b,i) => {
                        const name = b.PlayerName||b.BowlerName||b.Name||"—";
                        const isCur = b.IsBowling||b.isCurrentBowler||false;
                        return (
                          <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                            <td className="pl-5 py-3.5">
                              <span className={`text-sm font-medium ${isCur?"text-blue-400":"text-gray-300"}`}>
                                {name}{isCur?" ●":""}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-right text-sm text-white">{b.Overs??"—"}</td>
                            <td className="px-3 py-3.5 text-right text-sm text-gray-500">{b.Maidens??"—"}</td>
                            <td className="px-3 py-3.5 text-right text-sm font-semibold text-white">{b.Runs??"—"}</td>
                            <td className="px-3 py-3.5 text-right text-sm font-semibold text-emerald-400">{b.Wickets??"—"}</td>
                            <td className="pr-5 py-3.5 text-right text-sm text-gray-500">{b.Economy??"—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }) : (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-600">Detailed bowling scorecard not available</p>
            </div>
          )}
        </div>
      )}

      {lastUpdate && (
        <p className="text-xs text-gray-700 text-center pt-2">
          Updated {lastUpdate.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})} IST
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   WT20 MATCH CENTER
════════════════════════════════════════════════════════════════════════════ */
function Wt20MatchCenter({ matchId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("summary");
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown]   = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
  const idRef = useRef(matchId);

  const load = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const r = await fetch(`${API_BASE}/api/wt20/scorecard?game_id=${idRef.current}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j.data||j); setLastUpdate(new Date()); setCountdown(30); setError(null);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t=setInterval(()=>load(true),30000); return ()=>clearInterval(t); }, [load]);
  useEffect(() => { const t=setInterval(()=>setCountdown(c=>c<=1?30:c-1),1000); return ()=>clearInterval(t); }, [lastUpdate]);

  const ACCENT = "#a78bfa";
  const ACCENT_BG = "rgba(167,139,250,0.08)";
  const ACCENT_BORDER = "rgba(167,139,250,0.2)";

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{borderColor:`${ACCENT}20`,borderTopColor:ACCENT}}/>
      <p className="text-sm text-gray-600 font-medium">Loading match data</p>
    </div>
  );
  if (error||!data) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
      <AlertCircle size={28} className="text-red-500/50"/>
      <p className="text-sm text-gray-600">{error||"No data"}</p>
      <button onClick={()=>load()} className="px-5 py-2.5 rounded-xl border text-sm font-medium"
        style={{borderColor:ACCENT_BORDER,color:ACCENT}}>Try again</button>
    </div>
  );

  const md      = data.Matchdetail||{};
  const series  = md.Series||{};
  const venue   = md.Venue||{};
  const teams   = data.Teams||{};
  const innings = data.Innings||[];
  const isLive  = md.Match?.Live===true;
  const isComplete = !isLive && innings.some(inn=>inn.Total);
  const homeId  = md.Team_Home; const awayId = md.Team_Away;
  const homeTeam = teams[homeId]; const awayTeam = teams[awayId];
  const tossWon  = teams[md.Tosswonby];

  // Current over balls
  const currentInn = innings[0];
  const curBowler  = currentInn?.Bowlers?.find(b=>b.Isbowlingnow);
  const thisOver   = curBowler?.ThisOver||[];

  return (
    <div className="space-y-4">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08]"
        style={{background:"linear-gradient(170deg,#0d0a1f 0%,#080810 100%)"}}>
        <div className="absolute inset-0 pointer-events-none"
          style={{background:`radial-gradient(ellipse 70% 45% at 50% 0%,rgba(167,139,250,0.15) 0%,transparent 60%)`}}/>

        {/* top bar */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full"
              style={{background:ACCENT_BG,color:ACCENT,border:`1px solid ${ACCENT_BORDER}`}}>T20I</span>
            <span className="text-sm text-gray-500">{series.Series_short_display_name||"ICC WT20 WC 2026"}</span>
          </div>
          <div className="flex items-center gap-3">
            {isLive ? <LiveBadge/> : isComplete
              ? <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">Result</span>
              : <span className="text-xs font-medium text-gray-500">Upcoming</span>
            }
            <button onClick={()=>load()}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:text-white hover:bg-white/5 transition-all ${refreshing?"animate-spin":""}`}>
              <RefreshCw size={14}/>
            </button>
          </div>
        </div>

        {/* venue + toss */}
        <div className="relative px-6 py-3 border-b border-white/[0.04] flex items-center gap-3 flex-wrap">
          <span className="text-base">📍</span>
          <span className="text-sm text-gray-500">{venue.Name}</span>
          {tossWon && (
            <>
              <span className="text-gray-700">·</span>
              <span className="text-sm text-gray-600">🪙 {tossWon.Name_Short} elected to {md.Toss_elected_to}</span>
            </>
          )}
        </div>

        {/* innings */}
        <div className="relative p-5 space-y-3">
          {[{id:homeId,team:homeTeam},{id:awayId,team:awayTeam}].map(({id,team}) => {
            const meta = getIccTeam(team?.Name_Short||"");
            const myInn = innings.find(i=>i.Battingteam===id);
            const isBatting = isLive && myInn && !myInn.Wkt_lost_count?.includes("10");
            const isWinner  = isComplete && md.Match?.Winner===id;
            const hasScore  = myInn?.Total!==undefined && myInn?.Total!=="";
            return (
              <div key={id} className="flex items-center gap-5 rounded-2xl px-5 py-5 transition-all"
                style={{
                  background: isBatting ? `linear-gradient(135deg,${meta.primary}18 0%,${meta.primary}06 100%)` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isBatting?`${meta.primary}35`:isWinner?"rgba(74,222,128,0.2)":"rgba(255,255,255,0.06)"}`,
                }}>
                <div className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center border border-white/10"
                  style={{background:`${meta.primary}12`}}>
                  <span style={{fontSize:36}}>{meta.flag}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-2xl font-semibold tracking-tight" style={{color:isWinner?"#4ade80":"white"}}>
                      {team?.Name_Short||"—"}
                    </span>
                    {isBatting && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{background:"rgba(251,191,36,0.12)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.25)"}}>
                        Batting
                      </span>
                    )}
                    {isWinner && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{background:"rgba(74,222,128,0.12)",color:"#4ade80",border:"1px solid rgba(74,222,128,0.25)"}}>
                        Won
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{team?.Name_Full||"—"}</p>
                </div>
                <div className="text-right shrink-0">
                  {hasScore ? (
                    <>
                      <div className="text-4xl font-semibold leading-none" style={{color:isWinner?"#4ade80":"white"}}>
                        {myInn.Total}<span className="text-2xl text-gray-500">/{myInn.Wickets}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{myInn.Overs}/{myInn.AllottedOvers} ov</p>
                    </>
                  ) : (
                    <span className="text-sm text-gray-600 font-medium">Yet to bat</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── THIS OVER (ball by ball) ── */}
        {isLive && thisOver.length > 0 && (
          <div className="relative border-t border-white/[0.06] px-6 py-5"
            style={{background:"rgba(0,0,0,0.2)"}}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">This Over</p>
              {curBowler && (
                <span className="text-xs text-gray-500">
                  {teams[currentInn?.Bowlingteam]?.Players?.[curBowler.Bowler]?.Name_Short||""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {thisOver.map((ball,i) => {
                const runs = String(ball.B??"");
                const type = String(ball.T??"").toLowerCase();
                let label = runs==="0"?"·":runs;
                if (type==="wk"||type==="w") label="W";
                else if (type==="wd") label="WD";
                else if (type==="nb") label=`${runs}nb`;
                return <BallChip key={i} label={label}/>;
              })}
              {Array.from({length:Math.max(0,6-thisOver.length)}).map((_,i) => (
                <span key={`e-${i}`} className="flex items-center justify-center rounded-full shrink-0"
                  style={{
                    width:42, height:42,
                    background:"rgba(255,255,255,0.02)",
                    border:"1.5px dashed rgba(255,255,255,0.08)",
                  }}/>
              ))}
              {/* over total */}
              <div className="ml-4 pl-4 border-l border-white/10">
                <p className="text-xs text-gray-600">Over total</p>
                <p className="text-base font-semibold text-white">
                  {thisOver.reduce((s,b)=>{
                    const n=parseInt(b.B||0)||0;
                    const t=String(b.T||"").toLowerCase();
                    return t==="wd"||t==="nb" ? s+n : s+n;
                  },0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* result */}
        {md.Status && (
          <div className="relative border-t border-white/[0.06] px-6 py-5 text-center"
            style={{background:isComplete&&!isLive?"rgba(74,222,128,0.04)":"transparent"}}>
            {isComplete&&!isLive && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <Trophy size={15} className="text-amber-400"/>
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Match Result</span>
              </div>
            )}
            <p className="text-lg font-semibold" style={{color:isLive?"#fbbf24":"#4ade80"}}>{md.Status}</p>
          </div>
        )}

        {isLive && (
          <div className="relative px-6 py-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-xs text-gray-700">Auto-refreshes every 30s</span>
            <span className="text-xs font-semibold" style={{color:ACCENT}}>{countdown}s</span>
          </div>
        )}
      </div>

      {/* tabs */}
      <TabBar
        tabs={[{k:"summary",l:"Summary"},{k:"batting",l:"Batting"},{k:"bowling",l:"Bowling"}]}
        active={tab} onChange={setTab} accent={ACCENT}
      />

      {/* summary */}
      {tab==="summary" && (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <StatRow label="Series" value={series.Series_short_display_name||"ICC WT20 WC 2026"} color={ACCENT}/>
          <StatRow label="Venue" value={venue.Name||"—"} color="#9ca3af"/>
          {tossWon && <StatRow label="Toss" value={`${tossWon.Name_Short} elected to ${md.Toss_elected_to}`} color="#9ca3af"/>}
          {innings[0]?.Total!==undefined && <StatRow label={`${teams[innings[0].Battingteam]?.Name_Short||"—"} — 1st Innings`} value={`${innings[0].Total}/${innings[0].Wickets}`} sub={`${innings[0].Overs} overs`}/>}
          {innings[1]?.Total!==undefined && <StatRow label={`${teams[innings[1].Battingteam]?.Name_Short||"—"} — 2nd Innings`} value={`${innings[1].Total}/${innings[1].Wickets}`} sub={`${innings[1].Overs} overs`}/>}
          {innings[0]?.Runrate && <StatRow label="Run Rate" value={parseFloat(innings[0].Runrate).toFixed(2)} color="#4ade80"/>}
          <StatRow label="Format" value={`T20 · ${innings[0]?.AllottedOvers||20} overs`} color={ACCENT}/>
        </div>
      )}

      {/* batting */}
      {tab==="batting" && innings.map((inn,idx) => {
        const batted = (inn.Batsmen||[]).filter(b=>b.Balls!==""&&b.Balls!==undefined);
        if (!batted.length) return null;
        const batTeam  = teams[inn.Battingteam];
        const bowlTeam = teams[inn.Bowlingteam];
        return (
          <div key={idx} className="rounded-2xl border border-white/[0.06] overflow-hidden mb-3">
            <div className="px-5 py-3 border-b border-white/5" style={{background:"rgba(255,255,255,0.02)"}}>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Innings {idx+1} · {batTeam?.Name_Short||"—"} batting
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Batter","Dismissal","R","B","4s","6s","SR"].map((h,i) => (
                      <th key={h} className={`py-3 text-xs font-semibold text-gray-600 uppercase tracking-widest
                        ${i===0?"pl-5 text-left":"text-right px-3"}
                        ${i===6?"pr-5":""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batted.map((b,i) => {
                    const player = batTeam?.Players?.[b.Batsman];
                    const name   = player?.Name_Short||player?.Name_Full||`#${b.Batsman}`;
                    const isBatting = b.Howout==="Batting";
                    const bowlerP   = b.Bowler?(bowlTeam?.Players?.[b.Bowler]?.Name_Short||""):"";
                    const dismissal = isBatting?"not out":(b.Howout_short||b.Howout||"—")+(bowlerP?` b ${bowlerP}`:"");
                    return (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                        <td className="pl-5 py-3.5">
                          <span className={`text-sm font-medium ${isBatting?"text-amber-400":"text-gray-300"}`}>
                            {name}{isBatting?" ★":""}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-xs text-gray-500 max-w-[100px] truncate">{dismissal}</td>
                        <td className="px-3 py-3.5 text-right text-sm font-semibold text-white">{b.Runs}</td>
                        <td className="px-3 py-3.5 text-right text-sm text-gray-500">{b.Balls}</td>
                        <td className="px-3 py-3.5 text-right text-sm text-blue-400">{b.Fours}</td>
                        <td className="px-3 py-3.5 text-right text-sm text-violet-400">{b.Sixes}</td>
                        <td className="pr-5 py-3.5 text-right text-sm text-gray-500">{parseFloat(b.Strikerate||0).toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* bowling */}
      {tab==="bowling" && innings.map((inn,idx) => {
        const bowled = (inn.Bowlers||[]).filter(b=>b.Balls_Bowled>0);
        if (!bowled.length) return null;
        const bowlTeam = teams[inn.Bowlingteam];
        return (
          <div key={idx} className="rounded-2xl border border-white/[0.06] overflow-hidden mb-3">
            <div className="px-5 py-3 border-b border-white/5" style={{background:"rgba(255,255,255,0.02)"}}>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Innings {idx+1} · {bowlTeam?.Name_Short||"—"} bowling
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Bowler","O","M","R","W","Eco"].map((h,i) => (
                      <th key={h} className={`py-3 text-xs font-semibold text-gray-600 uppercase tracking-widest
                        ${i===0?"pl-5 text-left":"text-right px-3"}
                        ${i===5?"pr-5":""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bowled.map((b,i) => {
                    const player = bowlTeam?.Players?.[b.Bowler];
                    const name   = player?.Name_Short||player?.Name_Full||`#${b.Bowler}`;
                    return (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                        <td className="pl-5 py-3.5">
                          <span className={`text-sm font-medium ${b.Isbowlingnow?"text-blue-400":"text-gray-300"}`}>
                            {name}{b.Isbowlingnow?" ●":""}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-right text-sm text-white">{b.Overs}</td>
                        <td className="px-3 py-3.5 text-right text-sm text-gray-500">{b.Maidens}</td>
                        <td className="px-3 py-3.5 text-right text-sm font-semibold text-white">{b.Runs}</td>
                        <td className="px-3 py-3.5 text-right text-sm font-semibold text-emerald-400">{b.Wickets}</td>
                        <td className="pr-5 py-3.5 text-right text-sm text-gray-500">{parseFloat(b.Economyrate||0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {lastUpdate && (
        <p className="text-xs text-gray-700 text-center pt-2">
          Updated {lastUpdate.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})} IST
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FIFA MATCH CENTER
════════════════════════════════════════════════════════════════════════════ */
function FifaMatchCenter({ matchId }) {
  const [match, setMatch]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown]   = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const url = `${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`;
      const r   = await fetch(url,{headers:{Accept:"application/json"}});
      if (!r.ok) throw new Error(`FIFA API ${r.status}`);
      const j   = await r.json();
      const found = (j.Results||[]).find(m=>m.IdMatch===matchId);
      if (!found) throw new Error("Match not found");
      setMatch(found); setLastUpdate(new Date()); setCountdown(30); setError(null);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [matchId]);

  useEffect(() => { load(); const t=setInterval(()=>load(true),30000); return ()=>clearInterval(t); }, [load]);
  useEffect(() => { const t=setInterval(()=>setCountdown(c=>c<=1?30:c-1),1000); return ()=>clearInterval(t); }, [lastUpdate]);

  const ACCENT = "#34d399";
  const ACCENT_BG = "rgba(52,211,153,0.08)";
  const ACCENT_BORDER = "rgba(52,211,153,0.2)";

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{borderColor:`${ACCENT}20`,borderTopColor:ACCENT}}/>
      <p className="text-sm text-gray-600 font-medium">Loading match data</p>
    </div>
  );
  if (error||!match) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
      <AlertCircle size={28} className="text-red-500/50"/>
      <p className="text-sm text-gray-600">{error||"Match not found"}</p>
      <button onClick={()=>load()} className="px-5 py-2.5 rounded-xl border text-sm font-medium"
        style={{borderColor:ACCENT_BORDER,color:ACCENT}}>Try again</button>
    </div>
  );

  const status = getFifaStatus(match);
  const isLive = status==="live"; const isDone = status==="finished"; const isUp = status==="upcoming";
  const hTeam  = match.Home; const aTeam = match.Away;
  const hName  = fifaTeamName(hTeam); const aName = fifaTeamName(aTeam);
  const hScore = match.HomeTeamScore; const aScore = match.AwayTeamScore;
  const hWon   = isDone && hScore > aScore;
  const aWon   = isDone && aScore > hScore;
  const isDraw = isDone && hScore===aScore;
  const group  = fifaGroupName(match);
  const city   = fifaCity(match);
  const stadium = fifaStadium(match);

  return (
    <div className="space-y-4">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08]"
        style={{background:"linear-gradient(170deg,#061a12 0%,#040f09 100%)"}}>
        <div className="absolute inset-0 pointer-events-none"
          style={{background:`radial-gradient(ellipse 70% 45% at 50% 0%,rgba(52,211,153,0.12) 0%,transparent 60%)`}}/>

        {/* top bar */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full"
              style={{background:ACCENT_BG,color:ACCENT,border:`1px solid ${ACCENT_BORDER}`}}>
              FIFA WC 2026
            </span>
            {group && <span className="text-sm text-gray-500">{group}</span>}
            {match.MatchNumber && <span className="text-sm text-gray-600">· #{match.MatchNumber}</span>}
          </div>
          <div className="flex items-center gap-3">
            {isLive ? (
              <span className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-full">
                <PulsingDot color="#ef4444" size={6}/>{match.MatchTime||"Live"}
              </span>
            ) : isDone
              ? <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">Full Time</span>
              : <span className="text-sm text-gray-500">{fmtIST(match.Date)} IST</span>
            }
            <button onClick={()=>load()}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:text-white hover:bg-white/5 transition-all ${refreshing?"animate-spin":""}`}>
              <RefreshCw size={14}/>
            </button>
          </div>
        </div>

        {/* venue */}
        <div className="relative px-6 py-3 border-b border-white/[0.04]">
          <span className="text-sm text-gray-500">📍 {city}{stadium?` · ${stadium}`:""}</span>
          {!isLive&&!isDone && <span className="text-sm text-gray-600 ml-3">{fmtDateIST(match.Date)}</span>}
        </div>

        {/* ── SCORELINE ── */}
        <div className="relative px-6 py-10">
          <div className="flex items-center justify-between gap-6">

            {/* Home */}
            <div className="flex-1 flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.04]">
                <img src={getFifaFlagUrl(hTeam?.IdCountry)} alt=""
                  className="w-full h-full object-cover"
                  onError={e=>{e.target.style.display="none";}}/>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight" style={{color:hWon?"#4ade80":"white"}}>
                  {hTeam?.Abbreviation||hName}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{hName}</p>
              </div>
              {hWon && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{background:"rgba(74,222,128,0.12)",color:"#4ade80",border:"1px solid rgba(74,222,128,0.25)"}}>
                  Win
                </span>
              )}
            </div>

            {/* Score */}
            <div className="shrink-0 text-center px-2">
              {isUp ? (
                <div className="space-y-2">
                  <p className="text-5xl font-semibold text-gray-700 tracking-tight">vs</p>
                  <p className="text-sm text-gray-600">{fmtIST(match.Date)} IST</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-6xl font-semibold leading-none" style={{color:hWon?"#4ade80":"white"}}>
                    {hScore??"-"}
                  </span>
                  <span className="text-4xl text-gray-700">:</span>
                  <span className="text-6xl font-semibold leading-none" style={{color:aWon?"#4ade80":"white"}}>
                    {aScore??"-"}
                  </span>
                </div>
              )}
              {isDraw && <p className="text-sm text-gray-500 mt-2">Draw</p>}
            </div>

            {/* Away */}
            <div className="flex-1 flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.04]">
                <img src={getFifaFlagUrl(aTeam?.IdCountry)} alt=""
                  className="w-full h-full object-cover"
                  onError={e=>{e.target.style.display="none";}}/>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight" style={{color:aWon?"#4ade80":"white"}}>
                  {aTeam?.Abbreviation||aName}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{aName}</p>
              </div>
              {aWon && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{background:"rgba(74,222,128,0.12)",color:"#4ade80",border:"1px solid rgba(74,222,128,0.25)"}}>
                  Win
                </span>
              )}
            </div>
          </div>

          {isDone && (
            <div className="mt-8 flex items-center justify-center gap-2 pt-6 border-t border-white/[0.06]">
              <Trophy size={16} className="text-amber-400"/>
              <p className="text-lg font-semibold" style={{color:"#4ade80"}}>
                {hWon ? `${hTeam?.Abbreviation||hName} win` : aWon ? `${aTeam?.Abbreviation||aName} win` : "Draw"}
              </p>
            </div>
          )}
        </div>

        {isLive && (
          <div className="relative px-6 py-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-xs text-gray-700">Auto-refreshes every 30s</span>
            <span className="text-xs font-semibold" style={{color:ACCENT}}>{countdown}s</span>
          </div>
        )}
      </div>

      {/* summary */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        <StatRow label="Competition" value="FIFA World Cup 2026" color={ACCENT}/>
        {group && <StatRow label="Group" value={group} color={ACCENT}/>}
        {match.MatchNumber && <StatRow label="Match" value={`#${match.MatchNumber}`}/>}
        <StatRow label="City" value={city||"—"} color="#9ca3af"/>
        {stadium && <StatRow label="Stadium" value={stadium} color="#9ca3af"/>}
        <StatRow label="Date" value={fmtDateIST(match.Date)} color="#9ca3af"/>
        <StatRow label="Kickoff (IST)" value={fmtIST(match.Date)}/>
        {hScore!==null&&hScore!==undefined && <StatRow label={hTeam?.Abbreviation||hName} value={`${hScore} goal${hScore!==1?"s":""}`} color={hWon?"#4ade80":"white"}/>}
        {aScore!==null&&aScore!==undefined && <StatRow label={aTeam?.Abbreviation||aName} value={`${aScore} goal${aScore!==1?"s":""}`} color={aWon?"#4ade80":"white"}/>}
        <StatRow label="Status" value={isLive?"Live":isDone?"Full Time":"Upcoming"} color={isLive?"#ef4444":isDone?"#4ade80":"#9ca3af"}/>
      </div>

      {lastUpdate && (
        <p className="text-xs text-gray-700 text-center pt-2">
          Updated {lastUpdate.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})} IST
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function MatchCenter() {
  const { hash } = useParams();
  const navigate  = useNavigate();
  const payload   = hash ? decodeMatchHash(hash) : null;

  const isFootball = payload?.sport==="football";
  const isWt20     = payload?.type==="wt20";
  const accent     = isFootball ? "#34d399" : isWt20 ? "#a78bfa" : "#f59e0b";
  const sportLabel = isFootball ? "⚽ FIFA WC 2026" : isWt20 ? "♀ ICC WT20 WC 2026" : "🏏 India Cricket";

  const ambientBg = isFootball
    ? "radial-gradient(ellipse 50% 28% at 50% 0%,rgba(52,211,153,0.1) 0%,transparent 50%)"
    : isWt20
      ? "radial-gradient(ellipse 50% 28% at 50% 0%,rgba(167,139,250,0.1) 0%,transparent 50%)"
      : "radial-gradient(ellipse 50% 28% at 50% 0%,rgba(245,158,11,0.1) 0%,transparent 50%)";

  if (!payload) return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertCircle size={32} className="text-red-500/40"/>
      <p className="text-base text-gray-500">Invalid match link</p>
      <Link to="/" className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
        Back to Home
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans overflow-x-hidden">
      {/* ambient */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{background:ambientBg}}/>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-[#080808]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <button onClick={()=>navigate(-1)}
            className="flex items-center gap-2.5 text-gray-500 hover:text-white transition-colors shrink-0">
            <ArrowLeft size={18}/>
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </button>

          <div className="flex flex-col items-center min-w-0">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-widest">{sportLabel}</p>
            <p className="text-base font-semibold text-white truncate max-w-[220px]">
              {payload.homeCode} <span style={{color:accent}}>vs</span> {payload.awayCode}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full border shrink-0"
            style={{color:accent,borderColor:`${accent}30`,background:`${accent}08`}}>
            <Signal size={10}/>
            <span className="hidden sm:inline">Center</span>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="relative z-10 max-w-3xl mx-auto px-5 py-6 pb-28">

        {/* title */}
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mb-1">{sportLabel}</p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-none">
            {payload.homeCode} <span style={{color:accent}}>vs</span> {payload.awayCode}
          </h1>
          {payload.leagueLabel && (
            <p className="text-sm text-gray-500 mt-2">{payload.leagueLabel}</p>
          )}
        </div>

        {/* match content */}
        {payload.sport==="cricket" && payload.type==="bcci" && payload.matchData && (
          <BcciMatchCenter matchData={payload.matchData}/>
        )}
        {payload.sport==="cricket" && payload.type==="wt20" && payload.matchId && (
          <Wt20MatchCenter matchId={payload.matchId}/>
        )}
        {payload.sport==="football" && payload.type==="fifa" && payload.matchId && (
          <FifaMatchCenter matchId={payload.matchId}/>
        )}

        {/* watch CTA */}
        <div className="mt-8">
          <Link to="/live-cricket-tv"
            className="flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 transition-all hover:border-white/20 active:scale-[0.98]"
            style={{background:`${accent}06`,borderColor:`${accent}18`}}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{background:`${accent}12`,border:`1px solid ${accent}25`}}>
                <Tv2 size={18} style={{color:accent}}/>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Watch Live</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isFootball ? "Sports18 · FIFA WC 2026" : "Star Sports · Cricket Live"}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{color:accent}}>Go →</span>
          </Link>
        </div>

      </main>
    </div>
  );
}