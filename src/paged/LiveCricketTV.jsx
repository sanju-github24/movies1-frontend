import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Tv2, Signal, Volume2, Maximize2, AlertCircle,
  RefreshCw, Activity, Zap, ChevronRight, Clock
} from "lucide-react";

// ─── CHANNELS ──────────────────────────────────────────────────────────────
const CHANNELS = [
  {
    id: "star-english",
    name: "Star Sports",
    sub: "English",
    badge: "LIVE",
    color: "#00a8e1",
    glow: "rgba(0,168,225,0.3)",
    border: "rgba(0,168,225,0.25)",
    bg: "rgba(0,168,225,0.06)",
    tag: "ENGLISH",
    useIcon: false,
    logo: "/Star_Sports_1.png",
    url: "https://allrounder-live5.pages.dev/star/star-1",
    desc: "Star Sports 1 — Live cricket in English commentary",
  },
  {
    id: "star-hindi",
    name: "Star Sports",
    sub: "Hindi",
    badge: "LIVE",
    color: "#f97316",
    glow: "rgba(249,115,22,0.3)",
    border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)",
    tag: "HINDI",
    useIcon: false,
    logo: "/Star_Sports_Hindi.png",
    url: "https://allrounder-live5.pages.dev/star/star-1-hindi",
    desc: "Star Sports Hindi — Live cricket in Hindi commentary",
  },
];

// ─── IPL TEAM CONFIG ────────────────────────────────────────────────────────
const MATCH_ID = 2484;

const TEAM_META = {
  MI:   { primary: "#004f9f", accent: "#f7c400", name: "Mumbai Indians",             logo: "https://scores.iplt20.com/ipl/teamlogos/MI.png" },
  CSK:  { primary: "#f7c400", accent: "#004f9f", name: "Chennai Super Kings",         logo: "https://scores.iplt20.com/ipl/teamlogos/CSK.png" },
  RCB:  { primary: "#c8102e", accent: "#f5c518", name: "Royal Challengers Bengaluru", logo: "https://scores.iplt20.com/ipl/teamlogos/RCB.png" },
  KKR:  { primary: "#2d0052", accent: "#f5c518", name: "Kolkata Knight Riders",       logo: "https://scores.iplt20.com/ipl/teamlogos/KKR.png" },
  DC:   { primary: "#00008b", accent: "#ef4444", name: "Delhi Capitals",              logo: "https://scores.iplt20.com/ipl/teamlogos/DC.png" },
  PBKS: { primary: "#ed1c24", accent: "#c8a96e", name: "Punjab Kings",                logo: "https://scores.iplt20.com/ipl/teamlogos/PBKS.png" },
  RR:   { primary: "#2d4ea2", accent: "#ea1779", name: "Rajasthan Royals",            logo: "https://scores.iplt20.com/ipl/teamlogos/RR.png" },
  SRH:  { primary: "#f7622a", accent: "#000000", name: "Sunrisers Hyderabad",         logo: "https://scores.iplt20.com/ipl/teamlogos/SRH.png" },
  GT:   { primary: "#1b2133", accent: "#b8902a", name: "Gujarat Titans",              logo: "https://scores.iplt20.com/ipl/teamlogos/GT.png" },
  LSG:  { primary: "#00b2e3", accent: "#a4c639", name: "Lucknow Super Giants",        logo: "https://scores.iplt20.com/ipl/teamlogos/LSG.png" },
};

function getTeam(code) {
  return TEAM_META[code] || { primary: "#444", accent: "#aaa", name: code, logo: "" };
}

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";

function getMS(raw) {
  if (!raw) return {};
  let ms = raw.MatchSummary || {};
  if (Array.isArray(ms)) ms = ms[0] || {};
  return typeof ms === "object" ? ms : {};
}

function safeList(d, key) {
  const v = (d || {})[key] || [];
  return Array.isArray(v) ? v : [];
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────
function PulsingDot({ color }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: color }} />
    </span>
  );
}

function ChannelLogo({ ch, active }) {
  if (ch.useIcon) return <Tv2 size={22} style={{ color: active ? ch.color : "#4b5563" }} />;
  return (
    <img
      src={ch.logo}
      alt={`${ch.name} ${ch.sub}`}
      className="w-8 h-8 object-contain"
      style={{ filter: active ? "none" : "grayscale(100%) brightness(0.4)" }}
    />
  );
}

