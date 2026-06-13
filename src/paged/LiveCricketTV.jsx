import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Tv2, Signal, Volume2, Maximize2, AlertCircle,
  RefreshCw, Activity, Calendar, Trophy, BarChart2, Globe
} from "lucide-react";

// ─── CRICKET CHANNELS ─────────────────────────────────────────────────────────
const CRICKET_CHANNELS = [
  {
    id: "star-english", name: "Star Sports", sub: "English",
    color: "#00a8e1", glow: "rgba(0,168,225,0.3)", border: "rgba(0,168,225,0.25)",
    bg: "rgba(0,168,225,0.06)", tag: "ENGLISH", useIcon: false,
    logo: "/Star_Sports_1.png", url: "https://allrounder-live5.pages.dev/star/star-1",
    desc: "Star Sports 1 — Live cricket in English commentary",
  },
  {
    id: "star-hindi", name: "Star Sports", sub: "Hindi",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "HINDI", useIcon: false,
    logo: "/Star_Sports_Hindi.png", url: "https://allrounder-live5.pages.dev/star/star-1-hindi",
    desc: "Star Sports Hindi — Live cricket in Hindi commentary",
  },
];

// ─── FOOTBALL CHANNELS ────────────────────────────────────────────────────────
const FOOTBALL_CHANNELS = [
  {
    id: "sports18-english", name: "Sports18", sub: "English",
    color: "#1ed596", glow: "rgba(30,213,150,0.3)", border: "rgba(30,213,150,0.25)",
    bg: "rgba(30,213,150,0.06)", tag: "ENG", useIcon: true,
    logo: "", url: "https://allrounderlive.in/eng",
    desc: "Sports18 — FIFA World Cup 2026 in English",
  },
  {
    id: "sports18-hindi", name: "Sports18", sub: "Hindi",
    color: "#a78bfa", glow: "rgba(167,139,250,0.3)", border: "rgba(167,139,250,0.25)",
    bg: "rgba(167,139,250,0.06)", tag: "हिंदी", useIcon: true,
    logo: "", url: "https://allrounderlive.in/zee",
    desc: "Sports18 — FIFA World Cup 2026 in Hindi",
  },
];

// ─── FIFA API ─────────────────────────────────────────────────────────────────
const FIFA_COMPETITION = "17";
const FIFA_SEASON      = "285023";
const FIFA_STAGE       = "289273";
const FIFA_API_BASE    = "https://api.fifa.com/api/v3";

// ─── WOMENS T20 WC API ────────────────────────────────────────────────────────
const WT20_CLIENT_ID = "tPZJbRgIub3Vua93%2FDWtyQ%3D%3D";
const WT20_SCORECARD_BASE = "https://assets-icc.sportz.io/cricket/v1/game/scorecard";
const WT20_SCHEDULE_BASE  = "https://assets-icc.sportz.io/cricket/v1/schedule";
const WT20_SERIES_ID = "12672";

// ─── IPL SCHEDULE (commented out — replaced by WT20) ─────────────────────────
/*
const BASE_MATCH_NUM = 44;
const BASE_MATCH_ID  = 2484;
function getMatchId(n) {
  if (n === 71) return 2535;
  if (n === 72) return 2536;
  return BASE_MATCH_ID + (n - BASE_MATCH_NUM);
}
function makeIST(dateStr, timeStr) {
  const monthMap = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
  const [d, m, y] = dateStr.split("-");
  const [timePart, ampm] = timeStr.split(" ");
  let [h, min] = timePart.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return new Date(Date.UTC(2000 + parseInt(y), monthMap[m.toUpperCase()], parseInt(d), h - 5, min - 30));
}
const SCHEDULE = [
  { num:45, date:"03-MAY-26", day:"Sun", time:"3:30 PM", home:"SRH", away:"KKR",  venue:"Hyderabad" },
  { num:46, date:"03-MAY-26", day:"Sun", time:"7:30 PM", home:"GT",  away:"PBKS", venue:"Ahmedabad" },
  ... (full schedule omitted for brevity)
];
const SCHEDULE_WITH_TIMES = SCHEDULE.map(m => ({
  ...m, id: getMatchId(m.num),
  startTime: makeIST(m.date, m.time),
  endTime: new Date(makeIST(m.date, m.time).getTime() + 4 * 3600 * 1000),
}));
*/

// ─── IPL TEAM META (kept for reference, commented) ───────────────────────────
/*
const TEAM_META = {
  MI:   { primary:"#004f9f", accent:"#f7c400", name:"Mumbai Indians", ... },
  ...
};
function getTeam(code) { return TEAM_META[code] || { primary:"#444", accent:"#aaa", name:code, logo:"" }; }
function nameToCode(name = "") { ... }
function getActiveMatchId() { ... }
*/

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
function fmtDate(s) { const [d,m] = s.split("-"); return `${d} ${m}`; }

// ─── FIFA HELPERS ─────────────────────────────────────────────────────────────
function getFifaFlagUrl(code) { return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`; }
function getFifaStatus(m) {
  if (m.MatchStatus === 3) return "live";
  if (m.MatchStatus === 0 && (m.Winner || m.HomeTeamScore !== null)) return "finished";
  return "upcoming";
}
function fmtFifaTime(d) { return d ? new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"}) : ""; }
function fmtFifaDate(d) { return d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",timeZone:"Asia/Kolkata"}) : ""; }
function fifaTeamName(t) { return t?.TeamName?.find(x=>x.Locale==="en-GB")?.Description || t?.ShortClubName || t?.Abbreviation || ""; }
function fifaGroupName(m) { return m.GroupName?.find(x=>x.Locale==="en-GB")?.Description || ""; }
function fifaStadium(m) { return m.Stadium?.Name?.find(x=>x.Locale==="en-GB")?.Description || ""; }
function fifaCity(m) { return m.Stadium?.CityName?.find(x=>x.Locale==="en-GB")?.Description || ""; }

// ─── WT20 HELPERS ─────────────────────────────────────────────────────────────
function wt20FmtTime(dateStr, timeStr, offset) {
  // dateStr like "6/12/2026", timeStr like "17:30", offset like "+01:00"
  try {
    const iso = `${dateStr.replace(/(\d+)\/(\d+)\/(\d+)/, "$3-$1-$2")}T${timeStr}:00${offset}`;
    return new Date(iso).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", timeZone:"Asia/Kolkata" });
  } catch { return timeStr; }
}
function wt20FmtDate(dateStr) {
  try {
    const [m,d,y] = dateStr.split("/");
    return new Date(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`).toLocaleDateString("en-IN", { day:"numeric", month:"short" });
  } catch { return dateStr; }
}
function getWt20Status(match) {
  if (match.live) return "live";
  if (match.recent) return "recent";
  if (match.upcoming) return "upcoming";
  return "upcoming";
}

// ─── TEAM FLAG / COLOUR MAP ───────────────────────────────────────────────────
const ICC_TEAM_COLORS = {
  ENG: { primary:"#003087", accent:"#CF142B", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  SL:  { primary:"#003087", accent:"#FF8000", flag:"🇱🇰" },
  AUS: { primary:"#00843D", accent:"#FFD700", flag:"🇦🇺" },
  SA:  { primary:"#007A4D", accent:"#FFB81C", flag:"🇿🇦" },
  IND: { primary:"#FF671F", accent:"#046A38", flag:"🇮🇳" },
  PAK: { primary:"#01411C", accent:"#FFFFFF", flag:"🇵🇰" },
  NZ:  { primary:"#000000", accent:"#FFFFFF", flag:"🇳🇿" },
  WI:  { primary:"#7B1113", accent:"#FDB913", flag:"🏴" },
  SCO: { primary:"#003087", accent:"#FFD700", flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  IRE: { primary:"#169B62", accent:"#FFFFFF", flag:"🇮🇪" },
  BAN: { primary:"#006A4E", accent:"#F42A41", flag:"🇧🇩" },
  NED: { primary:"#FF6600", accent:"#FFFFFF", flag:"🇳🇱" },
};
function getIccTeam(short) { return ICC_TEAM_COLORS[short] || { primary:"#333", accent:"#fff", flag:"🏏" }; }

// ─── SHARED: PULSING DOT ──────────────────────────────────────────────────────
function PulsingDot({ color }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{background:color}}/>
      <span className="relative inline-flex rounded-full h-2 w-2" style={{background:color}}/>
    </span>
  );
}

