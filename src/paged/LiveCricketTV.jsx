import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Tv2, Signal, Volume2, Maximize2, AlertCircle,
  RefreshCw, Activity, Clock, Calendar, Trophy, BarChart2
} from "lucide-react";

// ─── CHANNELS ────────────────────────────────────────────────────────────────
const CHANNELS = [
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
  {
    id: "star-kannada", name: "Star Sports", sub: "Kannada",
    color: "#a855f7", glow: "rgba(168,85,247,0.3)", border: "rgba(168,85,247,0.25)",
    bg: "rgba(168,85,247,0.06)", tag: "KANNADA", useIcon: false,
    logo: "/star-sports-kan.jpg", url: "https://binge-giotv.pages.dev/player2?id=ss1kan",
    desc: "Star Sports 1 — Live cricket in Kannada commentary",
  },
  {
    id: "star-tamil", name: "Star Sports", sub: "Tamil",
    color: "#f59e0b", glow: "rgba(245,158,11,0.3)", border: "rgba(245,158,11,0.25)",
    bg: "rgba(245,158,11,0.06)", tag: "TAMIL", useIcon: false,
    logo: "/star-sports-tam.png", url: "https://binge-giotv.pages.dev/player2?id=ss1tam",
    desc: "Star Sports 1 — Live cricket in Tamil commentary",
  },
  {
    id: "star-telugu", name: "Star Sports", sub: "Telugu",
    color: "#10b981", glow: "rgba(16,185,129,0.3)", border: "rgba(16,185,129,0.25)",
    bg: "rgba(16,185,129,0.06)", tag: "TELUGU", useIcon: false,
    logo: "/star-sports-tel.png", url: "https://binge-giotv.pages.dev/player2?id=ss1tel",
    desc: "Star Sports 1 — Live cricket in Telugu commentary",
  },
];

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
const BASE_MATCH_NUM = 44;
const BASE_MATCH_ID  = 2484;
function getMatchId(n) { return BASE_MATCH_ID + (n - BASE_MATCH_NUM); }

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
  { num:45, date:"03-MAY-26", day:"Sun", time:"3:30 PM",  home:"SRH",  away:"KKR",  venue:"Hyderabad" },
  { num:46, date:"03-MAY-26", day:"Sun", time:"7:30 PM",  home:"GT",   away:"PBKS", venue:"Ahmedabad" },
  { num:47, date:"04-MAY-26", day:"Mon", time:"7:30 PM",  home:"MI",   away:"LSG",  venue:"Mumbai" },
  { num:48, date:"05-MAY-26", day:"Tue", time:"7:30 PM",  home:"DC",   away:"CSK",  venue:"Delhi" },
  { num:49, date:"06-MAY-26", day:"Wed", time:"7:30 PM",  home:"SRH",  away:"PBKS", venue:"Hyderabad" },
  { num:50, date:"07-MAY-26", day:"Thu", time:"7:30 PM",  home:"LSG",  away:"RCB",  venue:"Lucknow" },
  { num:51, date:"08-MAY-26", day:"Fri", time:"7:30 PM",  home:"DC",   away:"KKR",  venue:"Delhi" },
  { num:52, date:"09-MAY-26", day:"Sat", time:"7:30 PM",  home:"RR",   away:"GT",   venue:"Jaipur" },
  { num:53, date:"10-MAY-26", day:"Sun", time:"3:30 PM",  home:"CSK",  away:"LSG",  venue:"Chennai" },
  { num:54, date:"10-MAY-26", day:"Sun", time:"7:30 PM",  home:"RCB",  away:"MI",   venue:"Raipur" },
  { num:55, date:"11-MAY-26", day:"Mon", time:"7:30 PM",  home:"PBKS", away:"DC",   venue:"Dharamshala" },
  { num:56, date:"12-MAY-26", day:"Tue", time:"7:30 PM",  home:"GT",   away:"SRH",  venue:"Ahmedabad" },
  { num:57, date:"13-MAY-26", day:"Wed", time:"7:30 PM",  home:"RCB",  away:"KKR",  venue:"Raipur" },
  { num:58, date:"14-MAY-26", day:"Thu", time:"7:30 PM",  home:"PBKS", away:"MI",   venue:"Dharamshala" },
  { num:59, date:"15-MAY-26", day:"Fri", time:"7:30 PM",  home:"LSG",  away:"CSK",  venue:"Lucknow" },
  { num:60, date:"16-MAY-26", day:"Sat", time:"7:30 PM",  home:"KKR",  away:"GT",   venue:"Kolkata" },
  { num:61, date:"17-MAY-26", day:"Sun", time:"3:30 PM",  home:"PBKS", away:"RCB",  venue:"Dharamshala" },
  { num:62, date:"17-MAY-26", day:"Sun", time:"7:30 PM",  home:"DC",   away:"RR",   venue:"Delhi" },
  { num:63, date:"18-MAY-26", day:"Mon", time:"7:30 PM",  home:"CSK",  away:"SRH",  venue:"Chennai" },
  { num:64, date:"19-MAY-26", day:"Tue", time:"7:30 PM",  home:"RR",   away:"LSG",  venue:"Jaipur" },
  { num:65, date:"20-MAY-26", day:"Wed", time:"7:30 PM",  home:"KKR",  away:"MI",   venue:"Kolkata" },
  { num:66, date:"21-MAY-26", day:"Thu", time:"7:30 PM",  home:"GT",   away:"CSK",  venue:"Ahmedabad" },
  { num:67, date:"22-MAY-26", day:"Fri", time:"7:30 PM",  home:"SRH",  away:"RCB",  venue:"Hyderabad" },
  { num:68, date:"23-MAY-26", day:"Sat", time:"7:30 PM",  home:"LSG",  away:"PBKS", venue:"Lucknow" },
  { num:69, date:"24-MAY-26", day:"Sun", time:"3:30 PM",  home:"MI",   away:"RR",   venue:"Mumbai" },
  { num:70, date:"24-MAY-26", day:"Sun", time:"7:30 PM",  home:"KKR",  away:"DC",   venue:"Kolkata" },
];

const SCHEDULE_WITH_TIMES = SCHEDULE.map(m => ({
  ...m,
  id: getMatchId(m.num),
  startTime: makeIST(m.date, m.time),
  endTime:   new Date(makeIST(m.date, m.time).getTime() + 4 * 3600 * 1000),
}));

// ─── TEAM META ────────────────────────────────────────────────────────────────
const TEAM_META = {
  MI:   { primary:"#004f9f", accent:"#f7c400", name:"Mumbai Indians",             logo:"https://scores.iplt20.com/ipl/teamlogos/MI.png" },
  CSK:  { primary:"#f7c400", accent:"#004f9f", name:"Chennai Super Kings",         logo:"https://scores.iplt20.com/ipl/teamlogos/CSK.png" },
  RCB:  { primary:"#c8102e", accent:"#f5c518", name:"Royal Challengers Bengaluru", logo:"https://scores.iplt20.com/ipl/teamlogos/RCB.png" },
  KKR:  { primary:"#2d0052", accent:"#f5c518", name:"Kolkata Knight Riders",       logo:"https://scores.iplt20.com/ipl/teamlogos/KKR.png" },
  DC:   { primary:"#00008b", accent:"#ef4444", name:"Delhi Capitals",              logo:"https://scores.iplt20.com/ipl/teamlogos/DC.png" },
  PBKS: { primary:"#ed1c24", accent:"#c8a96e", name:"Punjab Kings",                logo:"https://scores.iplt20.com/ipl/teamlogos/PBKS.png" },
  RR:   { primary:"#2d4ea2", accent:"#ea1779", name:"Rajasthan Royals",            logo:"https://scores.iplt20.com/ipl/teamlogos/RR.png" },
  SRH:  { primary:"#f7622a", accent:"#000000", name:"Sunrisers Hyderabad",         logo:"https://scores.iplt20.com/ipl/teamlogos/SRH.png" },
  GT:   { primary:"#1b2133", accent:"#b8902a", name:"Gujarat Titans",              logo:"https://scores.iplt20.com/ipl/teamlogos/GT.png" },
  LSG:  { primary:"#00b2e3", accent:"#a4c639", name:"Lucknow Super Giants",        logo:"https://scores.iplt20.com/ipl/teamlogos/LSG.png" },
};