function ChannelCard({ ch, active, onClick }) {
  return (
    <button
      onClick={() => onClick(ch)}
      className="relative w-full text-left rounded-2xl border transition-all duration-300 active:scale-[0.98] overflow-hidden"
      style={{
        background: active ? ch.bg : "rgba(255,255,255,0.02)",
        borderColor: active ? ch.border : "rgba(255,255,255,0.06)",
        boxShadow: active ? `0 0 30px ${ch.glow}` : "none",
      }}
    >
      {active && (
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${ch.color}44 0%, transparent 60%)` }}
        />
      )}
      <div className="relative p-4 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300"
          style={{
            background: active ? `${ch.color}15` : "rgba(255,255,255,0.04)",
            borderColor: active ? ch.border : "rgba(255,255,255,0.06)",
          }}
        >
          <ChannelLogo ch={ch} active={active} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded"
              style={{ background: `${ch.color}20`, color: ch.color }}
            >
              {ch.tag}
            </span>
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
        <div
          className="shrink-0 w-2 h-8 rounded-full transition-all duration-300"
          style={{ background: active ? ch.color : "transparent" }}
        />
      </div>
    </button>
  );
}

// ─── BALL CHIP ───────────────────────────────────────────────────────────────
function BallChip({ ball }) {
  const b = String(ball);
  const map = {
    "4":  { bg: "rgba(29,78,216,0.7)",  border: "#3b82f6", color: "#93c5fd", label: "4" },
    "6":  { bg: "rgba(109,40,217,0.7)", border: "#8b5cf6", color: "#c4b5fd", label: "6" },
    "W":  { bg: "rgba(153,27,27,0.8)",  border: "#ef4444", color: "#fca5a5", label: "W" },
    "w":  { bg: "rgba(153,27,27,0.8)",  border: "#ef4444", color: "#fca5a5", label: "W" },
    "Wd": { bg: "rgba(68,64,60,0.7)",   border: "#78716c", color: "#d6d3d1", label: "Wd" },
    "WD": { bg: "rgba(68,64,60,0.7)",   border: "#78716c", color: "#d6d3d1", label: "Wd" },
    "Nb": { bg: "rgba(113,63,18,0.7)",  border: "#f59e0b", color: "#fde68a", label: "NB" },
    "NB": { bg: "rgba(113,63,18,0.7)",  border: "#f59e0b", color: "#fde68a", label: "NB" },
  };
  const s = map[b] || { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", label: b || "·" };
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[13px] font-bold"
      style={{ background: s.bg, border: `1.5px solid ${s.border}`, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── SCORECARD ───────────────────────────────────────────────────────────────
function IPLScorecard() {
  const [ms, setMs]               = useState(null);
  const [innings, setInnings]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("batting");
  const [lastUpdate, setLastUpdate] = useState(null);   // Date object of last fetch
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown]   = useState(30);     // seconds until next auto-refresh

  // ── fetch ─────────────────────────────────────────────────────────────────
  const msRef = useRef(null); // ← add this ref

const load = useCallback(async (silent = false) => {
  if (!silent) setLoading(true);
  setRefreshing(true);
  try {
    const res  = await fetch(`${API_BASE}/api/match/${MATCH_ID}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Unknown error");

    const { summary, innings: inn } = json.data;
    let msData = summary?.MatchSummary || {};
    if (Array.isArray(msData)) msData = msData[0] || {};
    const parsed = typeof msData === "object" ? msData : {};

    msRef.current = parsed;   // ← always keep ref in sync
    setMs(parsed);
    setInnings(inn);
    setLastUpdate(new Date());
    setCountdown(30);
    setError(null);
  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []); // ← keep empty deps, use ref instead
  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => { load(); }, [load]);

  // ── 30-second auto-refresh (only while match is live) ────────────────────
  // ── 30s auto-refresh using ref so it always sees latest ms ──
useEffect(() => {
  const interval = setInterval(() => {
    const isLive = String(msRef.current?.IsMatchEnd ?? "0") === "0";
    if (isLive) load(true);
  }, 30_000);
  return () => clearInterval(interval);
}, [load]); // ← no ms dependency needed, ref handles it

  // ── countdown ticker (ticks every second, resets when lastUpdate changes) ─
  useEffect(() => {
    if (!lastUpdate) return;
    setCountdown(30);

    const tick = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1_000);

    return () => clearInterval(tick);
  }, [lastUpdate]);

  // ── loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "rgba(245,166,35,0.2)", borderTopColor: "#f5a623" }}
        />
        <p className="text-[11px] text-gray-600 uppercase tracking-widest font-black">Fetching live data…</p>
      </div>
    );
  }

  if (error || !ms) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
        <AlertCircle size={28} className="text-red-500/60" />
        <p className="text-sm text-red-400">Could not load live data</p>
        <p className="text-[11px] text-gray-700 max-w-xs">Check your backend connection or network.</p>
        <button
          onClick={() => load()}
          className="mt-2 px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── derived values ────────────────────────────────────────────────────────
  const isLive     = String(ms.IsMatchEnd || 0) === "0";
  const curInn     = String(ms.CurrentInnings || "1");
  const homeCode   = ms.HomeTeamCode || "CSK";
  const awayCode   = ms.AwayTeamCode || "MI";
  const team1      = getTeam(awayCode);
  const team2      = getTeam(homeCode);

  const s1 = ms["1FallScore"]   || ""; const w1 = ms["1FallWickets"] || "0"; const o1 = ms["1FallOvers"] || "";
  const s2 = ms["2FallScore"]   || ""; const w2 = ms["2FallWickets"] || "0"; const o2 = ms["2FallOvers"] || "";
  const proj   = ms.ProjectedScore   || "";
  const crr    = ms["1RunRate"]      || "";
  const rrr    = ms.RequiredRunRate  || "";
  const target = ms.Target           || "";

  const balls   = safeList(innings, "BallsInCurrentOver");
  const batsmen = safeList(innings, "Batsmen").length
    ? safeList(innings, "Batsmen")
    : safeList({ Batsmen: ms.Batsmen }, "Batsmen");
  const bowlers = safeList(innings, "Bowlers").length
    ? safeList(innings, "Bowlers")
    : safeList({ Bowlers: ms.Bowlers }, "Bowlers");
  const comms = safeList(innings, "Commentary");

  const striker    = ms.CurrentStrikerName    || "";
  const nonStriker = ms.CurrentNonStrikerName || "";
  const bowlerName = ms.CurrentBowlerName     || "";

  function fmtScore(runs, wkts, overs) {
    if (runs === "" || runs === null || runs === undefined) return null;
    return { runs, wkts: wkts || "0", overs };
  }

  const tabs = ["batting", "bowling", "commentary"];

  return (
    <div className="space-y-3">

      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-amber-400" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Live Scorecard</span>
          {isLive && (
            <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>

        {/* ── Refresh button + last-updated + countdown ── */}
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-[9px] text-gray-700 font-bold">
              <Clock size={9} />
              <span>{lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              {isLive && (
                <span
                  className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-black"
                  style={{ background: "rgba(245,166,35,0.12)", color: "#f5a623" }}
                >
                  {countdown}s
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => load()}
            disabled={refreshing}
            className="flex items-center gap-1 text-[10px] font-black text-gray-600 hover:text-amber-400 uppercase tracking-wider transition-colors disabled:opacity-40"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Match card ── */}
      <div
        className="rounded-2xl overflow-hidden border"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
      >
        {/* venue + toss */}
        <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-gray-600 truncate">{ms.GroundName || ""}</p>
          {ms.TossDetails && (
            <p className="text-[10px] text-gray-700 mt-0.5">🪙 {ms.TossDetails}</p>
          )}
        </div>

        {/* Teams */}
        <div className="p-3 space-y-2">
          {[
            { team: team1, code: awayCode, score: fmtScore(s1, w1, o1), batting: curInn === "1", proj: curInn === "1" ? proj : "" },
            { team: team2, code: homeCode, score: fmtScore(s2, w2, o2), batting: curInn === "2", proj: curInn === "2" ? proj : "" },
          ].map(({ team, code, score, batting, proj: p }) => (
            <div
              key={code}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all"
              style={{
                background: batting ? `${team.primary}12` : "rgba(255,255,255,0.02)",
                borderColor: batting ? `${team.primary}40` : "rgba(255,255,255,0.05)",
              }}
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border"
                style={{ background: `${team.primary}20`, borderColor: `${team.primary}30` }}
              >
                <img
                  src={team.logo}
                  alt={code}
                  className="w-9 h-9 object-contain"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white uppercase tracking-tight">{code}</span>
                  {batting && (
                    <span
                      className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{ background: `${team.accent}25`, color: team.accent }}
                    >
                      Batting
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 truncate block">{team.name}</span>
              </div>
              <div className="text-right shrink-0">
                {score ? (
                  <>
                    <span className="text-xl font-black text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {score.runs}/{score.wkts}
                    </span>
                    <span className="text-[10px] text-gray-600 ml-1">({score.overs} ov)</span>
                    {p && (
                      <div className="text-[9px] font-bold mt-0.5" style={{ color: "#f5a623" }}>
                        Proj: {p}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[11px] text-gray-700">Yet to bat</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Rate bar */}
        {(crr || (rrr && rrr !== "0.00") || target) && (
          <div
            className="px-4 py-2 border-t flex gap-4 flex-wrap"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            {crr && (
              <div>
                <span className="text-[9px] text-gray-700 uppercase tracking-wider block">CRR</span>
                <span className="text-sm font-black text-green-400">{parseFloat(crr).toFixed(2)}</span>
              </div>
            )}
            {rrr && rrr !== "0.00" && (
              <div>
                <span className="text-[9px] text-gray-700 uppercase tracking-wider block">RRR</span>
                <span className="text-sm font-black text-amber-400">{parseFloat(rrr).toFixed(2)}</span>
              </div>
            )}
            {target && (
              <div>
                <span className="text-[9px] text-gray-700 uppercase tracking-wider block">Target</span>
                <span className="text-sm font-black text-white">{target}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Current over ── */}
      {balls.length > 0 && (
        <div
          className="rounded-2xl border px-4 py-3"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">This Over</p>
          <div className="flex gap-2 flex-wrap">
            {balls.map((b, i) => <BallChip key={i} ball={b} />)}
          </div>
        </div>
      )}

      {/* ── On-pitch trio ── */}
      {(striker || bowlerName) && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Striker",     name: striker,    runs: ms.StrikerRuns,    balls: ms.StrikerBalls,    sr: ms.StrikerSR,    color: "#f5a623" },
            { label: "Non-striker", name: nonStriker, runs: ms.NonStrikerRuns, balls: ms.NonStrikerBalls, sr: ms.NonStrikerSR, color: "rgba(255,255,255,0.5)" },
            { label: "Bowler",      name: bowlerName, runs: ms.BowlerWickets ? `${ms.BowlerWickets}/${ms.BowlerRuns}` : ms.BowlerRuns, balls: ms.BowlerOvers, sr: ms.BowlerEconomy, color: "#60a5fa", isBowler: true },
          ].map(({ label, name, runs, balls: b, sr, color, isBowler }) => name ? (
            <div
              key={label}
              className="rounded-xl border px-3 py-2.5"
              style={{ borderColor: `${color}22`, background: `${color}06` }}
            >
              <span className="text-[8px] font-black uppercase tracking-widest block mb-1" style={{ color }}>{label}</span>
              <span className="text-[11px] font-semibold text-white block leading-tight truncate">{name}</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-black" style={{ color }}>{runs ?? "-"}</span>
                <span className="text-[9px] text-gray-600">({b ?? "-"})</span>
              </div>
              <span className="text-[9px] text-gray-700">{isBowler ? "Eco" : "SR"}: {sr ? parseFloat(sr).toFixed(1) : "-"}</span>
            </div>
          ) : null)}
        </div>
      )}

      {/* ── Tabs ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
      >
        <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2"
              style={{
                color: activeTab === t ? "#f5a623" : "#4b5563",
                borderBottomColor: activeTab === t ? "#f5a623" : "transparent",
                background: "transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* batting */}
        {activeTab === "batting" && (
          <div className="overflow-x-auto">
            {batsmen.length ? (
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Batter", "Status", "R", "B", "4s", "6s", "SR"].map((h, i) => (
                      <th key={h} className={`py-2 font-black text-gray-600 uppercase tracking-wider text-[9px] ${i === 0 ? "pl-4 text-left" : i <= 1 ? "text-left px-2" : "text-right px-2"} ${i === 6 ? "pr-4" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batsmen.map((b, idx) => {
                    const r     = b.RunsScored  ?? 0;
                    const bf    = b.BallsFaced  ?? 0;
                    const fours = b.FoursScored ?? 0;
                    const sixes = b.SixesScored ?? 0;
                    const sr    = bf ? (r / bf * 100).toFixed(1) : "0.0";
                    const bat   = b.IsBatting;
                    const dism  = b.DismissalType || (bat ? "batting" : "not out");
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className="pl-4 pr-2 py-2.5">
                          <span style={{ color: bat ? "#f5a623" : "rgba(255,255,255,0.7)" }} className="font-semibold">
                            {b.PlayerName || ""}
                          </span>
                          {bat && (
                            <span className="ml-1.5 text-[7px] bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded px-1 py-0.5 font-black uppercase tracking-wider">★</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-gray-700 text-[10px]">{dism}</td>
                        <td className="px-2 py-2.5 text-right font-black text-white text-sm">{r}</td>
                        <td className="px-2 py-2.5 text-right text-gray-500">{bf}</td>
                        <td className="px-2 py-2.5 text-right text-blue-400 font-semibold">{fours}</td>
                        <td className="px-2 py-2.5 text-right text-violet-400 font-semibold">{sixes}</td>
                        <td className="pr-4 pl-2 py-2.5 text-right text-gray-600">{sr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-700 text-xs py-8">No batting data yet</p>
            )}
          </div>
        )}

        {/* bowling */}
        {activeTab === "bowling" && (
          <div className="overflow-x-auto">
            {bowlers.length ? (
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Bowler", "O", "M", "R", "W", "Eco"].map((h, i) => (
                      <th key={h} className={`py-2 font-black text-gray-600 uppercase tracking-wider text-[9px] ${i === 0 ? "pl-4 text-left" : "text-right px-2"} ${i === 5 ? "pr-4" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bowlers.map((b, idx) => {
                    const ov  = b.OversBowled  ?? 0;
                    const run = b.RunsGiven    ?? 0;
                    const wk  = b.WicketsTaken ?? 0;
                    const eco = ov && parseFloat(ov) > 0 ? (run / parseFloat(ov)).toFixed(2) : "-";
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className="pl-4 pr-2 py-2.5 text-white/80 font-medium">{b.PlayerName || ""}</td>
                        <td className="px-2 py-2.5 text-right text-white font-black text-sm">{ov}</td>
                        <td className="px-2 py-2.5 text-right text-gray-600">{b.MaidenOvers ?? 0}</td>
                        <td className="px-2 py-2.5 text-right text-white font-black text-sm">{run}</td>
                        <td className="px-2 py-2.5 text-right font-black" style={{ color: wk > 0 ? "#4ade80" : "rgba(255,255,255,0.5)" }}>{wk}</td>
                        <td className="pr-4 pl-2 py-2.5 text-right text-gray-600">{eco}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-700 text-xs py-8">No bowling data yet</p>
            )}
          </div>
        )}

        {/* commentary */}
        {activeTab === "commentary" && (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {comms.length ? comms.slice(0, 10).map((c, i) => {
              const text = c.Commentary || c.Text || "";
              const over = c.OverNumber || c.OverNum || "";
              const isBig = /SIX|FOUR|six|four/.test(text);
              const isWkt = /WICKET|OUT|caught|bowled|lbw/i.test(text);
              const dotColor = isWkt ? "#ef4444" : isBig ? "#f5a623" : "rgba(255,255,255,0.15)";
              return (
                <div
                  key={i}
                  className="flex gap-3 px-4 py-2.5"
                  style={{ background: i === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}
                >
                  <div className="flex items-start gap-1.5 pt-1.5 shrink-0 w-10">
                    <div className="w-1.5 h-1.5 rounded-full mt-0.5 shrink-0" style={{ background: dotColor }} />
                    <span className="text-[9px] text-gray-700 font-bold leading-none">{over}</span>
                  </div>
                  <p className="text-[12px] text-gray-400 leading-relaxed flex-1">{text}</p>
                </div>
              );
            }) : (
              <p className="text-center text-gray-700 text-xs py-8">No commentary yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function LiveCricketTV() {
  const [active, setActive] = useState(CHANNELS[0]);
  const [switching, setSwitching] = useState(false);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

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

      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
        style={{ background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${active.glow} 0%, transparent 70%)` }}
      />

      {/* Navbar */}
      <header className="relative z-10 h-16 flex items-center px-4 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/watch" className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft size={18} className="text-gray-400" />
            </Link>
            <Link to="/"><img src="/logo_39.png" className="h-7" alt="logo" /></Link>
          </div>
          <div
            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border transition-all duration-500"
            style={{ color: active.color, borderColor: active.border, background: active.bg }}
          >
            <Signal size={9} />
            Live Cricket
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 pb-24">

        <div className="mb-6">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-1">Live Streaming</p>
          <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">
            Cricket <span style={{ color: active.color }}>Live TV</span>
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── LEFT: Player ── */}
          <div className="flex-1 min-w-0 space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHANNELS.map(ch => (
                <ChannelCard key={ch.id} ch={ch} active={active.id === ch.id} onClick={handleSwitch} />
              ))}
            </div>

            <div
              ref={playerRef}
              className="relative rounded-3xl overflow-hidden border shadow-2xl"
              style={{ borderColor: active.border, boxShadow: `0 0 60px ${active.glow}`, background: "#000" }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b transition-all duration-500"
                style={{ borderColor: active.border, background: `linear-gradient(90deg, ${active.bg}, transparent)` }}
              >
                <div className="flex items-center gap-3">
                  <PulsingDot color={active.color} />
                  <div className="flex items-center gap-2">
                    {active.useIcon
                      ? <Tv2 size={14} style={{ color: active.color }} />
                      : <img src={active.logo} alt="" className="h-4 w-auto object-contain" />
                    }
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: active.color }}>
                      {active.name} {active.sub}
                    </span>
                  </div>
                  <span
                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{ background: `${active.color}20`, color: active.color }}
                  >
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 size={14} className="text-gray-600" />
                  <button onClick={handleFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Fullscreen">
                    <Maximize2 size={14} className="text-gray-500 hover:text-white transition-colors" />
                  </button>
                </div>
              </div>

              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                {switching && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                    <div
                      className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-3"
                      style={{ borderColor: `${active.color}44`, borderTopColor: active.color }}
                    />
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: active.color }}>Switching channel…</p>
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  key={active.id}
                  src={active.url}
                  className="absolute inset-0 w-full h-full border-none"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  scrolling="no"
                  style={{ opacity: switching ? 0 : 1, transition: "opacity 0.35s ease" }}
                />
              </div>

              <div
                className="flex items-center gap-2 px-4 py-2.5 border-t"
                style={{ borderColor: active.border, background: "rgba(0,0,0,0.4)" }}
              >
                <AlertCircle size={11} className="text-gray-700 shrink-0" />
                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-wider">
                  Stream via third-party provider · For best experience use Chrome · Disable ad-blocker if stream doesn't load
                </p>
              </div>
            </div>

            {/* Quick-switch strip */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest shrink-0">Quick Switch</span>
              <div className="flex gap-2">
                {CHANNELS.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => handleSwitch(ch)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    style={{
                      background: active.id === ch.id ? ch.bg : "rgba(255,255,255,0.02)",
                      borderColor: active.id === ch.id ? ch.border : "rgba(255,255,255,0.06)",
                      color: active.id === ch.id ? ch.color : "#4b5563",
                    }}
                  >
                    <PulsingDot color={active.id === ch.id ? ch.color : "#374151"} />
                    {ch.useIcon
                      ? <Tv2 size={11} style={{ color: active.id === ch.id ? ch.color : "#4b5563" }} />
                      : <img src={ch.logo} alt="" className="h-3 w-auto object-contain opacity-80" />
                    }
                    {ch.sub}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Scorecard ── */}
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="lg:hidden flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Match Center</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <IPLScorecard />
          </div>
        </div>
      </div>
    </div>
  );
}