// ─── SHARED: CHANNEL CARD ─────────────────────────────────────────────────────
function ChannelCard({ ch, active, onClick }) {
  return (
    <button onClick={()=>onClick(ch)}
      className="relative w-full text-left rounded-2xl border transition-all duration-300 active:scale-[0.98] overflow-hidden"
      style={{ background:active?ch.bg:"rgba(255,255,255,0.02)", borderColor:active?ch.border:"rgba(255,255,255,0.06)", boxShadow:active?`0 0 30px ${ch.glow}`:"none" }}>
      {active && <div className="absolute inset-0 opacity-10 pointer-events-none" style={{background:`linear-gradient(135deg,${ch.color}44 0%,transparent 60%)`}}/>}
      <div className="relative p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all"
          style={{ background:active?`${ch.color}15`:"rgba(255,255,255,0.04)", borderColor:active?ch.border:"rgba(255,255,255,0.06)" }}>
          {ch.useIcon
            ? <Tv2 size={18} style={{color:active?ch.color:"#4b5563"}}/>
            : <img src={ch.logo} alt="" className="w-7 h-7 object-contain" style={{filter:active?"none":"grayscale(100%) brightness(0.4)"}}/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] px-1 py-0.5 rounded" style={{background:`${ch.color}20`,color:ch.color}}>{ch.tag}</span>
            <PulsingDot color={ch.color}/>
            <span className="text-[8px] font-black uppercase tracking-widest" style={{color:ch.color}}>Live</span>
          </div>
          <p className="text-xs font-black text-white uppercase tracking-tight leading-none">
            {ch.name} <span className="font-bold" style={{color:ch.color}}>{ch.sub}</span>
          </p>
          <p className="text-[9px] text-gray-600 mt-0.5 truncate">{ch.desc}</p>
        </div>
        <div className="shrink-0 w-1.5 h-6 rounded-full" style={{background:active?ch.color:"transparent"}}/>
      </div>
    </button>
  );
}

// ─── SHARED: STREAM PLAYER ────────────────────────────────────────────────────
function StreamPlayer({ ch, switching, onFullscreen, playerRef }) {
  return (
    <div ref={playerRef} className="relative rounded-3xl overflow-hidden border shadow-2xl"
      style={{ borderColor:ch.border, boxShadow:`0 0 60px ${ch.glow}`, background:"#000" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b transition-all duration-500"
        style={{ borderColor:ch.border, background:`linear-gradient(90deg,${ch.bg},transparent)` }}>
        <div className="flex items-center gap-3">
          <PulsingDot color={ch.color}/>
          <div className="flex items-center gap-2">
            {ch.useIcon ? <Tv2 size={13} style={{color:ch.color}}/> : <img src={ch.logo} alt="" className="h-4 w-auto object-contain"/>}
            <span className="text-xs font-black uppercase tracking-widest" style={{color:ch.color}}>{ch.name} {ch.sub}</span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{background:`${ch.color}20`,color:ch.color}}>Live</span>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 size={13} className="text-gray-600"/>
          <button onClick={onFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <Maximize2 size={13} className="text-gray-500 hover:text-white transition-colors"/>
          </button>
        </div>
      </div>
      <div className="relative w-full" style={{paddingTop:"56.25%"}}>
        {switching && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-3"
              style={{borderColor:`${ch.color}44`,borderTopColor:ch.color}}/>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{color:ch.color}}>Switching…</p>
          </div>
        )}
        <iframe key={ch.id} src={ch.url}
          className="absolute inset-0 w-full h-full border-none"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen scrolling="no"
          style={{opacity:switching?0:1,transition:"opacity 0.35s ease"}}/>
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 border-t" style={{borderColor:ch.border,background:"rgba(0,0,0,0.4)"}}>
        <AlertCircle size={10} className="text-gray-700 shrink-0"/>
        <p className="text-[9px] text-gray-700 font-bold uppercase tracking-wider">Third-party stream · Use Chrome · Disable ad-blocker if needed</p>
      </div>
    </div>
  );
}

// ─── CRICKET: BALL CHIP ───────────────────────────────────────────────────────
function BallChip({ ball }) {
  const b = String(ball).trim().toUpperCase();
  const label = b.includes("WK")||b==="W"?"W":b==="0"?"·":b;
  let s = {bg:"rgba(255,255,255,0.05)",border:"rgba(255,255,255,0.2)",color:"#9ca3af"};
  if (label.includes("4")) s={bg:"#3b82f6",border:"#2563eb",color:"#fff"};
  else if (label.includes("6")) s={bg:"#16a34a",border:"#15803d",color:"#fff"};
  else if (label.includes("W")) s={bg:"#dc2626",border:"#b91c1c",color:"#fff"};
  else if (label.includes("NB")) s={bg:"#f59e0b",border:"#d97706",color:"#fff"};
  else if (label.includes("WD")) s={bg:"#78716c",border:"#57534e",color:"#fff"};
  return (
    <span className="flex items-center justify-center rounded-full font-black border shrink-0"
      style={{backgroundColor:s.bg,borderColor:s.border,color:s.color,width:28,height:28,fontSize:label.length>1?"8px":"11px",lineHeight:1}}>
      {label}
    </span>
  );
}