function getTeam(code) {
  return TEAM_META[code] || { primary:"#444", accent:"#aaa", name:code, logo:"" };
}

function nameToCode(name = "") {
  const n = name.toLowerCase();
  if (n.includes("mumbai"))     return "MI";
  if (n.includes("chennai"))    return "CSK";
  if (n.includes("kolkata"))    return "KKR";
  if (n.includes("royal") || n.includes("bengaluru") || n.includes("bangalore")) return "RCB";
  if (n.includes("sunrisers") || n.includes("hyderabad")) return "SRH";
  if (n.includes("delhi"))      return "DC";
  if (n.includes("punjab"))     return "PBKS";
  if (n.includes("rajasthan"))  return "RR";
  if (n.includes("gujarat"))    return "GT";
  if (n.includes("lucknow"))    return "LSG";
  return name.slice(0, 3).toUpperCase();
}

// ─── SCHEDULE HELPERS ─────────────────────────────────────────────────────────
function getActiveMatchId() {
  const now = new Date();
  
  // 1. Check for current LIVE match
  const live = SCHEDULE_WITH_TIMES.filter(m => now >= m.startTime && now <= m.endTime);
  if (live.length > 0) return live[0].id;

  // 2. Check for UPCOMING match starting within the next 30 minutes
  const upcomingSoon = SCHEDULE_WITH_TIMES.find(m => {
    const timeToStart = m.startTime.getTime() - now.getTime();
    return timeToStart > 0 && timeToStart <= 30 * 60 * 1000;
  });
  if (upcomingSoon) return upcomingSoon.id;

  // 3. Fallback: Show the most recently COMPLETED match result
  const completed = [...SCHEDULE_WITH_TIMES]
    .filter(m => now > m.endTime)
    .sort((a, b) => b.endTime - a.endTime); // Latest first
    
  if (completed.length > 0) return completed[0].id;

  return BASE_MATCH_ID;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
const POLL_MS  = 10_000;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function safeList(obj, key) {
  const v = (obj || {})[key] || [];
  return Array.isArray(v) ? v : [];
}
function fmtDate(dateStr) {
  const [d, m] = dateStr.split("-");
  return `${d} ${m}`;
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function PulsingDot({ color }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: color }} />
    </span>
  );
}

