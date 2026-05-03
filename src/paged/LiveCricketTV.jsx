import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Tv2, Signal, Volume2, Maximize2, AlertCircle,
  RefreshCw, Activity, Clock, Calendar, Trophy
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
  const live = SCHEDULE_WITH_TIMES.filter(m => now >= m.startTime && now <= m.endTime);
  if (live.length > 0) return live[0].id;
  const upcoming = SCHEDULE_WITH_TIMES.filter(m => now < m.startTime);
  if (upcoming.length > 0) return upcoming[0].id;
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
  const b = String(ball);
  const map = {
    "4":  { bg:"rgba(29,78,216,0.7)",  border:"#3b82f6", color:"#93c5fd",  label:"4" },
    "6":  { bg:"rgba(109,40,217,0.7)", border:"#8b5cf6", color:"#c4b5fd",  label:"6" },
    "W":  { bg:"rgba(153,27,27,0.8)",  border:"#ef4444", color:"#fca5a5",  label:"W" },
    "w":  { bg:"rgba(153,27,27,0.8)",  border:"#ef4444", color:"#fca5a5",  label:"W" },
    "Wd": { bg:"rgba(68,64,60,0.7)",   border:"#78716c", color:"#d6d3d1",  label:"Wd" },
    "WD": { bg:"rgba(68,64,60,0.7)",   border:"#78716c", color:"#d6d3d1",  label:"Wd" },
    "Nb": { bg:"rgba(113,63,18,0.7)",  border:"#f59e0b", color:"#fde68a",  label:"NB" },
    "NB": { bg:"rgba(113,63,18,0.7)",  border:"#f59e0b", color:"#fde68a",  label:"NB" },
  };
  const s = map[b] || { bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.7)", label:b||"·" };
  return (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[13px] font-bold"
      style={{ background:s.bg, border:`1.5px solid ${s.border}`, color:s.color }}>
      {s.label}
    </span>
  );
}

// ─── BATTING TABLE ────────────────────────────────────────────────────────────
// Key mapping from actual API innings response:
// Batsmen[]: BatterName, Runs, Balls, Fours, Sixes, StrikeRate, OutDesc, OnStrike, IsOnCrease
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
            // Try all known key variants from the IPL feed
            const name  = b.BatterName  || b.PlayerName || b.Name || "";
            const runs  = b.Runs        ?? b.RunsScored  ?? 0;
            const balls = b.Balls       ?? b.BallsFaced  ?? 0;
            const fours = b.Fours       ?? b.FoursScored ?? 0;
            const sixes = b.Sixes       ?? b.SixesScored ?? 0;
            const sr    = b.StrikeRate  ?? (balls ? (runs / balls * 100).toFixed(1) : "0.0");
            const outDesc = b.OutDesc   || b.DismissalType || b.HowOut || "";
            // OnStrike: "1" or true = striker; IsOnCrease = still batting
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
// Bowlers[]: BowlerName, Overs, Maidens, Runs, Wickets, Economy, CurrentBowler
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