// ─── WT20: LIVE SCORE BAR ─────────────────────────────────────────────────────
function Wt20LiveScoreBar({ innings, teams }) {
  if (!innings || !innings.length) return null;
  const firstInn = innings[0];
  const battingTeamId = firstInn.Battingteam;
  const battingTeam = teams[battingTeamId];
  const short = battingTeam?.Name_Short || "—";
  const meta = getIccTeam(short);
  const runs = firstInn.Total || "0";
  const wickets = firstInn.Wickets || "0";
  const overs = firstInn.Overs || "0";
  const rr = firstInn.Runrate || "0";

  // Current batsmen
  const batsmen = (firstInn.Batsmen || []).filter(b => b.Howout === "Batting");
  // Current bowler
  const currentBowler = (firstInn.Bowlers || []).find(b => b.Isbowlingnow);
  const bowlingTeamId = firstInn.Bowlingteam;
  const bowlingTeam = teams[bowlingTeamId];

  // Current over balls
  const thisOver = currentBowler?.ThisOver || [];

  return (
    <div className="rounded-3xl border overflow-hidden" style={{borderColor:"rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)"}}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5"
        style={{background:`linear-gradient(90deg,${meta.primary}15,transparent)`}}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.flag}</span>
          <div>
            <span className="text-xs font-black text-white uppercase tracking-wider">{battingTeam?.Name_Full || short}</span>
            <p className="text-[9px] text-gray-500 uppercase">batting · 1st innings</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-white leading-none">{runs}/{wickets}</span>
          <p className="text-[10px] text-gray-500 mt-0.5">({overs} ov) · RR {parseFloat(rr).toFixed(2)}</p>
        </div>
      </div>

      {/* Current over balls */}
      {thisOver.length > 0 && (
        <div className="px-4 py-2.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest shrink-0">This over</span>
            <div className="flex gap-1.5">
              {thisOver.map((ball, i) => (
                <BallChip key={i} ball={ball.B === "0" && ball.T === "lb" ? "LB" : ball.B === "0" ? "·" : ball.T ? ball.T.toUpperCase() + ball.B : ball.B} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Batsmen */}
      {batsmen.length > 0 && (
        <div className="px-4 py-2.5 border-b border-white/5">
          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2">At the crease</p>
          <div className="space-y-1.5">
            {batsmen.map((b, i) => {
              const player = battingTeam?.Players?.[b.Batsman];
              const name = player?.Name_Short || player?.Name_Full || `#${b.Batsman}`;
              const isStriker = b.Isonstrike;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px]" style={{color:isStriker?"#f5a623":"#6b7280"}}>{isStriker?"★":"○"}</span>
                    <span className="text-[11px] font-bold" style={{color:isStriker?"#fff":"#9ca3af"}}>{name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-white">{b.Runs}<span className="text-[9px] text-gray-600 ml-0.5">({b.Balls})</span></span>
                    {b.Fours > 0 && <span className="text-[9px] text-blue-400">{b.Fours}×4</span>}
                    {b.Sixes > 0 && <span className="text-[9px] text-violet-400">{b.Sixes}×6</span>}
                    <span className="text-[9px] font-mono text-gray-600">{parseFloat(b.Strikerate || 0).toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Current bowler */}
      {currentBowler && (
        <div className="px-4 py-2.5">
          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Bowling</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-blue-400">●</span>
              <span className="text-[11px] font-bold text-blue-300">
                {bowlingTeam?.Players?.[currentBowler.Bowler]?.Name_Short || `#${currentBowler.Bowler}`}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-white font-bold">{currentBowler.Overs}-{currentBowler.Maidens}-{currentBowler.Runs}-{currentBowler.Wickets}</span>
              <span className="text-gray-500">Eco {parseFloat(currentBowler.Economyrate || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WT20: BATTING SCORECARD ──────────────────────────────────────────────────
function Wt20BattingCard({ batsmen, teams, battingTeamId, bowlingTeamId }) {
  const battingTeam = teams?.[battingTeamId];
  const bowlingTeam = teams?.[bowlingTeamId];
  const batted = batsmen?.filter(b => b.Balls !== "" && b.Balls !== undefined) || [];
  if (!batted.length) return <p className="text-center text-gray-700 text-xs py-6">No batting data yet</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead><tr className="border-b border-white/5">
          {["Batter","Dismissal","R","B","4s","6s","SR"].map((h,i)=>(
            <th key={h} className={`py-2.5 font-black text-gray-500 uppercase tracking-wider text-[9px] ${i===0?"pl-4 text-left":"text-right px-2"} ${i===6?"pr-4":""}`}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {batted.map((b, i) => {
            const player = battingTeam?.Players?.[b.Batsman];
            const name = player?.Name_Short || player?.Name_Full || `#${b.Batsman}`;
            const isBatting = b.Howout === "Batting";
            const dismissal = b.Howout === "Batting" ? "not out" : (b.Howout_short || b.Howout || "—");
            const bowlerPlayer = b.Bowler ? (bowlingTeam?.Players?.[b.Bowler]?.Name_Short || "") : "";
            const dismissalFull = isBatting ? "not out" : (dismissal + (bowlerPlayer ? ` b ${bowlerPlayer}` : ""));
            return (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="pl-4 py-2.5">
                  <span className={`font-bold text-[11px] ${isBatting ? "text-amber-400" : "text-gray-300"}`}>{name}{isBatting?" ★":""}</span>
                  {player?.Role && <p className="text-[8px] text-gray-700">{player.Role}</p>}
                </td>
                <td className="px-2 py-2.5 text-[9px] text-gray-500 italic max-w-[90px] truncate">{dismissalFull}</td>
                <td className="px-2 py-2.5 text-right font-black text-white">{b.Runs}</td>
                <td className="px-2 py-2.5 text-right text-gray-500">{b.Balls}</td>
                <td className="px-2 py-2.5 text-right text-blue-400/80">{b.Fours}</td>
                <td className="px-2 py-2.5 text-right text-violet-400/80">{b.Sixes}</td>
                <td className="pr-4 py-2.5 text-right text-gray-600 font-mono">{parseFloat(b.Strikerate || 0).toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── WT20: BOWLING SCORECARD ──────────────────────────────────────────────────
function Wt20BowlingCard({ bowlers, bowlingTeamId, teams }) {
  const bowlingTeam = teams?.[bowlingTeamId];
  const bowled = bowlers?.filter(b => b.Balls_Bowled > 0) || [];
  if (!bowled.length) return <p className="text-center text-gray-700 text-xs py-6">No bowling data yet</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead><tr className="border-b border-white/5">
          {["Bowler","O","M","R","W","Eco"].map((h,i)=>(
            <th key={h} className={`py-2.5 font-black text-gray-500 uppercase tracking-wider text-[9px] ${i===0?"pl-4 text-left":"text-right px-2"} ${i===5?"pr-4":""}`}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {bowled.map((b, i) => {
            const player = bowlingTeam?.Players?.[b.Bowler];
            const name = player?.Name_Short || player?.Name_Full || `#${b.Bowler}`;
            const isCurrent = b.Isbowlingnow;
            return (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="pl-4 py-2.5">
                  <span className={`font-bold text-[11px] ${isCurrent ? "text-blue-400" : "text-gray-300"}`}>{name}{isCurrent?" ●":""}</span>
                </td>
                <td className="px-2 py-2.5 text-right text-white font-mono">{b.Overs}</td>
                <td className="px-2 py-2.5 text-right text-gray-500">{b.Maidens}</td>
                <td className="px-2 py-2.5 text-right text-white font-bold">{b.Runs}</td>
                <td className="px-2 py-2.5 text-right text-green-400 font-black">{b.Wickets}</td>
                <td className="pr-4 py-2.5 text-right text-gray-500">{parseFloat(b.Economyrate || 0).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── WT20: FALL OF WICKETS ────────────────────────────────────────────────────
function Wt20FoW({ fow, teams, battingTeamId }) {
  const battingTeam = teams?.[battingTeamId];
  if (!fow || !fow.length) return null;
  return (
    <div className="px-4 py-3 border-t border-white/5">
      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">Fall of Wickets</p>
      <div className="flex flex-wrap gap-1.5">
        {fow.map((w, i) => {
          const player = battingTeam?.Players?.[w.Batsman];
          const name = player?.Name_Short || `#${w.Batsman}`;
          return (
            <span key={i} className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">
              {w.Runs}/{w.Wicket_Number} · {name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── WT20: PARTNERSHIP ────────────────────────────────────────────────────────
function Wt20Partnership({ partnership, teams, battingTeamId }) {
  if (!partnership) return null;
  const battingTeam = teams?.[battingTeamId];
  return (
    <div className="px-4 py-2.5 border-t border-white/5 bg-white/[0.01]">
      <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Current Partnership</p>
      <div className="flex items-center gap-3">
        <span className="text-sm font-black text-amber-400">{partnership.Runs} runs</span>
        <span className="text-[9px] text-gray-600">off {partnership.Balls} balls</span>
        <span className="text-[9px] text-gray-700">·</span>
        {(partnership.Batsmen || []).map((b, i) => {
          const player = battingTeam?.Players?.[b.Batsman];
          const name = player?.Name_Short || `#${b.Batsman}`;
          return (
            <span key={i} className="text-[9px] text-gray-400">
              {name} <span className="text-white font-bold">{b.Runs}</span>
              {b.IsStriker ? <span className="text-amber-500"> ★</span> : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── WT20: BALL-BY-BALL COMMENTARY ───────────────────────────────────────────
function Wt20Commentary({ matchId, inningNo = "1" }) {
  const [balls, setBalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const url = `${API_BASE}/api/wt20/commentary?game_id=${matchId}&inning=${inningNo}&page_number=1&page_size=20`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setBalls(json.data?.Commentary || []);
      setLastUpdate(new Date());
      setCountdown(30);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [matchId, inningNo]);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000);
    return () => clearInterval(t);
  }, [lastUpdate]);

  // ── Parse ball outcome for chip colour ──
  function parseBallOutcome(ball) {
    const detail = (ball.Detail || "").toLowerCase();
    const runs = parseInt(ball.Runs || "0", 10);
    const isWicket = ball.Iswicket === true || ball.Iswicket === "true" || detail === "wk";
    const isFour   = ball.Isboundary && runs === 4;
    const isSix    = ball.Isboundary && runs === 6;
    const isWide   = detail === "wd";
    const isNoBall = detail === "nb";
    const isDot    = runs === 0 && !isWide && !isNoBall && !isWicket;

    let label = String(runs);
    if (isWicket)      label = "W";
    else if (isWide)   label = "WD";
    else if (isNoBall) label = "NB";
    else if (isDot)    label = "·";

    let bg = "rgba(255,255,255,0.05)", border = "rgba(255,255,255,0.12)", color = "#6b7280";
    if (isSix)         { bg = "#16a34a"; border = "#15803d"; color = "#fff"; }
    else if (isFour)   { bg = "#2563eb"; border = "#1d4ed8"; color = "#fff"; }
    else if (isWicket) { bg = "#dc2626"; border = "#b91c1c"; color = "#fff"; }
    else if (isNoBall) { bg = "#d97706"; border = "#b45309"; color = "#fff"; }
    else if (isWide)   { bg = "#57534e"; border = "#44403c"; color = "#a8a29e"; }

    return { label, bg, border, color, isWicket, isFour, isSix, isDot };
  }

  // ── Parse "This_Over" string into chips ──
  // Format: "4,4,1,1,0,4," or "5(5WD),1,4,1,2(1NB),4,1,"
  function parseThisOver(str = "") {
    return str.split(",").filter(s => s.trim() !== "").map((s, i) => {
      const clean = s.trim();
      const hasExtra = clean.includes("(");
      const base = hasExtra ? clean.split("(")[0] : clean;
      const extra = hasExtra ? clean.match(/\((.+)\)/)?.[1] || "" : "";

      let label = base;
      let bg = "rgba(255,255,255,0.05)", border = "rgba(255,255,255,0.1)", color = "#6b7280";

      if (base === "W" || extra.includes("WK")) { bg="#dc2626"; border="#b91c1c"; color="#fff"; label="W"; }
      else if (extra.includes("WD"))             { bg="#57534e"; border="#44403c"; color="#a8a29e"; label=`${base}wd`; }
      else if (extra.includes("NB"))             { bg="#d97706"; border="#b45309"; color="#fff"; label=`${base}nb`; }
      else if (base === "4")                     { bg="#2563eb"; border="#1d4ed8"; color="#fff"; }
      else if (base === "6")                     { bg="#16a34a"; border="#15803d"; color="#fff"; }
      else if (base === "0")                     { label="·"; }

      return { label, bg, border, color, key: i };
    });
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "rgba(139,92,246,0.15)", borderTopColor: "#8b5cf6" }}/>
      <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Loading commentary…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
      <AlertCircle size={24} className="text-red-500/50"/>
      <p className="text-[11px] text-gray-600">{error}</p>
      <button onClick={() => load()} className="px-4 py-2 rounded-xl border text-[10px] font-bold"
        style={{ borderColor: "rgba(139,92,246,0.3)", color: "#8b5cf6" }}>Retry</button>
    </div>
  );

  if (!balls.length) return (
    <p className="text-center text-gray-700 text-xs py-10">No commentary yet</p>
  );

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-purple-400"/>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ball by Ball</span>
          <span className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
            <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse inline-block"/> {countdown}s
          </span>
        </div>
        <button onClick={() => load()} className={`text-gray-600 hover:text-purple-400 transition-all ${refreshing ? "animate-spin" : ""}`}>
          <RefreshCw size={11}/>
        </button>
      </div>

      {balls.map((ball, idx) => {
        const outcome = parseBallOutcome(ball);
        const thisOverChips = parseThisOver(ball.This_Over || "");
        const isFirst = idx === 0;
        const isEndOver = ball.End_Over === true;
        const hasMilestone = ball.Milestone?.length > 0;
        const batsmanRuns = ball.Batsman_Details?.Runs;
        const batsmanBalls = ball.Batsman_Details?.Balls;

        return (
          <div key={ball.UID || idx}>
            {/* Over divider */}
            {isEndOver && (
              <div className="flex items-center gap-2 my-3 px-1">
                <div className="flex-1 h-px bg-white/5"/>
                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest px-2">
                  End of Over {Math.floor(parseFloat(ball.Over || "0"))+1}
                  {ball.Summary && <span className="text-gray-700"> · {ball.Summary.Runs} runs · {ball.Summary.Wickets} wkts</span>}
                </span>
                <div className="flex-1 h-px bg-white/5"/>
              </div>
            )}

            {/* Milestone badge */}
            {hasMilestone && (
              <div className="flex justify-center mb-2">
                {ball.Milestone.map((m, mi) => (
                  <span key={mi} className="text-[9px] font-black uppercase px-3 py-1 rounded-full border"
                    style={{ background: "rgba(245,166,35,0.1)", borderColor: "rgba(245,166,35,0.3)", color: "#f5a623" }}>
                    🏆 {m.Event}
                  </span>
                ))}
              </div>
            )}

            {/* Ball card */}
            <div className="rounded-2xl border overflow-hidden transition-all"
              style={{
                background: outcome.isWicket ? "rgba(220,38,38,0.05)"
                  : outcome.isSix ? "rgba(22,163,74,0.05)"
                  : outcome.isFour ? "rgba(37,99,235,0.05)"
                  : isFirst ? "rgba(139,92,246,0.04)"
                  : "rgba(255,255,255,0.02)",
                borderColor: outcome.isWicket ? "rgba(220,38,38,0.2)"
                  : outcome.isSix ? "rgba(22,163,74,0.2)"
                  : outcome.isFour ? "rgba(37,99,235,0.18)"
                  : isFirst ? "rgba(139,92,246,0.15)"
                  : "rgba(255,255,255,0.05)",
              }}>

              {/* Top row: over · bowler → batter + chip */}
              <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-2">
                {/* Over label */}
                <span className="text-[10px] font-black text-gray-600 shrink-0 w-7 text-center font-mono">{ball.Over}</span>

                {/* Run chip */}
                <span className="flex items-center justify-center rounded-full font-black border shrink-0"
                  style={{
                    backgroundColor: outcome.bg, borderColor: outcome.border, color: outcome.color,
                    width: 30, height: 30,
                    fontSize: outcome.label.length > 2 ? "7px" : outcome.label.length > 1 ? "8px" : "12px",
                    lineHeight: 1,
                  }}>
                  {outcome.label}
                </span>

                {/* Bowler → Batter */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white leading-tight truncate">
                    <span className="text-gray-500">{ball.Bowler_Name}</span>
                    <span className="text-gray-700 mx-1">→</span>
                    <span style={{ color: isFirst ? "#c4b5fd" : "#e5e7eb" }}>{ball.Batsman_Name}</span>
                  </p>
                  {batsmanRuns !== undefined && (
                    <p className="text-[8px] text-gray-600 mt-0.5">
                      {ball.Batsman_Name?.split(" ").pop()}: <span className="text-gray-400 font-bold">{batsmanRuns}({batsmanBalls})</span>
                      {ball.Batsman_Details?.Fours > 0 && <span className="text-blue-500/70 ml-1">{ball.Batsman_Details.Fours}×4</span>}
                      {ball.Batsman_Details?.Sixes > 0 && <span className="text-green-500/70 ml-1">{ball.Batsman_Details.Sixes}×6</span>}
                    </p>
                  )}
                </div>

                {/* Score snapshot */}
                {ball.Score && (
                  <span className="text-[11px] font-black text-white shrink-0">{ball.Score}</span>
                )}
              </div>

              {/* This-over mini tracker */}
              {thisOverChips.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 pb-2">
                  <span className="text-[7px] font-black text-gray-700 uppercase tracking-widest shrink-0">Over</span>
                  <div className="flex gap-1 flex-wrap">
                    {thisOverChips.map(chip => (
                      <span key={chip.key}
                        className="flex items-center justify-center rounded-full border font-black"
                        style={{
                          backgroundColor: chip.bg, borderColor: chip.border, color: chip.color,
                          width: 20, height: 20,
                          fontSize: chip.label.length > 2 ? "6px" : chip.label.length > 1 ? "7px" : "9px",
                          lineHeight: 1,
                        }}>
                        {chip.label}
                      </span>
                    ))}
                  </div>
                  {ball.Bowler_Details && (
                    <span className="ml-auto text-[8px] text-gray-700 font-mono shrink-0">
                      {ball.Bowler_Details.Overs}-{ball.Bowler_Details.Maidens}-{ball.Bowler_Details.Runs}-{ball.Bowler_Details.Wickets}
                    </span>
                  )}
                </div>
              )}

              {/* Speed badge */}
              {ball.Ball_Speed && (
                <div className="px-3 pb-2 flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.04)", color: "#6b7280" }}>
                    🎯 {ball.Ball_Speed}
                  </span>
                  {ball.Shot_Type && (
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(139,92,246,0.08)", color: "#a78bfa" }}>
                      {ball.Shot_Type}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {lastUpdate && (
        <p className="text-[8px] text-gray-700 text-center italic pt-1">
          Updated {lastUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST · refreshes every 30s
        </p>
      )}
    </div>
  );
}

// ─── WT20: MAIN SCORECARD ─────────────────────────────────────────────────────
function Wt20Scorecard({ matchId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("batting");
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
  const idRef = useRef(matchId);

  useEffect(() => { idRef.current = matchId; setData(null); setLoading(true); setError(null); }, [matchId]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const url = `${API_BASE}/api/wt20/scorecard?game_id=${idRef.current}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data || json);
      setLastUpdate(new Date());
      setCountdown(30);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [load, matchId]);
  useEffect(() => { const t = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000); return () => clearInterval(t); }, [lastUpdate]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{borderColor:"rgba(139,92,246,0.15)",borderTopColor:"#8b5cf6"}}/>
      <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Loading scorecard…</p>
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
      <AlertCircle size={28} className="text-red-500/60"/>
      <p className="text-[11px] text-gray-700">{error || "No data available"}</p>
      <button onClick={() => load()} className="mt-2 px-4 py-2 rounded-xl border border-purple-500/30 text-purple-400 text-xs font-bold">Retry</button>
    </div>
  );

  const md = data.Matchdetail || {};
  const matchInfo = md.Match || {};
  const seriesInfo = md.Series || {};
  const venue = md.Venue || {};
  const innings = data.Innings || [];
  const teams = data.Teams || {};
  const isLive = matchInfo.Live === true || matchInfo.match_in_progress === true;
  const isComplete = !isLive && innings.some(inn => inn.Total);

  // Figure out team IDs from Matchdetail
  const homeTeamId = md.Team_Home;
  const awayTeamId = md.Team_Away;
  const homeTeam = teams[homeTeamId];
  const awayTeam = teams[awayTeamId];

  // Toss info
  const tossWonById = md.Tosswonby;
  const tossWonByTeam = teams[tossWonById];
  const tossElected = md.Toss_elected_to;

  // Get the first innings that has data
  const firstInn = innings[0];
  const battingTeamId = firstInn?.Battingteam;
  const bowlingTeamId = firstInn?.Bowlingteam;
  const battingTeam = teams[battingTeamId];
  const bowlingTeam = teams[bowlingTeamId];
  const battingMeta = getIccTeam(battingTeam?.Name_Short || "");
  const bowlingMeta = getIccTeam(bowlingTeam?.Name_Short || "");

  const score = firstInn?.Total || "0";
  const wickets = firstInn?.Wickets || "0";
  const overs = firstInn?.Overs || "0";
  const rr = firstInn?.Runrate || "0.00";

  const batsmen = firstInn?.Batsmen || [];
  const bowlers = firstInn?.Bowlers || [];
  const fow = firstInn?.FallofWickets || [];
  const partnership = firstInn?.Partnership_Current;
  const allotted = firstInn?.AllottedOvers || "20";
  const powerPlayDetails = firstInn?.PowerPlayDetails || [];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Activity size={13} className="text-purple-400"/>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{seriesInfo.Series_short_display_name || "WT20 WC 2026"}</span>
          {isLive && (
            <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>Live {countdown}s
            </span>
          )}
          {isComplete && !isLive && (
            <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">✓ Completed</span>
          )}
        </div>
        <button onClick={() => load()} className={`text-gray-600 hover:text-purple-400 transition-all ${refreshing ? "animate-spin" : ""}`}>
          <RefreshCw size={12}/>
        </button>
      </div>

      {/* Match header card */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {/* Venue + toss */}
        <div className="px-4 py-2.5 border-b border-white/5 bg-white/[0.01]">
          <p className="text-[10px] text-gray-400 font-semibold">📍 {venue.Name}</p>
          {tossWonByTeam && (
            <p className="text-[9px] text-gray-600 mt-0.5 italic">
              🪙 {tossWonByTeam.Name_Short} elected to {tossElected}
            </p>
          )}
        </div>

        {/* Teams */}
        <div className="p-3 space-y-2">
          {[
            { id: homeTeamId, team: homeTeam, meta: getIccTeam(homeTeam?.Name_Short || "") },
            { id: awayTeamId, team: awayTeam, meta: getIccTeam(awayTeam?.Name_Short || "") },
          ].map(({ id, team, meta }) => {
            const isBatting = id === battingTeamId && isLive;
            const myInnings = innings.find(inn => inn.Battingteam === id);
            const hasScore = myInnings?.Total !== undefined && myInnings?.Total !== "";
            return (
              <div key={id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all"
                style={{
                  background: isBatting ? `${meta.primary}15` : "rgba(255,255,255,0.02)",
                  borderColor: isBatting ? `${meta.primary}40` : "rgba(255,255,255,0.05)",
                }}>
                <span className="text-2xl shrink-0">{meta.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white">{team?.Name_Short || "—"}</span>
                    {isBatting && <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded" style={{background:"rgba(245,166,35,0.2)",color:"#f5a623"}}>Batting</span>}
                  </div>
                  <p className="text-[9px] text-gray-600">{team?.Name_Full || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  {hasScore ? (
                    <>
                      <span className="text-xl font-black text-white">{myInnings.Total}/{myInnings.Wickets}</span>
                      <p className="text-[9px] text-gray-600">({myInnings.Overs}/{myInnings.AllottedOvers} ov)</p>
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-700 font-bold uppercase">Yet to bat</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

{/* Live rates + powerplay */}
        {isLive && firstInn && (
          <div className="px-4 py-3 border-t border-white/5 flex gap-4 flex-wrap bg-white/[0.01]">
            {rr && parseFloat(rr) > 0 && (
              <div>
                <span className="text-[8px] font-black text-gray-700 uppercase block">CRR</span>
                <span className="text-sm font-black text-green-400">{parseFloat(rr).toFixed(2)}</span>
              </div>
            )}
            {allotted && (
              <div>
                <span className="text-[8px] font-black text-gray-700 uppercase block">Overs</span>
                <span className="text-sm font-black text-white">{overs}/{allotted}</span>
              </div>
            )}
            {powerPlayDetails.map((pp, i) => (
              <div key={i}>
                <span className="text-[8px] font-black text-gray-700 uppercase block">{pp.Name}</span>
                <span className="text-sm font-black text-purple-400">{pp.Runs}/{pp.Wickets}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── LIVE OVER BALL TRACKER ── */}
        {isLive && firstInn && (() => {
          const currentBowler = (firstInn.Bowlers || []).find(b => b.Isbowlingnow);

          // ThisOver is an array of {B, T} objects from the scorecard feed
          const thisOverArr = currentBowler?.ThisOver || [];

          const chips = thisOverArr.map((ball, i) => {
            const runs = String(ball.B ?? "");
            const type = String(ball.T ?? "").toLowerCase();

            let label = runs === "0" ? "·" : runs;
            let bg = "rgba(255,255,255,0.05)", border = "rgba(255,255,255,0.1)", color = "#6b7280";

            if (type === "wk" || type === "w")  { bg="#dc2626"; border="#b91c1c"; color="#fff"; label="W"; }
            else if (type === "wd")             { bg="#57534e"; border="#44403c"; color="#a8a29e"; label="WD"; }
            else if (type === "nb")             { bg="#d97706"; border="#b45309"; color="#fff"; label=`${runs}nb`; }
            else if (type === "lb")             { bg="rgba(255,255,255,0.08)"; border="rgba(255,255,255,0.15)"; color="#9ca3af"; label=`${runs}lb`; }
            else if (runs === "6")              { bg="#16a34a"; border="#15803d"; color="#fff"; }
            else if (runs === "4")              { bg="#2563eb"; border="#1d4ed8"; color="#fff"; }

            return { label, bg, border, color, key: i };
          });

          const ballsDone = chips.length;
          const ballsLeft = Math.max(0, 6 - ballsDone);
          const overLabel = currentBowler?.Overs || overs;

          if (!chips.length && !ballsLeft) return null;

          return (
            <div className="px-4 py-3 border-t border-white/5"
              style={{ background: "rgba(139,92,246,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-1">This Over</span>
                  <span className="text-[11px] font-black text-white">{overLabel}</span>
                </div>

                <div className="w-px h-8 bg-white/5 shrink-0"/>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {chips.map(chip => (
                    <span key={chip.key}
                      className="flex items-center justify-center rounded-full font-black border shrink-0"
                      style={{
                        backgroundColor: chip.bg, borderColor: chip.border, color: chip.color,
                        width: 30, height: 30,
                        fontSize: chip.label.length > 2 ? "7px" : chip.label.length > 1 ? "8px" : "12px",
                        lineHeight: 1,
                        boxShadow: chip.bg !== "rgba(255,255,255,0.05)" ? `0 0 8px ${chip.bg}55` : "none",
                      }}>
                      {chip.label}
                    </span>
                  ))}

                  {Array.from({ length: ballsLeft }).map((_, i) => (
                    <span key={`e-${i}`}
                      className="flex items-center justify-center rounded-full shrink-0"
                      style={{
                        width: 30, height: 30,
                        background: "rgba(255,255,255,0.03)",
                        border: "1.5px dashed rgba(255,255,255,0.08)",
                      }}/>
                  ))}
                </div>

                {currentBowler && (
                  <div className="ml-auto shrink-0 text-right">
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-0.5">
                      {(firstInn.Teams?.[firstInn.Bowlingteam]?.Players?.[currentBowler.Bowler]?.Name_Short) || "Bowler"}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {currentBowler.Overs}-{currentBowler.Maidens}-{currentBowler.Runs}-{currentBowler.Wickets}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {/* Partnership */}
        {isLive && partnership && <Wt20Partnership partnership={partnership} teams={teams} battingTeamId={battingTeamId} />}

        {/* Match status */}
        {md.Status && (
          <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01]">
            <p className="text-[10px] text-center font-black" style={{color: isLive ? "#f59e0b" : "#4ade80"}}>
              {md.Status}
            </p>
          </div>
        )}
      </div>

      {/* Tab: batting / bowling */}
      <div className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="flex border-b border-white/5">
          {[
  { k: "batting",    l: `${battingTeam?.Name_Short || "ENG"} Bat` },
  { k: "bowling",   l: `${bowlingTeam?.Name_Short || "SL"} Bowl` },
  { k: "commentary", l: "Ball×Ball" },
].map(t => (
            <button key={t.k} onClick={() => setActiveTab(t.k)}
              className="flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-b-2"
              style={{
                color: activeTab === t.k ? "#8b5cf6" : "#4b5563",
                borderBottomColor: activeTab === t.k ? "#8b5cf6" : "transparent",
                background: "transparent"
              }}>
              {t.l}
            </button>
          ))}
        </div>
        <div className="min-h-[200px]">
          {activeTab === "batting" && (
            <>
              <Wt20BattingCard batsmen={batsmen} teams={teams} battingTeamId={battingTeamId} bowlingTeamId={bowlingTeamId} />
              {fow.length > 0 && <Wt20FoW fow={fow} teams={teams} battingTeamId={battingTeamId} />}
            </>
          )}
          {activeTab === "bowling" && (
            <Wt20BowlingCard bowlers={bowlers} bowlingTeamId={bowlingTeamId} teams={teams} />
          )}

          {activeTab === "commentary" && (
              <Wt20Commentary matchId={matchId} inningNo={firstInn?.InningNo || "1"} />
          )}
        </div>
      </div>

      {lastUpdate && (
        <p className="text-[8px] text-gray-700 text-center italic">
          Updated {lastUpdate.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})} IST · refreshes every 30s
        </p>
      )}
    </div>
  );
}

// ─── WT20: SCHEDULE PANEL ─────────────────────────────────────────────────────
function Wt20Schedule({ onSelectMatch, activeMatchId }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/api/wt20/schedule?series_ids=${WT20_SERIES_ID}&game_count=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setMatches(json.data?.matches || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:"rgba(139,92,246,0.2)",borderTopColor:"#8b5cf6"}}/>
    </div>
  );

  if (error) return (
    <div className="text-center py-10 space-y-3">
      <AlertCircle size={24} className="text-red-500/50 mx-auto"/>
      <p className="text-[11px] text-gray-600">{error}</p>
      <button onClick={load} className="px-4 py-2 rounded-xl border text-[10px] font-bold" style={{borderColor:"rgba(139,92,246,0.3)",color:"#8b5cf6"}}>Retry</button>
    </div>
  );

  const live = matches.filter(m => m.live);
  const upcoming = matches.filter(m => m.upcoming);
  const recent = matches.filter(m => m.recent && !m.live);

  const sections = [
    { label: "🔴 Live Now", items: live },
    { label: "📅 Upcoming", items: upcoming },
    { label: "✅ Recent", items: recent },
  ].filter(s => s.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar size={13} className="text-purple-400"/>
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">WT20 WC Schedule</span>
      </div>

      {sections.map(({ label, items }) => (
        <div key={label}>
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-2">
            {items.map(match => {
              const homeTeamShort = match.teama_short || match.teama_short_display_name || "—";
              const awayTeamShort = match.teamb_short || match.teamb_short_display_name || "—";
              const homeMeta = getIccTeam(homeTeamShort);
              const awayMeta = getIccTeam(awayTeamShort);
              const isActive = match.match_id === activeMatchId;
              const isLive = match.live;
              const score = match.scores?.[0];

              return (
                <button key={match.match_id}
                  onClick={() => onSelectMatch(match.match_id)}
                  className="w-full text-left rounded-2xl border transition-all duration-200 overflow-hidden active:scale-[0.98]"
                  style={{
                    background: isActive ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.02)",
                    borderColor: isActive ? "rgba(139,92,246,0.35)" : isLive ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)",
                    boxShadow: isActive ? "0 0 20px rgba(139,92,246,0.15)" : "none",
                  }}>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                          {match.match_number} · {match.group ? `Group ${match.group}` : match.stage}
                        </span>
                        {isLive && (
                          <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full">
                            <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse inline-block"/>Live
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-600 font-bold">
                        {match.match_time_ist} IST
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xl shrink-0">{homeMeta.flag}</span>
                        <div className="min-w-0">
                          <span className="text-sm font-black text-white">{homeTeamShort}</span>
                          <p className="text-[8px] text-gray-600 truncate">{match.teama_display_name}</p>
                        </div>
                      </div>

                      <div className="shrink-0 text-center px-2">
                        {score ? (
                          <div className="text-center">
                            <span className="text-xs font-black text-white">{score.team_runs}/{score.team_wickets}</span>
                            <p className="text-[8px] text-gray-600">({score.team_overs} ov)</p>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-gray-700">vs</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <div className="min-w-0 text-right">
                          <span className="text-sm font-black text-white">{awayTeamShort}</span>
                          <p className="text-[8px] text-gray-600 truncate">{match.teamb_display_name}</p>
                        </div>
                        <span className="text-xl shrink-0">{awayMeta.flag}</span>
                      </div>
                    </div>

                    <p className="text-[8px] text-gray-700 mt-1.5">
                      📍 {match.venue}
                      {isActive && <span className="float-right text-[8px] font-black" style={{color:"#8b5cf6"}}>● SELECTED</span>}
                    </p>
                    {match.match_result && (
                      <p className="text-[9px] text-green-400 font-bold mt-0.5">{match.match_result}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── IPL SCORECARD — COMMENTED OUT (replaced by WT20) ─────────────────────────
/*
function BallByBallTracker({ innData }) { ... }
function DetailedBattingTable({ battingCard, strikerID, nonStrikerID }) { ... }
function DetailedBowlingTable({ bowlingCard, currentBowlerID }) { ... }
function IPLScorecard({ matchId, matchInfo }) { ... }
function MatchCard({ match, isLive, isActive, onClick }) { ... }
function SchedulePanel({ activeMatchId, onSelectMatch }) { ... }
function PointsTable() { ... }
function StatsPanel() { ... }
*/

// ─── FOOTBALL: FIFA MATCH CARD ────────────────────────────────────────────────
function FifaMatchCard({ match }) {
  const status=getFifaStatus(match);
  const hTeam=match.Home,aTeam=match.Away;
  const hName=fifaTeamName(hTeam),aName=fifaTeamName(aTeam);
  const hScore=match.HomeTeamScore,aScore=match.AwayTeamScore;
  const group=fifaGroupName(match);
  const city=fifaCity(match),stadium=fifaStadium(match);
  const isLive=status==="live",isDone=status==="finished",isUp=status==="upcoming";
  const hWon=isDone&&match.Winner===hTeam?.IdTeam;
  const aWon=isDone&&match.Winner===aTeam?.IdTeam;
  return (
    <div className="rounded-2xl border overflow-hidden transition-all"
      style={{
        background:isLive?"rgba(239,68,68,0.04)":isDone?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.015)",
        borderColor:isLive?"rgba(239,68,68,0.25)":isDone?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.05)",
        boxShadow:isLive?"0 0 20px rgba(239,68,68,0.08)":"none",
      }}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">{group}</span>
          {match.MatchNumber&&<span className="text-[8px] text-gray-700 font-bold">· #{match.MatchNumber}</span>}
        </div>
        {isLive&&<span className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/25 text-red-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"/>{match.MatchTime||"Live"}</span>}
        {isDone&&<span className="text-[8px] font-black text-green-500/70 uppercase">FT</span>}
        {isUp&&<span className="text-[8px] font-bold text-gray-600">{fmtFifaTime(match.Date)} IST</span>}
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5 flex items-center justify-center">
              <img src={getFifaFlagUrl(hTeam?.IdCountry)} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/>
            </div>
            <div className="min-w-0">
              <span className="text-[12px] font-black uppercase tracking-tight block" style={{color:hWon?"#4ade80":isUp?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.75)"}}>{hTeam?.Abbreviation||hName}</span>
              <span className="text-[8px] text-gray-600 block truncate">{hName}</span>
            </div>
          </div>
          <div className="shrink-0 px-2 text-center">
            {isUp?<span className="text-[11px] font-black text-gray-700">vs</span>:
            <div className="flex items-center gap-1">
              <span className="text-xl font-black leading-none" style={{color:hWon?"#4ade80":"white"}}>{hScore??"-"}</span>
              <span className="text-[10px] text-gray-600 px-0.5">:</span>
              <span className="text-xl font-black leading-none" style={{color:aWon?"#4ade80":"white"}}>{aScore??"-"}</span>
            </div>}
          </div>
          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <div className="min-w-0 text-right">
              <span className="text-[12px] font-black uppercase tracking-tight block" style={{color:aWon?"#4ade80":isUp?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.75)"}}>{aTeam?.Abbreviation||aName}</span>
              <span className="text-[8px] text-gray-600 block truncate">{aName}</span>
            </div>
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5 flex items-center justify-center">
              <img src={getFifaFlagUrl(aTeam?.IdCountry)} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/>
            </div>
          </div>
        </div>
        {(city||stadium)&&<p className="text-[8px] text-gray-700 mt-2">📍 {city}{stadium?` · ${stadium}`:""}</p>}
        {isUp&&<p className="text-[8px] text-gray-600 mt-0.5 font-bold uppercase">{fmtFifaDate(match.Date)}</p>}
      </div>
    </div>
  );
}

// ─── FOOTBALL: FIFA SCORES PANEL ─────────────────────────────────────────────
function FifaScoresPanel() {
  const [matches,setMatches]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [refreshing,setRefreshing]=useState(false);
  const [lastUpdate,setLastUpdate]=useState(null);
  const [filter,setFilter]=useState("today");

  const fetch_=useCallback(async(silent=false)=>{
    if(!silent)setLoading(true);setRefreshing(true);
    try{
      const url=`${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`;
      const r=await fetch(url,{headers:{"Accept":"application/json"}});
      if(!r.ok)throw new Error(`FIFA API ${r.status}`);
      const j=await r.json();
      setMatches(j.Results||[]);setLastUpdate(new Date());setError(null);
    }catch(e){setError(e.message);}
    finally{setLoading(false);setRefreshing(false);}
  },[]);

  useEffect(()=>{fetch_();const t=setInterval(()=>fetch_(true),30000);return()=>clearInterval(t);},[fetch_]);

  const now=new Date();
  const todayStr=now.toISOString().slice(0,10);
  const live=matches.filter(m=>getFifaStatus(m)==="live");
  const today=matches.filter(m=>new Date(m.Date).toISOString().slice(0,10)===todayStr);
  const upcoming=matches.filter(m=>getFifaStatus(m)==="upcoming").sort((a,b)=>new Date(a.Date)-new Date(b.Date)).slice(0,12);
  const results=matches.filter(m=>getFifaStatus(m)==="finished").sort((a,b)=>new Date(b.Date)-new Date(a.Date)).slice(0,10);
  const shown=filter==="live"?live:filter==="today"?today:filter==="upcoming"?upcoming:results;

  const TABS=[{k:"today",l:"Today",c:today.length},{k:"live",l:"Live",c:live.length},{k:"upcoming",l:"Next",c:null},{k:"results",l:"Results",c:null}];

  if(loading)return<div className="flex flex-col items-center justify-center py-16 gap-4"><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:"rgba(30,213,150,0.15)",borderTopColor:"#1ed596"}}/><p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Loading FIFA scores…</p></div>;
  if(error)return<div className="text-center py-12 space-y-3"><AlertCircle size={24} className="text-red-500/50 mx-auto"/><p className="text-[11px] text-gray-600">{error}</p><button onClick={()=>fetch_()} className="px-4 py-2 rounded-xl border text-[10px] font-bold" style={{borderColor:"rgba(30,213,150,0.3)",color:"#1ed596"}}>Retry</button></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={14} style={{color:"#1ed596"}}/>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">FIFA World Cup 2026™</span>
          {live.length>0&&<span className="flex items-center gap-1 bg-red-500/15 border border-red-500/25 text-red-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-red-400 animate-pulse inline-block"/>{live.length} Live</span>}
        </div>
        <button onClick={()=>fetch_()} className={`text-gray-600 hover:text-green-400 ${refreshing?"animate-spin":""}`}><RefreshCw size={12}/></button>
      </div>
      <div className="flex gap-1.5">
        {TABS.map(({k,l,c})=>(
          <button key={k} onClick={()=>setFilter(k)} className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase border flex items-center justify-center gap-1 transition-all"
            style={{background:filter===k?"rgba(30,213,150,0.1)":"rgba(255,255,255,0.02)",borderColor:filter===k?"rgba(30,213,150,0.3)":"rgba(255,255,255,0.06)",color:filter===k?"#1ed596":"#6b7280"}}>
            {l}{c!=null&&c>0&&<span className="text-[7px] rounded-full px-1 font-black" style={{background:filter===k?"rgba(30,213,150,0.2)":"rgba(255,255,255,0.06)",color:filter===k?"#1ed596":"#6b7280"}}>{c}</span>}
          </button>
        ))}
      </div>
      {shown.length===0?<div className="text-center py-10"><p className="text-[11px] text-gray-700">{filter==="live"?"No live matches now":filter==="today"?"No matches today":"No matches found"}</p></div>:
        <div className="space-y-2">{shown.map(m=><FifaMatchCard key={m.IdMatch} match={m}/>)}</div>}
      {lastUpdate&&<p className="text-[8px] text-gray-700 text-center italic">Updated {lastUpdate.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})} IST · Refreshes every 30s</p>}
    </div>
  );
}

// ─── SPORT SECTION COMPONENT ──────────────────────────────────────────────────
function SportSection({ sport, channels }) {
  const [activeCh, setActiveCh]=useState(channels[0]);
  const [switching, setSwitching]=useState(false);
  const playerRef=useRef(null);

  const switchCh=(ch)=>{
    if(ch.id===activeCh.id)return;
    setSwitching(true);
    setTimeout(()=>{setActiveCh(ch);setSwitching(false);},350);
  };
  const fullscreen=()=>{
    if(!document.fullscreenElement)playerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${channels.length===1?"grid-cols-1":"grid-cols-2"}`}>
        {channels.map(ch=><ChannelCard key={ch.id} ch={ch} active={activeCh.id===ch.id} onClick={switchCh}/>)}
      </div>
      <StreamPlayer ch={activeCh} switching={switching} onFullscreen={fullscreen} playerRef={playerRef}/>
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest shrink-0">Switch</span>
        <div className="flex gap-2 flex-wrap">
          {channels.map(ch=>(
            <button key={ch.id} onClick={()=>switchCh(ch)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
              style={{background:activeCh.id===ch.id?ch.bg:"rgba(255,255,255,0.02)",borderColor:activeCh.id===ch.id?ch.border:"rgba(255,255,255,0.06)",color:activeCh.id===ch.id?ch.color:"#4b5563"}}>
              <PulsingDot color={activeCh.id===ch.id?ch.color:"#374151"}/>
              {ch.useIcon?<Tv2 size={10} style={{color:activeCh.id===ch.id?ch.color:"#4b5563"}}/>:<img src={ch.logo} alt="" className="h-3 w-auto object-contain opacity-80"/>}
              {ch.sub}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LiveCricketTV() {
  const [sportTab, setSportTab] = useState("cricket");

  // WT20 state
  const [wt20Panel, setWt20Panel] = useState("scorecard");
  // Default to the live match from the document data: 262318
  const [wt20MatchId, setWt20MatchId] = useState("262318");

  // Football right panel
  const [footballPanel, setFootballPanel] = useState("scores");

  const ambientColor = sportTab === "cricket" ? "rgba(139,92,246,0.2)" : "rgba(30,213,150,0.2)";

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
        style={{background:`radial-gradient(ellipse 60% 35% at 50% 0%, ${ambientColor} 0%, transparent 65%)`}}/>

      {/* ── NAV ── */}
      <header className="relative z-10 h-14 flex items-center px-4 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/watch" className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft size={17} className="text-gray-400"/>
            </Link>
            <Link to="/"><img src="/logo_39.png" className="h-6" alt="logo"/></Link>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-2xl p-1 border border-white/[0.07]">
            <button onClick={() => setSportTab("cricket")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              style={{background:sportTab==="cricket"?"rgba(139,92,246,0.15)":"transparent",color:sportTab==="cricket"?"#8b5cf6":"#6b7280",boxShadow:sportTab==="cricket"?"0 0 12px rgba(139,92,246,0.2)":"none"}}>
              🏏 Cricket
            </button>
            <button onClick={() => setSportTab("football")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              style={{background:sportTab==="football"?"rgba(30,213,150,0.15)":"transparent",color:sportTab==="football"?"#1ed596":"#6b7280",boxShadow:sportTab==="football"?"0 0 12px rgba(30,213,150,0.2)":"none"}}>
              ⚽ Football
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1.5 rounded-full border"
            style={{color:sportTab==="cricket"?"#8b5cf6":"#1ed596",borderColor:sportTab==="cricket"?"rgba(139,92,246,0.25)":"rgba(30,213,150,0.25)",background:sportTab==="cricket"?"rgba(139,92,246,0.06)":"rgba(30,213,150,0.06)"}}>
            <Signal size={8}/>Live
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-5 pb-24">

        {/* ── CRICKET / WT20 SECTION ── */}
        {sportTab === "cricket" && (
          <>
            <div className="mb-5">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-0.5">🏏 ICC Women's T20 World Cup 2026</p>
              <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">
                Cricket <span style={{color:"#8b5cf6"}}>Live TV</span>
              </h1>
              <p className="text-[11px] text-gray-600 mt-1">England · Jun–Jul 2026 · Star Sports</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <SportSection sport="cricket" channels={CRICKET_CHANNELS}/>
              </div>
              <div className="w-full lg:w-[340px] shrink-0">
                {/* WT20 panel tabs */}
                <div className="flex gap-1 mb-4">
                  {[
                    { k: "scorecard", l: "Scorecard" },
                    { k: "schedule",  l: "Schedule"  },
                  ].map(({ k, l }) => (
                    <button key={k} onClick={() => setWt20Panel(k)}
                      className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all"
                      style={{
                        background: wt20Panel === k ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.02)",
                        borderColor: wt20Panel === k ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)",
                        color: wt20Panel === k ? "#8b5cf6" : "#6b7280"
                      }}>
                      {l}
                    </button>
                  ))}
                </div>

                {wt20Panel === "scorecard" && (
                  <>
                    {/* Live score summary at top when viewing scorecard */}
                    <Wt20Scorecard matchId={wt20MatchId} />
                  </>
                )}
                {wt20Panel === "schedule" && (
                  <Wt20Schedule
                    activeMatchId={wt20MatchId}
                    onSelectMatch={(id) => {
                      setWt20MatchId(id);
                      setWt20Panel("scorecard");
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* ── FOOTBALL SECTION ── */}
        {sportTab === "football" && (
          <>
            <div className="mb-5">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-0.5">⚽ FIFA World Cup 2026™</p>
              <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">
                Football <span style={{color:"#1ed596"}}>Live TV</span>
              </h1>
              <p className="text-[11px] text-gray-600 mt-1">USA · Canada · Mexico · June–July 2026</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <SportSection sport="football" channels={FOOTBALL_CHANNELS}/>
              </div>
              <div className="w-full lg:w-[320px] shrink-0">
                <div className="flex gap-1 mb-4">
                  {[{k:"scores",l:"⚽ Scores"},{k:"upcoming",l:"Fixtures"}].map(({k,l})=>(
                    <button key={k} onClick={()=>setFootballPanel(k)} className="flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all"
                      style={{background:footballPanel===k?"rgba(30,213,150,0.1)":"rgba(255,255,255,0.02)",borderColor:footballPanel===k?"rgba(30,213,150,0.3)":"rgba(255,255,255,0.06)",color:footballPanel===k?"#1ed596":"#6b7280"}}>
                      {l}
                    </button>
                  ))}
                </div>
                <FifaScoresPanel/>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}