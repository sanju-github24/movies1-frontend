import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, Trophy, Star, AlertCircle,
  Tv2, Signal, Maximize2
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
function EcbCreaseCards({ bowlerName, bowlerFigures, bowlerEco, bowlerOvers,
  strikerName, strikerRuns, strikerBalls, strikerFours, strikerSixes, strikerSR,
  nonStrikerName, nonStrikerRuns, nonStrikerBalls,
  strikerImg, nonStrikerImg, bowlerImg,
}) {
  const panels = [
    bowlerName && {
      label: "Bowling", labelColor: "#93c5fd", labelBg: "rgba(59,130,246,0.18)",
      bg: "linear-gradient(160deg,rgba(0,27,78,0.98) 0%,rgba(0,5,18,1) 100%)",
      name: bowlerName,
      stat: bowlerFigures,
      sub: `${bowlerOvers} ov · Eco ${bowlerEco}`,
      img: bowlerImg,
    },
    strikerName && {
      label: "★ On strike", labelColor: "#fca5a5", labelBg: "rgba(207,20,43,0.22)",
      bg: "linear-gradient(160deg,rgba(207,20,43,0.12) 0%,rgba(0,5,18,1) 100%)",
      name: strikerName,
      stat: `${strikerRuns}`,
      statSuffix: `(${strikerBalls})`,
      sub: [strikerFours > 0 && `${strikerFours}×4`, strikerSixes > 0 && `${strikerSixes}×6`, strikerSR && `SR ${strikerSR}`].filter(Boolean).join("  "),
      img: strikerImg,
    },
    nonStrikerName && {
      label: "Non-striker", labelColor: "rgba(255,255,255,0.3)", labelBg: "rgba(255,255,255,0.06)",
      bg: "linear-gradient(160deg,rgba(0,27,78,0.88) 0%,rgba(0,5,18,1) 100%)",
      name: nonStrikerName,
      stat: `${nonStrikerRuns}`,
      statSuffix: `(${nonStrikerBalls})`,
      sub: "",
      img: nonStrikerImg,
    },
  ].filter(Boolean);

  if (!panels.length) return null;

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${panels.length}, 1fr)`,
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {panels.map((p, idx) => (
        <div
          key={idx}
          className="relative overflow-hidden flex flex-col justify-between p-3.5"
          style={{
            background: p.bg,
            borderRight: idx < panels.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            minHeight: 120,
          }}
        >
          {/* big initials watermark */}
          <div className="absolute inset-0 flex items-end justify-start overflow-hidden pointer-events-none">
            <span className="font-black select-none leading-none" style={{ fontSize: 72, color: "rgba(255,255,255,0.035)", marginLeft: -8 }}>
              {ecbInitials(p.name)}
            </span>
          </div>
          <div className="relative">
            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: p.labelBg, color: p.labelColor }}>
              {p.label}
            </span>
            {p.img && (
              <div className="w-6 h-6 rounded-full overflow-hidden mt-1.5 border border-white/10 bg-white/5">
                <img src={p.img} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
              </div>
            )}
            <p className="text-[11px] font-black text-white mt-1.5 leading-tight truncate">{p.name}</p>
          </div>
          <div className="relative mt-1">
            <p className="text-lg font-black text-white leading-none">
              {p.stat}
              {p.statSuffix && <span className="text-sm text-white/35 ml-1 font-semibold">{p.statSuffix}</span>}
            </p>
            {p.sub && <p className="text-[9px] text-white/30 mt-0.5">{p.sub}</p>}
          </div>
        </div>
      ))}
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
function BcciMatchCenter({ matchData, onMatchState }) {
  const [sc, setSc]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown]   = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
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
  const scorecardInn  = sc?.scorecardData?.innings || sc?.innings || [];

  useEffect(() => {
    onMatchState?.({ isLive: !!isLive, isFinished: !!isFinished, result: resultComment, mom, momRuns, momWickets: momWkts, momImg });
  }, [isLive, isFinished, resultComment, mom, momRuns, momWkts, momImg]);

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
            { k: "overview",  l: "Overview"  },
            { k: "scorecard", l: "Scorecard" },
            { k: "bowling",   l: "Bowling"   },
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
          scorecardInn.length > 0
            ? scorecardInn.map((inn, idx) => {
                const rows = buildBattingRows(inn.batting || inn.BattingCard || []);
                if (!rows.length) return null;
                return (
                  <div key={idx}>
                    <EcbSectionHeader label={`Innings ${idx + 1} · Batting`} />
                    <EcbBattingTable rows={rows} />
                  </div>
                );
              })
            : <p className="text-center text-white/20 text-xs py-10">Detailed scorecard not available</p>
        )}

        {tab === "bowling" && (
          scorecardInn.length > 0
            ? scorecardInn.map((inn, idx) => {
                const rows = buildBowlingRows(inn.bowling || inn.BowlingCard || []);
                if (!rows.length) return null;
                return (
                  <div key={idx}>
                    <EcbSectionHeader label={`Innings ${idx + 1} · Bowling`} />
                    <EcbBowlingTable rows={rows} />
                  </div>
                );
              })
            : <p className="text-center text-white/20 text-xs py-10">Bowling data not available</p>
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
    const status = getFifaStatus(match);
    const isLive = status === "live";
    const isDone = status === "finished";
    const hName  = fifaTeamName(match.Home);
    const aName  = fifaTeamName(match.Away);
    const hWon   = isDone && match.HomeTeamScore > match.AwayTeamScore;
    const aWon   = isDone && match.AwayTeamScore > match.HomeTeamScore;
    const resultStr = isDone ? (hWon ? `${match.Home?.Abbreviation || hName} win` : aWon ? `${match.Away?.Abbreviation || aName} win` : "Draw") : "";
    onMatchState?.({ isLive, isFinished: isDone, result: resultStr, mom: "", momRuns: "", momWickets: "", momImg: "" });
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
  const { hash } = useParams();
  const navigate  = useNavigate();
  const payload   = hash ? decodeMatchHash(hash) : null;

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

  if (!payload) return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertCircle size={32} className="text-red-500/40" />
      <p className="text-base text-gray-500">Invalid match link</p>
      <Link to="/" className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">Back to Home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans overflow-x-hidden">
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