// ─── POINTS TABLE ─────────────────────────────────────────────────────────────
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
    <div className="flex justify-center py-8">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor:"rgba(245,166,35,0.2)", borderTopColor:"#f5a623" }} />
    </div>
  );

  if (error) return (
    <div className="text-center py-8">
      <p className="text-red-400 text-xs">{error}</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={13} className="text-amber-400" />
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Points Table</span>
      </div>
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-3 py-2 border-b"
          style={{ borderColor:"rgba(255,255,255,0.06)" }}>
          {["Team","M","W","L","Pts","NRR"].map(h => (
            <span key={h} className="text-[9px] font-black text-gray-600 uppercase tracking-wider text-right first:text-left">{h}</span>
          ))}
        </div>
        {points.map((p, i) => {
          // API keys from backend: TeamName, Matches/MatchesPlayed, Wins, Losses, Points, NetRunRate
          const teamName = p.TeamName || p.Team || p.TeamFullName || "";
          const code     = nameToCode(teamName);
          const team     = getTeam(code);
          const m   = p.Matches      || p.MatchesPlayed  || p.P  || 0;
          const w   = p.Wins         || p.Won            || p.W  || 0;
          const l   = p.Losses       || p.Lost           || p.L  || 0;
          const pts = p.Points       || p.Pts            || 0;
          const nrr = p.NetRunRate   || p.NRR            || "0.000";
          const qual = i < 4; // top 4 qualify

          return (
            <div key={i}
              className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-3 py-2.5 border-b items-center transition-all hover:bg-white/3"
              style={{ borderColor:"rgba(255,255,255,0.04)", background: qual && i === 0 ? `${team.primary}10` : "transparent" }}>
              {/* Team */}
              <div className="flex items-center gap-2">
                {qual && (
                  <span className="text-[8px] font-black rounded px-1"
                    style={{ background:`${team.primary}30`, color:team.accent }}>
                    {i + 1}
                  </span>
                )}
                {!qual && (
                  <span className="text-[8px] font-black text-gray-700">{i + 1}</span>
                )}
                <img src={team.logo} alt={code} className="w-5 h-5 object-contain"
                  onError={e => { e.target.style.display="none"; }} />
                <span className="text-[11px] font-black text-white">{code}</span>
                {qual && <span className="text-[7px] font-black text-green-400 hidden sm:inline">Q</span>}
              </div>
              <span className="text-[11px] text-gray-500 text-right">{m}</span>
              <span className="text-[11px] text-green-400 font-bold text-right">{w}</span>
              <span className="text-[11px] text-red-400 font-bold text-right">{l}</span>
              <span className="text-[12px] font-black text-white text-right">{pts}</span>
              <span className="text-[10px] text-gray-600 text-right font-mono">
                {parseFloat(nrr) >= 0 ? "+" : ""}{parseFloat(nrr).toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[8px] text-gray-700 text-center">Q = Qualified for playoffs · Top 4 advance</p>
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

// ─── SCORECARD ────────────────────────────────────────────────────────────────
function IPLScorecard({ matchId, matchInfo }) {
  const [ms, setMs]               = useState(null);
  const [allInnings, setAllInnings] = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("batting");
  const [viewInnings, setViewInnings] = useState("1");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(POLL_MS / 1000);

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
      if (!json.ok) throw new Error(json.error || "Unknown error");

      const { summary, innings: inn, currentInnings } = json.data;
      let msData = summary?.MatchSummary || {};
      if (Array.isArray(msData)) msData = msData[0] || {};
      const parsed = typeof msData === "object" ? msData : {};

      msRef.current = parsed;
      setMs(parsed);

      if (inn) {
        setAllInnings(prev => ({ ...prev, [currentInnings]: inn }));
        setViewInnings(currentInnings);
      }

      setLastUpdate(new Date());
      setCountdown(POLL_MS / 1000);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, matchId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (String(msRef.current?.IsMatchEnd ?? "0") === "0") load(true);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!lastUpdate) return;
    setCountdown(POLL_MS / 1000);
    const tick = setInterval(() => setCountdown(p => p <= 1 ? POLL_MS / 1000 : p - 1), 1000);
    return () => clearInterval(tick);
  }, [lastUpdate]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor:"rgba(245,166,35,0.2)", borderTopColor:"#f5a623" }} />
      <p className="text-[11px] text-gray-600 uppercase tracking-widest font-black">Loading match {matchId}…</p>
    </div>
  );

  if (error || !ms) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
      <AlertCircle size={28} className="text-red-500/60" />
      <p className="text-sm text-red-400">Could not load match data</p>
      <p className="text-[11px] text-gray-700 max-w-xs">{error}</p>
      <button onClick={() => load()}
        className="mt-2 px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-colors">
        Retry
      </button>
    </div>
  );

  // ── Derive team codes from API keys ──────────────────────────────
  const isLive = String(ms.IsMatchEnd ?? 0) === "0";
  const curInn = String(ms.CurrentInnings || "1");

  // Use HomeTeamCode / AwayTeamCode directly (confirmed in API response)
  const homeCode = ms.HomeTeamCode || nameToCode(ms.HomeTeamName || "");
  const awayCode = ms.AwayTeamCode || nameToCode(ms.AwayTeamName || "");

  // Innings 1 = FirstBattingTeam, Innings 2 = SecondBattingTeam
  const inn1Code = nameToCode(ms.FirstBattingTeam  || "") || awayCode;
  const inn2Code = nameToCode(ms.SecondBattingTeam || "") || homeCode;

  const inn1Team = getTeam(inn1Code);
  const inn2Team = getTeam(inn2Code);

  // Scores — keys confirmed: 1FallScore, 1FallWickets, 1FallOvers, 1RunRate etc.
  const s1 = ms["1FallScore"]   ?? ""; const w1 = ms["1FallWickets"] ?? "0"; const o1 = ms["1FallOvers"] ?? "";
  const s2 = ms["2FallScore"]   ?? ""; const w2 = ms["2FallWickets"] ?? "0"; const o2 = ms["2FallOvers"] ?? "";
  const crr    = curInn === "1" ? (ms["1RunRate"] || "") : (ms["2RunRate"] || "");
  const rrr    = curInn === "2" ? (ms.RequiredRunRate || "") : "";
  const target = curInn === "2" ? (ms.Target || "") : "";
  const proj1  = ms.ProjectedScore       || "";
  const proj2  = ms["2ndProjectedScore"] || "";
  const proj3  = ms["3rdProjectedScore"] || "";
  const remaining = ms.RemainingBalls    || "";

  // ── Innings data ─────────────────────────────────────────────────
  const currentInnData = allInnings[viewInnings] || null;

  // Key variants: innings object may have Batsmen or BatsmanDetails etc.
  const balls   = safeList(currentInnData, "BallsInCurrentOver");
  const batsmen = safeList(currentInnData, "Batsmen").length
    ? safeList(currentInnData, "Batsmen")
    : safeList(currentInnData, "BatsmanDetails");
  const bowlers = safeList(currentInnData, "Bowlers").length
    ? safeList(currentInnData, "Bowlers")
    : safeList(currentInnData, "BowlerDetails");
  const fow   = safeList(currentInnData, "FallOfWickets").length
    ? safeList(currentInnData, "FallOfWickets")
    : safeList(currentInnData, "Wickets");
  const comms = safeList(currentInnData, "Commentary");

  // On-pitch info from summary (confirmed keys)
  const striker    = ms.CurrentStrikerName    || "";
  const nonStriker = ms.CurrentNonStrikerName || "";
  const bowlerName = ms.CurrentBowlerName     || "";

  const viewInnCode  = viewInnings === "1" ? inn1Code : inn2Code;
  const viewBowlCode = viewInnings === "1" ? inn2Code : inn1Code;
  const availableInnings = Object.keys(allInnings).sort();
  const tabs = ["batting", "bowling", "commentary"];

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-amber-400" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">
            Match {matchInfo?.num || ""} · Scorecard
          </span>
          {isLive && (
            <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-[9px] text-gray-700 font-bold">
              <Clock size={9} />
              <span>{lastUpdate.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</span>
              {isLive && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-black"
                  style={{ background:"rgba(245,166,35,0.12)", color:"#f5a623" }}>
                  {countdown}s
                </span>
              )}
            </div>
          )}
          <button onClick={() => load()} disabled={refreshing}
            className="flex items-center gap-1 text-[10px] font-black text-gray-600 hover:text-amber-400 transition-colors disabled:opacity-40">
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Match scoreboard */}
      <div className="rounded-2xl overflow-hidden border"
        style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>

        <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-gray-600 truncate">{ms.GroundName || matchInfo?.venue || ""}</p>
          {ms.TossDetails && <p className="text-[10px] text-gray-700 mt-0.5">🪙 {ms.TossDetails}</p>}
        </div>

        <div className="p-3 space-y-2">
          {[
            { team:inn1Team, code:inn1Code, s:s1, w:w1, o:o1, isBatting:curInn==="1"&&isLive, proj:curInn==="1"&&isLive?proj1:"", inn:"1st Inn" },
            { team:inn2Team, code:inn2Code, s:s2, w:w2, o:o2, isBatting:curInn==="2"&&isLive, proj:curInn==="2"&&isLive?proj1:"", inn:"2nd Inn", yet:!s2 },
          ].map(({ team, code, s, w, o, isBatting, proj, inn, yet }) => (
            <div key={code}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all"
              style={{ background:isBatting?`${team.primary}12`:"rgba(255,255,255,0.02)", borderColor:isBatting?`${team.primary}40`:"rgba(255,255,255,0.05)" }}>
              <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border"
                style={{ background:`${team.primary}20`, borderColor:`${team.primary}30` }}>
                <img src={team.logo} alt={code} className="w-9 h-9 object-contain"
                  onError={e => { e.target.style.display="none"; }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-white uppercase tracking-tight">{code}</span>
                  <span className="text-[8px] text-gray-700 font-bold">{inn}</span>
                  {isBatting && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{ background:`${team.accent}25`, color:team.accent }}>Batting</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 truncate block">{team.name}</span>
              </div>
              <div className="text-right shrink-0">
                {yet ? (
                  <span className="text-[11px] text-gray-700">Yet to bat</span>
                ) : (
                  <>
                    <span className="text-xl font-black text-white" style={{ fontVariantNumeric:"tabular-nums" }}>
                      {s}/{w}
                    </span>
                    {o && <span className="text-[10px] text-gray-600 ml-1">({o} ov)</span>}
                    {proj && <div className="text-[9px] font-bold mt-0.5" style={{ color:"#f5a623" }}>Proj: {proj}</div>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        {(crr || rrr || target || remaining || (proj1 && curInn==="1")) && (
          <div className="px-4 py-2.5 border-t flex gap-4 flex-wrap items-center"
            style={{ borderColor:"rgba(255,255,255,0.05)" }}>
            {crr && parseFloat(crr) > 0 && (
              <div><span className="text-[9px] text-gray-700 uppercase tracking-wider block">CRR</span>
                <span className="text-sm font-black text-green-400">{parseFloat(crr).toFixed(2)}</span></div>
            )}
            {rrr && parseFloat(rrr) > 0 && (
              <div><span className="text-[9px] text-gray-700 uppercase tracking-wider block">RRR</span>
                <span className="text-sm font-black text-amber-400">{parseFloat(rrr).toFixed(2)}</span></div>
            )}
            {target && (
              <div><span className="text-[9px] text-gray-700 uppercase tracking-wider block">Target</span>
                <span className="text-sm font-black text-white">{target}</span></div>
            )}
            {remaining && curInn==="2" && (
              <div><span className="text-[9px] text-gray-700 uppercase tracking-wider block">Balls Left</span>
                <span className="text-sm font-black text-white">{remaining}</span></div>
            )}
            {proj1 && curInn==="1" && isLive && (
              <div className="ml-auto flex gap-3">
                {[[proj1,"C"],[proj2,"M"],[proj3,"A"]].filter(([v])=>v).map(([val,label]) => (
                  <div key={label} className="text-right">
                    <span className="text-[8px] text-gray-700 uppercase tracking-wider block">{label}</span>
                    <span className="text-sm font-black" style={{ color:"#f5a623" }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {ms.Comments && (
          <div className="px-4 py-2 border-t text-[11px] text-gray-400 font-medium"
            style={{ borderColor:"rgba(255,255,255,0.05)" }}>{ms.Comments}</div>
        )}
      </div>

      {/* Current over */}
      {balls.length > 0 && viewInnings === curInn && (
        <div className="rounded-2xl border px-4 py-3"
          style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">This Over</p>
          <div className="flex gap-2 flex-wrap">
            {balls.map((b,i) => <BallChip key={i} ball={b} />)}
          </div>
        </div>
      )}

      {/* On-pitch trio */}
      {viewInnings === curInn && (striker || bowlerName) && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label:"Striker",     name:striker,    runs:ms.StrikerRuns,    balls:ms.StrikerBalls,    sr:ms.StrikerSR,    color:"#f5a623" },
            { label:"Non-striker", name:nonStriker, runs:ms.NonStrikerRuns, balls:ms.NonStrikerBalls, sr:ms.NonStrikerSR, color:"rgba(255,255,255,0.5)" },
            { label:"Bowler",      name:bowlerName, runs:ms.BowlerWickets!=null?`${ms.BowlerWickets}/${ms.BowlerRuns}`:ms.BowlerRuns, balls:ms.BowlerOvers, sr:ms.BowlerEconomy, color:"#60a5fa", isBowler:true },
          ].map(({ label, name, runs, balls:b, sr, color, isBowler }) => name ? (
            <div key={label} className="rounded-xl border px-3 py-2.5"
              style={{ borderColor:`${color}22`, background:`${color}06` }}>
              <span className="text-[8px] font-black uppercase tracking-widest block mb-1" style={{ color }}>{label}</span>
              <span className="text-[11px] font-semibold text-white block leading-tight truncate">{name}</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-black" style={{ color }}>{runs??"-"}</span>
                <span className="text-[9px] text-gray-600">({b??"-"})</span>
              </div>
              <span className="text-[9px] text-gray-700">{isBowler?"Eco":"SR"}: {sr?parseFloat(sr).toFixed(1):"-"}</span>
            </div>
          ) : null)}
        </div>
      )}

      {/* Innings selector */}
      {availableInnings.length > 1 && (
        <div className="flex gap-2">
          {availableInnings.map(inn => (
            <button key={inn} onClick={() => setViewInnings(inn)}
              className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
              style={{
                background: viewInnings===inn?"rgba(245,166,35,0.15)":"rgba(255,255,255,0.04)",
                color: viewInnings===inn?"#f5a623":"#6b7280",
                border: `1px solid ${viewInnings===inn?"rgba(245,166,35,0.3)":"rgba(255,255,255,0.06)"}`,
              }}>
              {inn==="1"?`${inn1Code} Inn 1`:`${inn2Code} Inn 2`}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
        <div className="flex border-b" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2"
              style={{ color:activeTab===t?"#f5a623":"#4b5563", borderBottomColor:activeTab===t?"#f5a623":"transparent", background:"transparent" }}>
              {t==="batting"?`${viewInnCode} Bat`:t==="bowling"?`${viewBowlCode} Bowl`:"Commentary"}
            </button>
          ))}
        </div>

        {activeTab==="batting"    && <><BattingTable batsmen={batsmen} ms={ms} /><FallOfWickets fow={fow} /></>}
        {activeTab==="bowling"    && <BowlingTable bowlers={bowlers} ms={ms} />}
        {activeTab==="commentary" && (
          <div className="divide-y" style={{ borderColor:"rgba(255,255,255,0.04)" }}>
            {comms.length ? comms.slice(0,15).map((c,i) => {
              const text = c.Commentary||c.Text||"";
              const over = c.OverNumber||c.OverNum||"";
              const isBig = /SIX|FOUR|six|four/.test(text);
              const isWkt = /WICKET|OUT|caught|bowled|lbw/i.test(text);
              const dotColor = isWkt?"#ef4444":isBig?"#f5a623":"rgba(255,255,255,0.15)";
              return (
                <div key={i} className="flex gap-3 px-4 py-2.5"
                  style={{ background:i===0?"rgba(255,255,255,0.03)":"transparent" }}>
                  <div className="flex items-start gap-1.5 pt-1.5 shrink-0 w-10">
                    <div className="w-1.5 h-1.5 rounded-full mt-0.5 shrink-0" style={{ background:dotColor }} />
                    <span className="text-[9px] text-gray-700 font-bold leading-none">{over}</span>
                  </div>
                  <p className="text-[12px] text-gray-400 leading-relaxed flex-1">{text}</p>
                </div>
              );
            }) : <p className="text-center text-gray-700 text-xs py-8">No commentary yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LiveCricketTV() {
  const [active, setActive]             = useState(CHANNELS[0]);
  const [switching, setSwitching]       = useState(false);
  const [activeMatchId, setActiveMatchId] = useState(() => getActiveMatchId());
  // "scorecard" | "schedule" | "points"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="flex gap-2">
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
                {rightPanel === "schedule" ? "Schedule" : rightPanel === "points" ? "Points Table" : "Match Center"}
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Panel tabs */}
            <div className="flex gap-2 mb-4">
              {[
                { key:"scorecard", label:"Scorecard" },
                { key:"schedule",  label:"Schedule" },
                { key:"points",    label:"Points" },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setRightPanel(key)}
                  className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border"
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
            {rightPanel === "points" && <PointsTable />}
            {rightPanel === "scorecard" && (
              <IPLScorecard matchId={activeMatchId} matchInfo={activeMatchInfo} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}