function ChannelCard({ ch, active, onClick }) {
  return (
    <button onClick={() => onClick(ch)}
      className="relative w-full text-left rounded-2xl border transition-all duration-300 active:scale-[0.98] overflow-hidden"
      style={{
        background: active ? ch.bg : "rgba(255,255,255,0.02)",
        borderColor: active ? ch.border : "rgba(255,255,255,0.06)",
        boxShadow: active ? `0 0 30px ${ch.glow}` : "none",
      }}>
      {active && <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${ch.color}44 0%, transparent 60%)` }} />}
      <div className="relative p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all"
          style={{ background: active ? `${ch.color}15` : "rgba(255,255,255,0.04)", borderColor: active ? ch.border : "rgba(255,255,255,0.06)" }}>
          {ch.useIcon
            ? <Tv2 size={22} style={{ color: active ? ch.color : "#4b5563" }} />
            : <img src={ch.logo} alt="" className="w-8 h-8 object-contain"
                style={{ filter: active ? "none" : "grayscale(100%) brightness(0.4)" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded"
              style={{ background: `${ch.color}20`, color: ch.color }}>{ch.tag}</span>
            <div className="flex items-center gap-1.5">
              <PulsingDot color={ch.color} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: ch.color }}>Live</span>
            </div>
          </div>
          <p className="text-sm font-black text-white uppercase tracking-tight leading-none">
            {ch.name} <span className="font-bold" style={{ color: ch.color }}>{ch.sub}</span>
          </p>
          <p className="text-[10px] text-gray-600 mt-1 truncate">{ch.desc}</p>
        </div>
        <div className="shrink-0 w-2 h-8 rounded-full transition-all" style={{ background: active ? ch.color : "transparent" }} />
      </div>
    </button>
  );
}

function BallChip({ ball }) {
  const b = String(ball).trim().toUpperCase();
  
  // Logic to handle "WK" or "W" consistently
  const displayLabel = b.includes("WK") || b === "W" ? "W" : b === "0" ? "·" : b;

  const styles = {
    "4":  { bg: "#3b82f6", border: "#2563eb", color: "#fff" }, // Blue
    "6":  { bg: "#16a34a", border: "#15803d", color: "#fff" }, // Green
    "W":  { bg: "#dc2626", border: "#b91c1c", color: "#fff" }, // Red
    "WK": { bg: "#dc2626", border: "#b91c1c", color: "#fff" }, // Red
    "NB": { bg: "#f59e0b", border: "#d97706", color: "#fff" }, // Amber
    "WD": { bg: "#78716c", border: "#57534e", color: "#fff" }, // Stone
    ".":  { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.2)", color: "#9ca3af" },
    "0":  { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.2)", color: "#9ca3af" },
  };

  // Determine which style to use based on the label content
  let s = styles["."]; // Default
  if (displayLabel.includes("4")) s = styles["4"];
  else if (displayLabel.includes("6")) s = styles["6"];
  else if (displayLabel.includes("W")) s = styles["W"];
  else if (displayLabel.includes("NB")) s = styles["NB"];
  else if (displayLabel.includes("WD")) s = styles["WD"];

  // Dynamic font size: smaller for 2+ characters to ensure it stays in the circle
  const fontSize = displayLabel.length > 1 ? "8px" : "11px";

  return (
    <span className="flex items-center justify-center rounded-full font-black border transition-transform shrink-0"
      style={{ 
        backgroundColor: s.bg, 
        borderColor: s.border, 
        color: s.color,
        width: "28px",   // Fixed width
        height: "28px",  // Fixed height for perfect circle
        fontSize: fontSize,
        lineHeight: "1"
      }}>
      {displayLabel}
    </span>
  );
}

// ─── BATTING TABLE ────────────────────────────────────────────────────────────
function BattingTable({ batsmen, ms }) {
  if (!batsmen || !batsmen.length)
    return <p className="text-center text-gray-700 text-xs py-8">No batting data yet</p>;

  const strikerID    = ms?.CurrentStrikerID    || "";
  const nonStrikerID = ms?.CurrentNonStrikerID || "";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            {["Batter","Status","R","B","4s","6s","SR"].map((h,i) => (
              <th key={h} className={`py-2 font-black text-gray-600 uppercase tracking-wider text-[9px]
                ${i===0?"pl-4 text-left":i<=1?"text-left px-2":"text-right px-2"}
                ${i===6?"pr-4":""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {batsmen.map((b, idx) => {
            const name  = b.BatterName  || b.PlayerName || b.Name || "";
            const runs  = b.Runs        ?? b.RunsScored  ?? 0;
            const balls = b.Balls       ?? b.BallsFaced  ?? 0;
            const fours = b.Fours       ?? b.FoursScored ?? 0;
            const sixes = b.Sixes       ?? b.SixesScored ?? 0;
            const sr    = b.StrikeRate  ?? (balls ? (runs / balls * 100).toFixed(1) : "0.0");
            const outDesc = b.OutDesc   || b.DismissalType || b.HowOut || "";
            const isStriker    = b.OnStrike === "1" || b.OnStrike === true || b.IsStriker === true
                              || (b.PlayerID && b.PlayerID === strikerID);
            const isNonStriker = b.OnStrike === "2" || b.IsNonStriker === true
                              || (b.PlayerID && b.PlayerID === nonStrikerID);
            const isOnPitch    = isStriker || isNonStriker || b.IsOnCrease === true || b.IsOnCrease === "1";
            const dism = outDesc || (isOnPitch ? "not out" : "");

            return (
              <tr key={idx} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <td className="pl-4 pr-2 py-2.5">
                  <span style={{ color: isOnPitch ? "#f5a623" : "rgba(255,255,255,0.7)" }} className="font-semibold">
                    {name}
                  </span>
                  {isStriker && (
                    <span className="ml-1.5 text-[7px] bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded px-1 py-0.5 font-black">★</span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-gray-600 text-[10px] max-w-[90px] truncate">{dism}</td>
                <td className="px-2 py-2.5 text-right font-black text-white text-sm">{runs}</td>
                <td className="px-2 py-2.5 text-right text-gray-500">{balls}</td>
                <td className="px-2 py-2.5 text-right text-blue-400 font-semibold">{fours}</td>
                <td className="px-2 py-2.5 text-right text-violet-400 font-semibold">{sixes}</td>
                <td className="pr-4 pl-2 py-2.5 text-right text-gray-600">{parseFloat(sr).toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── BOWLING TABLE ────────────────────────────────────────────────────────────
function BowlingTable({ bowlers, ms }) {
  if (!bowlers || !bowlers.length)
    return <p className="text-center text-gray-700 text-xs py-8">No bowling data yet</p>;

  const currentBowlerID = ms?.CurrentBowlerID || "";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            {["Bowler","O","M","R","W","Eco"].map((h,i) => (
              <th key={h} className={`py-2 font-black text-gray-600 uppercase tracking-wider text-[9px]
                ${i===0?"pl-4 text-left":"text-right px-2"}
                ${i===5?"pr-4":""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bowlers.map((b, idx) => {
            const name    = b.BowlerName  || b.PlayerName || b.Name || "";
            const overs   = b.Overs       ?? b.OversBowled  ?? 0;
            const maidens = b.Maidens     ?? b.MaidenOvers  ?? 0;
            const runs    = b.Runs        ?? b.RunsGiven     ?? 0;
            const wkts    = b.Wickets     ?? b.WicketsTaken  ?? 0;
            const eco     = b.Economy     ?? b.EconomyRate   ?? (parseFloat(overs) > 0 ? (runs / parseFloat(overs)).toFixed(2) : "-");
            const isCurrent = b.CurrentBowler === "1" || b.CurrentBowler === true
                           || (b.PlayerID && b.PlayerID === currentBowlerID);
            return (
              <tr key={idx} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <td className="pl-4 pr-2 py-2.5">
                  <span style={{ color: isCurrent ? "#60a5fa" : "rgba(255,255,255,0.8)" }} className="font-medium">
                    {name}
                  </span>
                  {isCurrent && (
                    <span className="ml-1.5 text-[7px] bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded px-1 py-0.5 font-black">●</span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-right text-white font-black text-sm">{overs}</td>
                <td className="px-2 py-2.5 text-right text-gray-600">{maidens}</td>
                <td className="px-2 py-2.5 text-right text-white font-black text-sm">{runs}</td>
                <td className="px-2 py-2.5 text-right font-black" style={{ color: wkts > 0 ? "#4ade80" : "rgba(255,255,255,0.5)" }}>{wkts}</td>
                <td className="pr-4 pl-2 py-2.5 text-right text-gray-600">{parseFloat(eco).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── FALL OF WICKETS ──────────────────────────────────────────────────────────
function FallOfWickets({ fow }) {
  if (!fow || !fow.length) return null;
  return (
    <div className="px-4 py-3 border-t" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">Fall of Wickets</p>
      <div className="flex flex-wrap gap-2">
        {fow.map((w, i) => (
          <span key={i} className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">
            {w.Score||w.FallScore||"?"}/{i+1} · {w.BatterName||w.PlayerName||w.Name||"?"} ({w.OverNumber||w.Overs||"?"} ov)
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── POINTS TABLE (UPDATED WITH FORM & LOGOS) ────────────────────────────────
function PointsTable() {
  const [points, setPoints]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/ipl/points-table`)
      .then(r => r.json())
      .then(j => {
        if (j.ok) setPoints(j.data || []);
        else setError(j.error || "Failed");
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor:"rgba(245,166,35,0.2)", borderTopColor:"#f5a623" }} />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={14} className="text-amber-400" />
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Season Standings</span>
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02]">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_80px] gap-x-3 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          {["Team","M","W","L","Pts","NRR", "Form"].map((h, idx) => (
            <span key={h} className={`text-[9px] font-black text-gray-600 uppercase tracking-widest ${idx === 0 ? "text-left" : "text-right"}`}>
              {h}
            </span>
          ))}
        </div>

        {points.map((p, i) => {
          const teamName = p.TeamName || p.Team || "";
          const code     = p.TeamCode || nameToCode(teamName);
          // Prioritize the Logo from the JSON data as requested
          const teamLogo = p.TeamLogo || getTeam(code).logo;
          const team     = getTeam(code);
          
          const m   = p.Matches      || 0;
          const w   = p.Wins         || 0;
          const l   = p.Losses       || 0;
          const pts = p.Points       || 0;
          const nrr = p.NetRunRate   || "0.000";
          const form = p.Performance  || ""; // e.g., "W,W,L,W,L"
          const qual = i < 4;

          return (
            <div key={i}
              className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_80px] gap-x-3 px-4 py-3.5 border-b border-white/5 items-center transition-all hover:bg-white/[0.04]"
              style={{ background: qual && i === 0 ? `${team.primary}08` : "transparent" }}>
              
              {/* Team Info */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={teamLogo} alt={code} className="w-6 h-6 object-contain z-10 relative"
                    onError={e => { e.target.src = team.logo; }} />
                  {qual && <div className="absolute -inset-1 blur-sm rounded-full" style={{ background: `${team.primary}40` }} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-black text-white leading-none">{code}</span>
                  {qual && <span className="text-[7px] font-bold text-amber-500 uppercase tracking-tighter mt-1">Playoff Zone</span>}
                </div>
              </div>

              {/* Stats */}
              <span className="text-[11px] text-gray-400 text-right">{m}</span>
              <span className="text-[11px] text-green-400 font-bold text-right">{w}</span>
              <span className="text-[11px] text-red-400 font-bold text-right">{l}</span>
              <span className="text-[13px] font-black text-white text-right">{pts}</span>
              <span className="text-[10px] text-gray-500 text-right font-mono">
                {parseFloat(nrr) >= 0 ? "+" : ""}{parseFloat(nrr).toFixed(3)}
              </span>

              {/* Form Indicator (Last 5) */}
              <div className="flex gap-1 justify-end">
                {form.split(',').map((res, idx) => (
                  <span key={idx} 
                    className={`w-3 h-3 flex items-center justify-center rounded-[3px] text-[7px] font-black text-white shadow-sm`}
                    style={{ 
                      background: res === 'W' ? '#22c55e' : res === 'L' ? '#ef4444' : '#6b7280',
                      opacity: 1 - (idx * 0.12) // Fades older matches slightly
                    }}>
                    {res}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center px-1">
        <p className="text-[8px] text-gray-600 italic">Data updates automatically after match completion</p>
        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Top 4 Advance to Playoffs</p>
      </div>
    </div>
  );
}

// ─── STATS PANEL ──────────────────────────────────────────────────────────────
function StatsPanel() {
  const [tab, setTab]             = useState("batting");
  const [batters, setBatters]     = useState([]);
  const [bowlers, setBowlers]     = useState([]);
  const [loadingBat, setLoadingBat] = useState(true);
  const [loadingBowl, setLoadingBowl] = useState(true);
  const [errorBat, setErrorBat]   = useState(null);
  const [errorBowl, setErrorBowl] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/ipl/top-run-scorers`)
      .then(r => r.json())
      .then(j => { if (j.ok) setBatters(j.data || []); else setErrorBat(j.error || "Failed"); })
      .catch(e => setErrorBat(e.message))
      .finally(() => setLoadingBat(false));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/ipl/most-wickets`)
      .then(r => r.json())
      .then(j => { if (j.ok) setBowlers(j.data || []); else setErrorBowl(j.error || "Failed"); })
      .catch(e => setErrorBowl(e.message))
      .finally(() => setLoadingBowl(false));
  }, []);

  const isLoading = tab === "batting" ? loadingBat : loadingBowl;
  const error     = tab === "batting" ? errorBat   : errorBowl;

  // max runs / wickets for bar scaling
  const maxRuns    = batters[0]?.runs    ? parseInt(batters[0].runs)    : 1;
  const maxWickets = bowlers[0]?.wickets ? parseInt(bowlers[0].wickets) : 1;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart2 size={13} className="text-amber-400" />
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Season Stats</span>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[
          { key:"batting",  label:"🏏 Top Scorers" },
          { key:"bowling",  label:"🎳 Top Wickets" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border"
            style={{
              background: tab===key?"rgba(245,166,35,0.1)":"rgba(255,255,255,0.02)",
              borderColor: tab===key?"rgba(245,166,35,0.3)":"rgba(255,255,255,0.06)",
              color: tab===key?"#f5a623":"#6b7280",
            }}>
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor:"rgba(245,166,35,0.2)", borderTopColor:"#f5a623" }} />
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-8">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* TOP RUN SCORERS SECTION */}
{tab === "batting" && !isLoading && !errorBat && (
  <div className="rounded-2xl overflow-hidden border" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
    {/* ... Table Header Code ... */}

    {batters.map((p, i) => {
      const team = getTeam(p.team);
      const barWidth = Math.round((parseInt(p.runs) / maxRuns) * 100);
      
      // Construct the S3 URL using the player name
      const playerImageUrl = `https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/${p.name}.png`;

      return (
        <div key={i} className="border-b transition-all hover:bg-white/3"
          style={{ borderColor:"rgba(255,255,255,0.04)" }}>
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-2 px-3 py-2.5 items-center">
            
            {/* Rank */}
            <span className="text-[10px] font-black w-5" style={{ color: i === 0 ? "#f5c518" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#6b7280" }}>
              {i + 1}
            </span>

            {/* Player Image, Name + Team */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Player Face Image */}
              <div className="relative w-8 h-8 rounded-full bg-gray-800 overflow-hidden shrink-0 border border-white/10">
                <img 
                  src={playerImageUrl} 
                  alt={p.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image doesn't exist: show team logo or a generic avatar
                    e.target.src = team.logo; 
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-white truncate">{p.name}</span>
                </div>
                <span className="text-[9px] font-bold px-1 rounded mt-0.5 inline-block"
                  style={{ background:`${team.primary}30`, color:team.accent }}>{p.team}</span>
              </div>
            </div>

            {/* Stats columns */}
            <span className="text-[13px] font-black text-right" style={{ color:"#f5a623" }}>{p.runs}</span>
            <span className="text-[10px] text-gray-500 text-right">{parseFloat(p.average).toFixed(1)}</span>
            <span className="text-[10px] text-green-400 font-bold text-right">{parseFloat(p.strikeRate).toFixed(1)}</span>
            <span className="text-[10px] text-gray-500 text-right pr-3">{p.highScore}</span>
          </div>

          {/* Progress bar */}
          <div className="mx-3 mb-2 h-0.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width:`${barWidth}%`, background:`linear-gradient(90deg, ${team.primary}, #f5a623)` }} />
          </div>
        </div>
      );
    })}
  </div>
)}

{/* MOST WICKETS */}
{tab === "bowling" && !isLoading && !errorBowl && (
  <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02]">
    {/* Table header - Hidden on small mobile to save space, shown on desktop */}
    <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
      <span className="text-[10px] font-black text-gray-500 uppercase w-6">#</span>
      <span className="text-[10px] font-black text-gray-500 uppercase ml-14">Bowler</span>
      <span className="text-[10px] font-black text-gray-500 uppercase text-right">Wkts</span>
      <span className="text-[10px] font-black text-gray-500 uppercase text-right">Avg</span>
      <span className="text-[10px] font-black text-gray-500 uppercase text-right">Eco</span>
      <span className="text-[10px] font-black text-gray-500 uppercase text-right pr-4">BBI</span>
    </div>

    {bowlers.map((p, i) => {
      const team = getTeam(p.team);
      const barWidth = Math.round((parseInt(p.wickets) / maxWickets) * 100);
      const playerImageUrl = `https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/${p.name}.png`;

      return (
        <div key={i} className="border-b border-white/5 transition-all hover:bg-white/[0.03]">
          {/* Main Row: Responsive Grid */}
          <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 px-3 md:px-4 py-3 md:py-4 items-center">
            
            {/* 1. Rank */}
            <span className="text-[11px] md:text-xs font-black w-5 md:w-6 text-center"
              style={{ color: i === 0 ? "#f5c518" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#6b7280" }}>
              {i + 1}
            </span>

            {/* 2. Player Profile (Large on Desktop, Adjusted on Mobile) */}
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <div className="relative w-10 h-10 md:w-14 md:h-14 rounded-full bg-gray-800 overflow-hidden shrink-0 border-2 border-white/10 shadow-xl">
                <img 
                  src={playerImageUrl} 
                  alt={p.name} 
                  className="w-full h-full object-cover scale-110 translate-y-1"
                  onError={(e) => {
                    e.target.src = team.logo; 
                    e.target.className = "w-full h-full object-contain p-2 opacity-50"; 
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] md:text-sm font-bold text-white truncate leading-tight">{p.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
                    style={{ background:`${team.primary}30`, color:team.accent }}>{p.team}</span>
                  {/* Mobile Only: Show basic stat next to name */}
                  <span className="md:hidden text-[10px] text-gray-500 font-bold">Eco: {parseFloat(p.economy).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 3. Wickets - Larger on mobile to emphasize key stat */}
            <div className="text-right flex flex-col md:block">
              <span className="text-lg md:text-xl font-black text-green-400 leading-none">{p.wickets}</span>
              <span className="md:hidden text-[8px] text-gray-600 uppercase font-bold tracking-tighter">Wickets</span>
            </div>

            {/* 4. Desktop Only Stats */}
            <span className="hidden md:block text-[11px] text-gray-400 text-right font-medium">{parseFloat(p.average).toFixed(1)}</span>
            <span className="hidden md:block text-[11px] text-blue-400 font-bold text-right">{parseFloat(p.economy).toFixed(2)}</span>
            <span className="hidden md:block text-[11px] text-gray-500 text-right pr-4">{p.bestInnings}</span>
          </div>

          {/* Progress bar - Thicker on desktop, slim on mobile */}
          <div className="mx-3 md:mx-4 mb-3 h-0.5 md:h-1 rounded-full overflow-hidden bg-white/5">
            <div className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width:`${barWidth}%`, background:`linear-gradient(90deg, ${team.primary}, #4ade80)` }} />
          </div>
        </div>
      );
    })}
  </div>
)}
    </div>
  );
}

// ─── MATCH CARD (schedule) ────────────────────────────────────────────────────
function MatchCard({ match, isLive, isActive, onClick }) {
  const home = getTeam(match.home);
  const away = getTeam(match.away);
  return (
    <button onClick={() => onClick(match)}
      className="w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden active:scale-[0.98]"
      style={{
        background: isActive ? "rgba(245,166,35,0.06)" : "rgba(255,255,255,0.02)",
        borderColor: isActive ? "rgba(245,166,35,0.3)" : isLive ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)",
        boxShadow: isActive ? "0 0 20px rgba(245,166,35,0.15)" : "none",
      }}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
              Match {match.num} · {fmtDate(match.date)}
            </span>
            {isLive && (
              <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full">
                <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse inline-block" />
                Live
              </span>
            )}
          </div>
          <span className="text-[9px] text-gray-600 font-bold">{match.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <img src={home.logo} alt={match.home} className="w-8 h-8 object-contain"
              onError={e => { e.target.style.display="none"; }} />
            <div>
              <span className="text-sm font-black text-white">{match.home}</span>
              <p className="text-[9px] text-gray-600 leading-none">{home.name}</p>
            </div>
          </div>
          <span className="text-[10px] font-black text-gray-700 px-2">vs</span>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="text-right">
              <span className="text-sm font-black text-white">{match.away}</span>
              <p className="text-[9px] text-gray-600 leading-none">{away.name}</p>
            </div>
            <img src={away.logo} alt={match.away} className="w-8 h-8 object-contain"
              onError={e => { e.target.style.display="none"; }} />
          </div>
        </div>
        <p className="text-[9px] text-gray-700 mt-2 flex items-center gap-1">
          📍 {match.venue}
          {isActive && <span className="ml-auto text-[8px] font-black" style={{ color:"#f5a623" }}>● SELECTED</span>}
        </p>
      </div>
    </button>
  );
}

// ─── SCHEDULE PANEL ───────────────────────────────────────────────────────────
function SchedulePanel({ activeMatchId, onSelectMatch }) {
  const now = new Date();
  const live = SCHEDULE_WITH_TIMES.filter(m => now >= m.startTime && now <= m.endTime);
  const liveIds = new Set(live.map(m => m.id));
  const upcoming = SCHEDULE_WITH_TIMES.filter(m => now < m.startTime).slice(0, 8);
  const toShow = [...live];
  const addedIds = new Set(live.map(m => m.id));
  upcoming.forEach(m => { if (!addedIds.has(m.id)) { toShow.push(m); addedIds.add(m.id); } });

  const byDate = {};
  toShow.forEach(m => { if (!byDate[m.date]) byDate[m.date] = []; byDate[m.date].push(m); });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar size={13} className="text-amber-400" />
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Upcoming Matches</span>
      </div>
      {Object.entries(byDate).map(([date, matches]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
              {matches[0].day} · {fmtDate(date)}
            </span>
            {matches.length > 1 && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                style={{ background:"rgba(245,166,35,0.12)", color:"#f5a623" }}>
                Double Header
              </span>
            )}
          </div>
          <div className="space-y-2">
            {matches.map(m => (
              <MatchCard key={m.id} match={m} isLive={liveIds.has(m.id)}
                isActive={m.id === activeMatchId} onClick={() => onSelectMatch(m.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BallByBallTracker({ innData }) {
  // Using the provided 'OverHistory' array from the source
  const overHistory = innData?.OverHistory || [];
  if (!overHistory.length) return null;

  // Group balls by OverNo (e.g., OverNo: 1 is the 1st over)
  const groupedOvers = overHistory.reduce((acc, ball) => {
    const ov = ball.OverNo; 
    if (!acc[ov]) acc[ov] = [];
    acc[ov].push(ball);
    return acc;
  }, {});

  // Sort by highest over number first (latest overs)
  const sortedOverKeys = Object.keys(groupedOvers).sort((a, b) => b - a).slice(0, 3);

  return (
    <div className="mt-4 px-4 overflow-x-auto border-t border-white/5 pt-4 pb-2">
      <div className="flex items-center gap-6 min-w-max">
        {sortedOverKeys.map((ovKey, idx) => (
          <div key={ovKey} className="flex items-center gap-4">
            <div className="flex flex-col items-center min-w-[30px]">
              <span className="text-[9px] font-black text-gray-500 uppercase">OV</span>
              {/* ovKey from data (1, 2, etc.) is the correct over number */}
              <span className="text-sm font-black text-white">{ovKey}</span>
            </div>

            <div className="flex gap-1.5">
              {groupedOvers[ovKey].map((ball, bIdx) => (
                <BallChip key={bIdx} ball={ball.Runs} />
              ))}
            </div>

            {idx < sortedOverKeys.length - 1 && (
              <div className="h-8 w-px bg-white/10 mx-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function DetailedBattingTable({ battingCard, strikerID, nonStrikerID }) {
  if (!battingCard || !battingCard.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.01]">
            {["Batter", "Status", "R", "B", "4s", "6s", "SR"].map((h, i) => (
              <th key={h} className={`py-3 font-black text-gray-500 uppercase tracking-wider text-[9px]
                ${i === 0 ? "pl-4 text-left" : "text-right px-2"} ${i === 6 ? "pr-4" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {battingCard.map((b, idx) => {
            const pid = b.PlayerID || b.PLAYER_ID;
            const isOnPitch = pid === strikerID || pid === nonStrikerID || b.OutDesc === "not out";
            const isStriker = pid === strikerID;
            
            // Image Logic: Prioritize API image URL, fallback to name-based S3 URL
            const playerImageUrl = b.PlayerImage || `https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/${b.PlayerName.trim()}.png`;

            return (
              <tr key={idx} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                <td className="pl-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Player Image */}
                    <div className="relative w-7 h-7 rounded-full bg-gray-800 overflow-hidden shrink-0 border border-white/10">
                      <img 
                        src={playerImageUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "/default-avatar.png"; }} // Add a local fallback path
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-bold ${isOnPitch ? "text-amber-400" : "text-gray-300"}`}>
                        {b.PlayerName} {isStriker && "★"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-[10px] text-gray-500 italic max-w-[120px] leading-tight">
                  {b.OutDesc}
                </td>
                <td className="px-2 py-3 text-right font-black text-white">{b.Runs}</td>
                <td className="px-2 py-3 text-right text-gray-500">{b.Balls}</td>
                <td className="px-2 py-3 text-right text-blue-400/80">{b.Fours}</td>
                <td className="px-2 py-3 text-right text-violet-400/80">{b.Sixes}</td>
                <td className="pr-4 py-3 text-right text-gray-600 font-mono">{b.StrikeRate}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DetailedBowlingTable({ bowlingCard, currentBowlerID }) {
  if (!bowlingCard || !bowlingCard.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.01]">
            {["Bowler", "O", "M", "R", "W", "Eco", "0s"].map((h, i) => (
              <th key={h} className={`py-3 font-black text-gray-500 uppercase tracking-wider text-[9px]
                ${i === 0 ? "pl-4 text-left" : "text-right px-2"} ${i === 6 ? "pr-4" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bowlingCard.map((b, idx) => {
            const pid = b.PlayerID || b.PLAYER_ID;
            const isCurrent = pid === currentBowlerID;
            
            // Image Logic
            const playerImageUrl = b.PlayerImage || `https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/${b.PlayerName.trim()}.png`;

            return (
              <tr key={idx} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                <td className="pl-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Bowler Image */}
                    <div className="relative w-7 h-7 rounded-full bg-gray-900 overflow-hidden shrink-0 border border-white/10">
                      <img 
                        src={playerImageUrl} 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "/default-avatar.png"; }}
                      />
                    </div>
                    <span className={`font-bold ${isCurrent ? "text-blue-400" : "text-gray-300"}`}>
                      {b.PlayerName} {isCurrent && "●"}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-3 text-right text-white font-mono">{b.Overs}</td>
                <td className="px-2 py-3 text-right text-gray-500">{b.Maidens}</td>
                <td className="px-2 py-3 text-right text-white font-bold">{b.Runs}</td>
                <td className="px-2 py-3 text-right text-green-400 font-black">{b.Wickets}</td>
                <td className="px-2 py-3 text-right text-gray-500">{b.Economy}</td>
                <td className="pr-4 py-3 text-right text-gray-700">{b.DotBalls || 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN SCORECARD COMPONENT ───────────────────────────────────────────────
// ─── DROP-IN REPLACEMENT: IPLScorecard only ───────────────────────
// No result banner card. Result shown as green text inside score card only.

function IPLScorecard({ matchId, matchInfo }) {
  const [ms, setMs]                   = useState(null);
  const [allInnings, setAllInnings]   = useState({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activeTab, setActiveTab]     = useState("batting");
  const [viewInnings, setViewInnings] = useState("1");
  const [lastUpdate, setLastUpdate]   = useState(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [countdown, setCountdown]     = useState(10);

  const msRef    = useRef(null);
  const matchRef = useRef(matchId);

  useEffect(() => {
    matchRef.current = matchId;
    setMs(null); setAllInnings({}); setLoading(true); setError(null); setViewInnings("1");
  }, [matchId]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res  = await fetch(`${API_BASE}/api/match/${matchRef.current}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Network error");

      const { summary, innings: inn, currentInnings } = json.data;
      let msData = summary?.MatchSummary || {};
      if (Array.isArray(msData)) msData = msData[0] || {};
      setMs(msData);
      msRef.current = msData;

      if (inn) {
        setAllInnings(prev => ({ ...prev, [currentInnings]: inn }));
        setViewInnings(currentInnings);
      }

      // When match ends, fetch the other innings too for full scorecard
      if (String(msData.IsMatchEnd ?? "0") === "1") {
        const otherInn = currentInnings === "1" ? "2" : "1";
        try {
          const r2 = await fetch(`${API_BASE}/api/match/${matchRef.current}?innings=${otherInn}`);
          const j2 = await r2.json();
          if (j2.ok && j2.data?.innings) {
            setAllInnings(prev => ({ ...prev, [otherInn]: j2.data.innings }));
          }
        } catch { /* ignore */ }
      }

      setLastUpdate(new Date());
      setCountdown(10);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 10_000);
    return () => clearInterval(interval);
  }, [load, matchId]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => c <= 1 ? 10 : c - 1), 1000);
    return () => clearInterval(tick);
  }, [lastUpdate]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "rgba(245,166,35,0.1)", borderTopColor: "#f5a623" }} />
      <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Loading…</p>
    </div>
  );

  if (error || !ms) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
      <AlertCircle size={28} className="text-red-500/60" />
      <p className="text-[11px] text-gray-700 max-w-xs">{error}</p>
      <button onClick={() => load()}
        className="mt-2 px-4 py-2 rounded-xl border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
        Retry
      </button>
    </div>
  );

  const isLive   = String(ms.IsMatchEnd ?? 0) === "0";
  const isEnded  = !isLive;
  const curInn   = String(ms.CurrentInnings || "1");
  const inn1Code = nameToCode(ms.FirstBattingTeam  || "") || (ms.AwayTeamCode || "");
  const inn2Code = nameToCode(ms.SecondBattingTeam || "") || (ms.HomeTeamCode || "");
  const inn1Team = getTeam(inn1Code);
  const inn2Team = getTeam(inn2Code);

  const s1 = ms["1FallScore"] ?? ""; const w1 = ms["1FallWickets"] ?? "0"; const o1 = ms["1FallOvers"] ?? "";
  const s2 = ms["2FallScore"] ?? ""; const w2 = ms["2FallWickets"] ?? "0"; const o2 = ms["2FallOvers"] ?? "";

  const crr    = curInn === "1" ? ms["1RunRate"] ?? "" : ms["2RunRate"] ?? "";
  const rrr    = curInn === "2" ? ms.RequiredRunRate ?? "" : "";
  const target = curInn === "2" ? ms.Target ?? "" : "";
  const proj1  = ms.ProjectedScore ?? "";
  const proj2  = ms["2ndProjectedScore"] ?? "";
  const proj3  = ms["3rdProjectedScore"] ?? "";

  let reqRuns = "";
  if (curInn === "2" && target && s2 !== "" && isLive) {
    const n = parseInt(target) - parseInt(s2 || 0);
    reqRuns = n > 0 ? String(n) : "0";
  }

  const currentInnKey  = `Innings${viewInnings}`;
  const innDataWrapper = allInnings[viewInnings] || {};
  const innData        = innDataWrapper?.[currentInnKey] || innDataWrapper || {};
  const battingCard    = innData?.BattingCard   || [];
  const bowlingCard    = innData?.BowlingCard   || [];
  const commentary     = innData?.OverHistory   || innData?.Commentary || [];
  const fowData        = innData?.FallOfWickets || [];

  const viewInnCode  = viewInnings === "1" ? inn1Code : inn2Code;
  const availInnings = Object.keys(allInnings).sort();

  // Winner detection
  const winnerID = String(ms.WinningTeamID || "");
  const homeID   = String(ms.HomeTeamID   || "");
  const awayID   = String(ms.AwayTeamID   || "");
  const winnerCode = isEnded && winnerID
    ? winnerID === homeID
      ? (ms.HomeTeamCode || inn2Code)
      : winnerID === awayID
        ? (ms.AwayTeamCode || inn1Code)
        : nameToCode(ms.WinningTeamName || "")
    : "";

  return (
    <div className="space-y-3">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-amber-400" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Match {matchInfo?.num || ""} Scorecard
          </span>
          {isLive && (
            <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live {countdown}s
            </span>
          )}
          {isEnded && (
            <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              ✓ Completed
            </span>
          )}
        </div>
        <button onClick={() => load()}
          className={`text-gray-600 hover:text-amber-400 transition-all ${refreshing ? "animate-spin" : ""}`}>
          <RefreshCw size={12} />
        </button>
      </div>

      {/* ── SCORE CARD ── */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md overflow-hidden shadow-lg">

        {/* Venue + Toss */}
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <p className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase">{ms.GroundName}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 font-medium italic flex items-center gap-1">
            <span className="opacity-70">🪙</span> {ms.TossDetails}
          </p>
        </div>

        {/* Two team rows */}
        <div className="p-3 space-y-2">
          {[
            { num: 1, code: inn1Code, team: inn1Team, score: s1, wkts: w1, overs: o1 },
            { num: 2, code: inn2Code, team: inn2Team, score: s2, wkts: w2, overs: o2 },
          ].map(({ num, code, team, score, wkts, overs }) => {
            const isBatting = curInn === String(num) && isLive;
            const isWinner  = isEnded && code === winnerCode;
            return (
              <div key={num}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 border transition-all"
                style={{
                  background: isBatting ? `${team.primary}12` : isWinner ? `${team.primary}10` : "rgba(255,255,255,0.02)",
                  borderColor: isBatting ? `${team.primary}30` : isWinner ? `${team.primary}30` : "rgba(255,255,255,0.04)",
                }}>
                <img src={team.logo} className="w-9 h-9 object-contain opacity-90" alt=""
                  onError={e => { e.target.style.display = "none"; }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-white">{code}</span>
                    {isBatting && (
                      <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(245,166,35,0.2)", color: "#f5a623" }}>
                        Batting
                      </span>
                    )}
                    {isWinner && (
                      <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded"
                        style={{ background: `${team.accent}25`, color: team.accent }}>
                        Winner 🏆
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-600 truncate">{team.name}</p>
                </div>
                <div className="text-right shrink-0">
                  {score ? (
                    <>
                      <span className="text-xl font-black text-white">{score}/{wkts}</span>
                      {overs && <span className="text-[10px] text-gray-600 ml-1">({overs} ov)</span>}
                      {isBatting && proj1 && (
                        <div className="text-[9px] font-bold mt-0.5" style={{ color: "#f5a623" }}>
                          Proj: {proj1}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">Yet to bat</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ball-by-ball — live only */}
        {isLive && viewInnings === curInn && <BallByBallTracker innData={innData} />}

        {/* Live stats bar */}
        {isLive && (
          <div className="px-4 py-3 border-t border-white/5 flex gap-5 flex-wrap bg-white/[0.01]">
            {crr && parseFloat(crr) > 0 && (
              <div>
                <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest block">CRR</span>
                <span className="text-sm font-black text-green-400">{parseFloat(crr).toFixed(2)}</span>
              </div>
            )}
            {rrr && parseFloat(rrr) > 0 && (
              <div>
                <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest block">RRR</span>
                <span className="text-sm font-black text-amber-400">{parseFloat(rrr).toFixed(2)}</span>
              </div>
            )}
            {target && (
              <div>
                <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest block">Target</span>
                <span className="text-sm font-black text-white">{target}</span>
              </div>
            )}
            {reqRuns && (
              <div>
                <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest block">Need</span>
                <span className="text-sm font-black" style={{ color: "#f87171" }}>{reqRuns} runs</span>
              </div>
            )}
            {ms.RemainingBalls && curInn === "2" && (
              <div>
                <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest block">Balls</span>
                <span className="text-sm font-black text-white">{ms.RemainingBalls}</span>
              </div>
            )}
            {curInn === "1" && proj1 && (
              <div className="ml-auto flex gap-3">
                {[[proj1,"C"],[proj2,"M"],[proj3,"A"]].filter(([v]) => v).map(([val, lbl]) => (
                  <div key={lbl} className="text-right">
                    <span className="text-[8px] text-gray-700 uppercase tracking-widest block">{lbl}</span>
                    <span className="text-sm font-black" style={{ color: "#f5a623" }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Result text — green line at bottom when ended ── */}
        {isEnded && ms.Comments && (
          <div className="px-4 py-2.5 border-t border-white/5 text-center"
            style={{ background: "rgba(74,222,128,0.04)" }}>
            <p className="text-[11px] font-black text-green-400">{ms.Comments}</p>
          </div>
        )}
      </div>

      {/* ── INNINGS SELECTOR ── */}
      {availInnings.length > 1 && (
        <div className="flex gap-2">
          {availInnings.map(inn => {
            const innCode = inn === "1" ? inn1Code : inn2Code;
            return (
              <button key={inn} onClick={() => setViewInnings(inn)}
                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border"
                style={{
                  background: viewInnings === inn ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
                  color: viewInnings === inn ? "#f5a623" : "#6b7280",
                  borderColor: viewInnings === inn ? "rgba(245,166,35,0.3)" : "rgba(255,255,255,0.06)",
                }}>
                {innCode} Inn {inn}
              </button>
            );
          })}
        </div>
      )}

      {/* ── SCORECARD TABS ── */}
      <div className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="flex border-b border-white/5 bg-white/[0.01]">
          {["batting", "bowling", "commentary"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-b-2"
              style={{
                color: activeTab === t ? "#f5a623" : "#4b5563",
                borderBottomColor: activeTab === t ? "#f5a623" : "transparent",
                background: "transparent",
              }}>
              {t === "batting"
                ? `${viewInnCode} Bat`
                : t === "bowling"
                ? `${viewInnings === "1" ? inn2Code : inn1Code} Bowl`
                : "Comm"}
            </button>
          ))}
        </div>

        <div className="min-h-[200px]">
          {activeTab === "batting" && (
            <>
              <DetailedBattingTable
                battingCard={battingCard}
                strikerID={ms?.CurrentStrikerID}
                nonStrikerID={ms?.CurrentNonStrikerID}
              />
              {fowData.length > 0 && (
                <div className="px-4 py-3 border-t border-white/5">
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">
                    Fall of Wickets
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {fowData.map((w, i) => (
                      <span key={i} className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                        {w.FallScore}/{w.FallWickets} · {w.PlayerName} ({w.FallOvers} ov)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "bowling" && (
            <DetailedBowlingTable
              bowlingCard={bowlingCard}
              currentBowlerID={ms?.CurrentBowlerID}
            />
          )}

          {activeTab === "commentary" && (
            <div className="divide-y divide-white/[0.03]">
              {commentary.length > 0 ? commentary.slice(0, 20).map((c, i) => {
                const text      = c.NewCommentry || c.CommentaryText || c.Commentary || c.Text || "";
                const cleanText = text.replace(/<[^>]+>/g, "").trim();
                const over      = c.BallName || c.OverNumber || c.OverNo || "";
                const isFour    = String(c.IsFour)   === "1";
                const isSix     = String(c.IsSix)    === "1";
                const isWkt     = String(c.IsWicket) === "1";
                return (
                  <div key={i} className="px-4 py-3 flex gap-3 hover:bg-white/[0.01] transition-colors">
                    <div className="w-10 shrink-0 text-center pt-0.5">
                      <span className="text-[10px] font-black text-amber-500 block">{over}</span>
                      <div className="mt-1 flex justify-center">
                        <BallChip ball={isWkt ? "W" : isSix ? "6" : isFour ? "4" : String(c.Runs ?? "")} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {c.CommentStrikers && (
                        <p className="text-[10px] font-black text-gray-300 mb-0.5 truncate">{c.CommentStrikers}</p>
                      )}
                      <p className="text-[11px] text-gray-500 leading-relaxed">{cleanText}</p>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-center text-gray-700 text-xs py-8">No commentary available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LiveCricketTV() {
  const [active, setActive]             = useState(CHANNELS[0]);
  const [switching, setSwitching]       = useState(false);
  const [activeMatchId, setActiveMatchId] = useState(() => getActiveMatchId());
  const [rightPanel, setRightPanel]     = useState("scorecard");
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => {
      const newId = getActiveMatchId();
      setActiveMatchId(prev => prev !== newId ? newId : prev);
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const activeMatchInfo = SCHEDULE_WITH_TIMES.find(m => m.id === activeMatchId) || null;

  const handleSwitch = (ch) => {
    if (ch.id === active.id) return;
    setSwitching(true);
    setTimeout(() => { setActive(ch); setSwitching(false); }, 350);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) playerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
        style={{ background:`radial-gradient(ellipse 60% 40% at 50% 0%, ${active.glow} 0%, transparent 70%)` }} />

      {/* Navbar */}
      <header className="relative z-10 h-16 flex items-center px-4 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/watch" className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft size={18} className="text-gray-400" />
            </Link>
            <Link to="/"><img src="/logo_39.png" className="h-7" alt="logo" /></Link>
          </div>
          <div className="flex items-center gap-2">
            {[
              { key:"schedule", icon:<Calendar size={9}/>, label:"Schedule" },
              { key:"points",   icon:<Trophy size={9}/>,   label:"Points" },
              { key:"stats",    icon:<BarChart2 size={9}/>, label:"Stats" },
            ].map(({ key, icon, label }) => (
              <button key={key} onClick={() => setRightPanel(p => p === key ? "scorecard" : key)}
                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all"
                style={{
                  color: rightPanel===key?"#f5a623":"#6b7280",
                  borderColor: rightPanel===key?"rgba(245,166,35,0.3)":"rgba(255,255,255,0.08)",
                  background: rightPanel===key?"rgba(245,166,35,0.08)":"transparent",
                }}>
                {icon}{label}
              </button>
            ))}
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border transition-all duration-500"
              style={{ color:active.color, borderColor:active.border, background:active.bg }}>
              <Signal size={9} />
              Live
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 pb-24">
        <div className="mb-6">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-1">Live Streaming</p>
          <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">
            Cricket <span style={{ color:active.color }}>Live TV</span>
          </h1>
          {activeMatchInfo && (
            <p className="text-[11px] text-gray-600 mt-1">
              Showing: <span className="text-white font-bold">
                Match {activeMatchInfo.num} · {activeMatchInfo.home} vs {activeMatchInfo.away}
              </span>
              <span className="text-gray-700"> · {fmtDate(activeMatchInfo.date)} {activeMatchInfo.time}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CHANNELS.map(ch => (
                <ChannelCard key={ch.id} ch={ch} active={active.id===ch.id} onClick={handleSwitch} />
              ))}
            </div>

            <div ref={playerRef} className="relative rounded-3xl overflow-hidden border shadow-2xl"
              style={{ borderColor:active.border, boxShadow:`0 0 60px ${active.glow}`, background:"#000" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b transition-all duration-500"
                style={{ borderColor:active.border, background:`linear-gradient(90deg, ${active.bg}, transparent)` }}>
                <div className="flex items-center gap-3">
                  <PulsingDot color={active.color} />
                  <div className="flex items-center gap-2">
                    {active.useIcon
                      ? <Tv2 size={14} style={{ color:active.color }} />
                      : <img src={active.logo} alt="" className="h-4 w-auto object-contain" />}
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color:active.color }}>
                      {active.name} {active.sub}
                    </span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{ background:`${active.color}20`, color:active.color }}>Live</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 size={14} className="text-gray-600" />
                  <button onClick={handleFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <Maximize2 size={14} className="text-gray-500 hover:text-white transition-colors" />
                  </button>
                </div>
              </div>

              <div className="relative w-full" style={{ paddingTop:"56.25%" }}>
                {switching && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-3"
                      style={{ borderColor:`${active.color}44`, borderTopColor:active.color }} />
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color:active.color }}>Switching…</p>
                  </div>
                )}
                <iframe ref={iframeRef} key={active.id} src={active.url}
                  className="absolute inset-0 w-full h-full border-none"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen scrolling="no"
                  style={{ opacity:switching?0:1, transition:"opacity 0.35s ease" }} />
              </div>

              <div className="flex items-center gap-2 px-4 py-2.5 border-t"
                style={{ borderColor:active.border, background:"rgba(0,0,0,0.4)" }}>
                <AlertCircle size={11} className="text-gray-700 shrink-0" />
                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-wider">
                  Stream via third-party provider · Use Chrome · Disable ad-blocker if needed
                </p>
              </div>
            </div>

            {/* Quick-switch */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest shrink-0">Quick Switch</span>
              <div className="flex gap-2 flex-wrap">
                {CHANNELS.map(ch => (
                  <button key={ch.id} onClick={() => handleSwitch(ch)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    style={{
                      background: active.id===ch.id?ch.bg:"rgba(255,255,255,0.02)",
                      borderColor: active.id===ch.id?ch.border:"rgba(255,255,255,0.06)",
                      color: active.id===ch.id?ch.color:"#4b5563",
                    }}>
                    <PulsingDot color={active.id===ch.id?ch.color:"#374151"} />
                    {ch.useIcon
                      ? <Tv2 size={11} style={{ color:active.id===ch.id?ch.color:"#4b5563" }} />
                      : <img src={ch.logo} alt="" className="h-3 w-auto object-contain opacity-80" />}
                    {ch.sub}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="lg:hidden flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">
                {rightPanel === "schedule" ? "Schedule" : rightPanel === "points" ? "Points Table" : rightPanel === "stats" ? "Season Stats" : "Match Center"}
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Panel tabs */}
            <div className="flex gap-1.5 mb-4">
              {[
                { key:"scorecard", label:"Scorecard" },
                { key:"schedule",  label:"Schedule" },
                { key:"points",    label:"Points" },
                { key:"stats",     label:"Stats" },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setRightPanel(key)}
                  className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border"
                  style={{
                    background: rightPanel===key?"rgba(245,166,35,0.1)":"rgba(255,255,255,0.02)",
                    borderColor: rightPanel===key?"rgba(245,166,35,0.3)":"rgba(255,255,255,0.06)",
                    color: rightPanel===key?"#f5a623":"#6b7280",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {rightPanel === "schedule" && (
              <SchedulePanel activeMatchId={activeMatchId}
                onSelectMatch={id => { setActiveMatchId(id); setRightPanel("scorecard"); }} />
            )}
            {rightPanel === "points"   && <PointsTable />}
            {rightPanel === "stats"    && <StatsPanel />}
            {rightPanel === "scorecard" && (
              <IPLScorecard matchId={activeMatchId} matchInfo={activeMatchInfo} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}