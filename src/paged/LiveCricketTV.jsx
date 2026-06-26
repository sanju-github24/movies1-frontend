import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Tv2, Signal, Volume2, Maximize2, AlertCircle,
  RefreshCw, Activity, Calendar, Globe, Trophy, Star
} from "lucide-react";

// ─── CRICKET CHANNELS ─────────────────────────────────────────────────────────
const CRICKET_CHANNELS = [
  {
    id: "star-english", name: "Star Sports-1", sub: "English HD",
    color: "#00a8e1", glow: "rgba(0,168,225,0.3)", border: "rgba(0,168,225,0.25)",
    bg: "rgba(0,168,225,0.06)", tag: "ENGLISH", useIcon: false,
    logo: "/star-sports-1.jpg", url: "https://m3u8-player-ashen.vercel.app/?sid=ae20ybhnk6u3&chid=AAsD&t=IAxTQhJmCAUbGwBYAxB6cQ",
    desc: "Star Sports 1 HD — Live cricket in English HD",
  },
  {
    id: "star-hindi", name: "Star Sports", sub: "Hindi HD",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "HINDI", useIcon: false,
    logo: "/star-sports-1-hindi.jpg", url: "https://m3u8-player-ashen.vercel.app/?sid=m0oj508fj7ye&chid=AAsDWA&t=IAxTQhJmCAUbGwBYAxB6XBYOAE87PA",
    desc: "Star Sports Hindi HD — Live cricket in Hindi HD",
  },
  {
    id: "star-sports-1-kannada", name: "Star Sports", sub: "Kannada HD",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "KANNADA", useIcon: false,
    logo: "/star-sports-1-kannada.jpg", url: "https://m3u8-player-ashen.vercel.app/?sid=iu279eb6l93w&chid=AAsDW1Nb&t=IAxTQhJmCAUbGwBYAxB5VBYECAsS",
    desc: "Star Sports Kannada HD — Live cricket in Kannada HD",
  },{
    id: "star-sports-1-tamil", name: "Star Sports", sub: "Tamil HD",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "TAMIL", useIcon: false,
    logo: "/star-sports-1-tamil.jpg", url: "https://m3u8-player-ashen.vercel.app/?sid=kk0euzqekk4j&chid=AAsDRFNY&t=IAxTQhJmCAUbGwBYAxBmVBUDBU87PA",
    desc: "Star Sports Tamil HD — Live cricket in Tamil HD",
  },{
    id: "star-sports-1-telugu", name: "Star Sports", sub: "Telugu HD",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "TELUGU", useIcon: false,
    logo: "/star-sports-1-telugu.jpg", url: "https://m3u8-player-ashen.vercel.app/?sid=nggrr3m0kwmt&chid=AAsDRFdZ&t=IAxTQhJmCAUbGwBYAxBmUBQfDhpTMHY",
    desc: "Star Sports Telugu HD — Live cricket in Telugu HD",
  },
  {
    id: "Willow-Sports", name: "Willow TV", sub: "English",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "HINDI", useIcon: false,
    logo: "/willow.svg", url: "https://m3u8-player-ashen.vercel.app/?sid=mzo8bm6chvg8&src=https%3A%2F%2Famg01269-amg01269c1-sportstribal-emea-5204.playouts.now.amagi.tv%2Fts-eu-w1-n2%2Fplaylist%2Famg01269-willowtvfast-willowplus-sportstribalemea%2Fcb7f3e1a7b7b6f8a9ac33e6cd9f143a5d1073183573a80303aac5e9e7792155d80b9f7c9b84aeb4a19e24094385631004262d519ce647c968d23f6156b3f4f7f8ae1ec3f8cc50274e38b1f5549a3120e50fe6114d54a543b99c80a188938827c0738e11d210361daf35aab664abef86ef603359bf1843a6c6d2d0acc0602fcb02dfbbdbe0010c76da5b802488b2f5be7922198824df9d9cb5e9d449875f7068993a38dd1438486967eaf50e0304409737bc8cd7bcb9c04fb88cc393cc82170401f57e2a1a1d42453eed19c71829de291279a3ac08d2c801258d162b97cf4fb0ef6c873c3c05da9acc1bf08216be6ac5f10ba36f020769a6113c4ac6a10c4df534fb9bc785954c06c970924349bfcdf15be1274fca30e8aae601134c1de10d5cdf2cbc2b18e439231c5d4fcc37d6b4077010ec670a3992df41a9d40e89f431e0d187bfad315e596c95235554a84ab57c05c4eea8cc5d0894e73e1482f77c42c99570c67c9744b79e626f6d37c4f813405883072aa0c6cce12b2e862a5e7e8e4003aa7d78817ac38a1e65ca09968cd420f193ac1957d0f7a1d28efb91c4a5a1fe44aebd4c6e4056c21fce7c1fbba3e1b0f2b185f09cbafa75fa8cef86b7a32c4402d747b001df4528089beb6b4d99faf0b36e6b65dc6267bd08a8272ae04501d%2F66%2F1920x1080_5859480%2Findex.m3u8&title=Willow-cricket-live",
    desc: "Willow Sports — Live cricket in English",
  },
  {
    id: "sony-ten-1", name: "Sony Ten 1", sub: "English",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "English", useIcon: false,
    logo: "/sony-ten-1.png", url: "https://m3u8-player-ashen.vercel.app/?sid=azfrj6ralqw1&chid=Qk4A&t=IBdcSRJhHQRJXlMwdg",
    desc: "Sony Ten 1 — Live cricket in English",
  },
];

const FOOTBALL_CHANNELS = [
  {
    id: "sports18-english", name: "Sports18", sub: "English",
    color: "#1ed596", glow: "rgba(30,213,150,0.3)", border: "rgba(30,213,150,0.25)",
    bg: "rgba(30,213,150,0.06)", tag: "ENG", useIcon: true,
    logo: "", url: "https://m3u8-player-ashen.vercel.app/?sid=xhnp1jmaa49q&src=GwxGQEEPV0UaGxwKU1dXGx8FBggfHVNAW0ZWCQYCXBpeRVdfGRMaF1waQUBdRwwZRgISFltWV0YMRARcBkA&t=PxFEVRJzEQwI",
    desc: "Sports18 — FIFA World Cup 2026 in English",
  },
   {
    id: "sports18", name: "Sports", sub: "English",
    color: "#1ed596", glow: "rgba(30,213,150,0.3)", border: "rgba(30,213,150,0.25)",
    bg: "rgba(30,213,150,0.06)", tag: "ENG", useIcon: true,
    logo: "", url:"https://m3u8-player-ashen.vercel.app/?sid=yvlqckxrby06&src=GwxGQEEPV0UaGxwKU1dXGx8FBggfHVNAW0ZWCQYCXBpeRVdfGRMaF1waQUBdRwwZRgIGAG1GW1EdBUYGHRxXSB8EVgdaGks&t=PxFEVRJzEQwI",
    desc: "FIFA World Cup 2026 in English",
  },
  {
    id: "koora-city", name: "koora city", sub: "english",
    color: "#a78bfa", glow: "rgba(167,139,250,0.3)", border: "rgba(167,139,250,0.25)",
    bg: "rgba(167,139,250,0.06)", tag: "हिंदी", useIcon: true,
    logo: "", url: "https://m3u8-player-ashen.vercel.app/?sid=vztt78sub09z&src=GwxGQEEPV0UeCl0LX1FAWghEGhscClcfQUUXBRpeLE8AAB1cFg4MF10VAUUK&t=PxFEVRJzEQwI",
    desc: "Sports18 — FIFA World Cup 2026 in Hindi",
  },{
    id: "sports18", name: "Sports18", sub: "English",
    color: "#a78bfa", glow: "rgba(167,139,250,0.3)", border: "rgba(167,139,250,0.25)",
    bg: "rgba(167,139,250,0.06)", tag: "हिंदी", useIcon: true,
    logo: "", url: "https://m3u8-player-ashen.vercel.app/?sid=tz3xam78ng4w&src=https%3A%2F%2Fnbculocallive.akamaized.net%2Fhls%2Flive%2F2037499%2Fpuertorico%2Fstream1%2Fmaster_1080.m3u8&title=fifa",
    desc: "Sports18 — FIFA World Cup 2026 in English",
  },
];

// ─── API CONFIG ────────────────────────────────────────────────────────────────
const FIFA_COMPETITION = "17";
const FIFA_SEASON      = "285023";
const FIFA_STAGE       = "289273";
const FIFA_API_BASE    = "https://api.fifa.com/api/v3";
const WT20_SERIES_ID   = "12672";
const API_BASE         = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";

// ─── BCCI HELPERS ──────────────────────────────────────────────────────────────
const BCCI_WOMENS_COMP_IDS = new Set([238]);
const BCCI_FORMAT_LABEL = {
  "One Day D/N": "ODI", "One Day": "ODI", "T20": "T20I",
  "Test": "Test", "Test D/N": "Test",
};
function bcciFmt(type) { return BCCI_FORMAT_LABEL[type] || type || "MATCH"; }
function bcciFmtDate(s) {
  try { return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }); }
  catch { return s; }
}
function bcciSlugify(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function bcciBuildScoreUrl(match) {
  const seriesName = bcciSlugify(match.CompetitionName);
  const matchOrder = bcciSlugify(match.MatchOrder);
  return `https://scores2.bcci.tv/getMatchCenterDetails?competitionID=${match.CompetitionID}&seriesName=${seriesName}&matchID=${match.MatchID}&matchOrder=${matchOrder}&SERIES_ID=${match.CompetitionID}&widgetType=international`;
}
const BCCI_FORMAT_COLORS = {
  ODI:  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)"  },
  T20I: { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.2)"  },
  Test: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)"   },
};
function bcciFmtColors(type) { return BCCI_FORMAT_COLORS[bcciFmt(type)] || BCCI_FORMAT_COLORS.ODI; }
function isIndiaMensMatch(m) { return !BCCI_WOMENS_COMP_IDS.has(Number(m.CompetitionID)); }

// ─── FIFA HELPERS ──────────────────────────────────────────────────────────────
function getFifaFlagUrl(code) { return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`; }
function getFifaStatus(m) {
  if (m.MatchStatus === 3) return "live";
  if (m.MatchStatus === 0 && (m.Winner || m.HomeTeamScore !== null)) return "finished";
  return "upcoming";
}
function fmtFifaTime(d) { return d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : ""; }
function fmtFifaDate(d) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : ""; }
function fifaTeamName(t) { return t?.TeamName?.find(x => x.Locale === "en-GB")?.Description || t?.ShortClubName || t?.Abbreviation || ""; }
function fifaGroupName(m) { return m.GroupName?.find(x => x.Locale === "en-GB")?.Description || ""; }
function fifaStadium(m) { return m.Stadium?.Name?.find(x => x.Locale === "en-GB")?.Description || ""; }
function fifaCity(m) { return m.Stadium?.CityName?.find(x => x.Locale === "en-GB")?.Description || ""; }

// ─── ICC TEAM COLORS ───────────────────────────────────────────────────────────
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
function getIccTeam(short) { return ICC_TEAM_COLORS[short] || { primary: "#333", accent: "#fff", flag: "🏏" }; }

// ─── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function PulsingDot({ color }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: color }} />
    </span>
  );
}

function ChannelCard({ ch, active, onClick }) {
  return (
    <button onClick={() => onClick(ch)}
      className="relative w-full text-left rounded-2xl border transition-all duration-300 active:scale-[0.98] overflow-hidden"
      style={{ background: active ? ch.bg : "rgba(255,255,255,0.02)", borderColor: active ? ch.border : "rgba(255,255,255,0.06)", boxShadow: active ? `0 0 30px ${ch.glow}` : "none" }}>
      {active && <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `linear-gradient(135deg,${ch.color}44 0%,transparent 60%)` }} />}
      <div className="relative p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all"
          style={{ background: active ? `${ch.color}15` : "rgba(255,255,255,0.04)", borderColor: active ? ch.border : "rgba(255,255,255,0.06)" }}>
          {ch.useIcon
            ? <Tv2 size={18} style={{ color: active ? ch.color : "#4b5563" }} />
            : <img src={ch.logo} alt="" className="w-7 h-7 object-contain" style={{ filter: active ? "none" : "grayscale(100%) brightness(0.4)" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] px-1 py-0.5 rounded" style={{ background: `${ch.color}20`, color: ch.color }}>{ch.tag}</span>
            <PulsingDot color={ch.color} />
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: ch.color }}>Live</span>
          </div>
          <p className="text-xs font-black text-white uppercase tracking-tight leading-none">
            {ch.name} <span className="font-bold" style={{ color: ch.color }}>{ch.sub}</span>
          </p>
          <p className="text-[9px] text-gray-600 mt-0.5 truncate">{ch.desc}</p>
        </div>
        <div className="shrink-0 w-1.5 h-6 rounded-full" style={{ background: active ? ch.color : "transparent" }} />
      </div>
    </button>
  );
}

function StreamPlayer({ ch, switching, onFullscreen, playerRef }) {
  return (
    <div ref={playerRef} className="relative rounded-3xl overflow-hidden border shadow-2xl"
      style={{ borderColor: ch.border, boxShadow: `0 0 60px ${ch.glow}`, background: "#000" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b transition-all duration-500"
        style={{ borderColor: ch.border, background: `linear-gradient(90deg,${ch.bg},transparent)` }}>
        <div className="flex items-center gap-3">
          <PulsingDot color={ch.color} />
          <div className="flex items-center gap-2">
            {ch.useIcon ? <Tv2 size={13} style={{ color: ch.color }} /> : <img src={ch.logo} alt="" className="h-4 w-auto object-contain" />}
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: ch.color }}>{ch.name} {ch.sub}</span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: `${ch.color}20`, color: ch.color }}>Live</span>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 size={13} className="text-gray-600" />
          <button onClick={onFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <Maximize2 size={13} className="text-gray-500 hover:text-white transition-colors" />
          </button>
        </div>
      </div>
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        {switching && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-3"
              style={{ borderColor: `${ch.color}44`, borderTopColor: ch.color }} />
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: ch.color }}>Switching…</p>
          </div>
        )}
        <iframe key={ch.id} src={ch.url}
          className="absolute inset-0 w-full h-full border-none"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen scrolling="no"
          style={{ opacity: switching ? 0 : 1, transition: "opacity 0.35s ease" }} />
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 border-t" style={{ borderColor: ch.border, background: "rgba(0,0,0,0.4)" }}>
        <AlertCircle size={10} className="text-gray-700 shrink-0" />
        <p className="text-[9px] text-gray-700 font-bold uppercase tracking-wider">Third-party stream · Use Chrome · Disable ad-blocker if needed</p>
      </div>
    </div>
  );
}

function SportSection({ channels }) {
  const [activeCh, setActiveCh] = useState(channels[0]);
  const [switching, setSwitching] = useState(false);
  const playerRef = useRef(null);
  const switchCh = (ch) => {
    if (ch.id === activeCh.id) return;
    setSwitching(true);
    setTimeout(() => { setActiveCh(ch); setSwitching(false); }, 350);
  };
  const fullscreen = () => {
    if (!document.fullscreenElement) playerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };
  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${channels.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {channels.map(ch => <ChannelCard key={ch.id} ch={ch} active={activeCh.id === ch.id} onClick={switchCh} />)}
      </div>
      <StreamPlayer ch={activeCh} switching={switching} onFullscreen={fullscreen} playerRef={playerRef} />
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest shrink-0">Switch</span>
        <div className="flex gap-2 flex-wrap">
          {channels.map(ch => (
            <button key={ch.id} onClick={() => switchCh(ch)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all active:scale-95"
              style={{ background: activeCh.id === ch.id ? ch.bg : "rgba(255,255,255,0.02)", borderColor: activeCh.id === ch.id ? ch.border : "rgba(255,255,255,0.06)", color: activeCh.id === ch.id ? ch.color : "#4b5563" }}>
              <PulsingDot color={activeCh.id === ch.id ? ch.color : "#374151"} />
              {ch.useIcon ? <Tv2 size={10} style={{ color: activeCh.id === ch.id ? ch.color : "#4b5563" }} /> : <img src={ch.logo} alt="" className="h-3 w-auto object-contain opacity-80" />}
              {ch.sub}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── BCCI SCORECARD — ICC WT20 style ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Over ball chip
function BallChip({ label }) {
  const l = String(label).toUpperCase();
  let bg = "rgba(255,255,255,0.05)", border = "rgba(255,255,255,0.12)", color = "#6b7280";
  if (l === "W")        { bg = "#dc2626"; border = "#b91c1c"; color = "#fff"; }
  else if (l === "4")   { bg = "#2563eb"; border = "#1d4ed8"; color = "#fff"; }
  else if (l === "6")   { bg = "#16a34a"; border = "#15803d"; color = "#fff"; }
  else if (l.includes("NB")) { bg = "#d97706"; border = "#b45309"; color = "#fff"; }
  else if (l.includes("WD")) { bg = "#57534e"; border = "#44403c"; color = "#a8a29e"; }
  return (
    <span className="flex items-center justify-center rounded-full font-black border shrink-0"
      style={{ backgroundColor: bg, borderColor: border, color, width: 30, height: 30, fontSize: l.length > 2 ? "7px" : l.length > 1 ? "8px" : "12px", lineHeight: 1 }}>
      {l === "0" ? "·" : l}
    </span>
  );
}

// Live players panel
function BcciLivePlayers({ md }) {
  if (!md?.CurrentStrikerName) return null;
  return (
    <div className="px-4 py-3 border-t border-white/5 space-y-2">
      <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2">At the crease</p>

      {/* Striker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-800 shrink-0 border border-white/10">
            {md.StrikerImage && <img src={md.StrikerImage} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />}
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-400">★ {md.CurrentStrikerName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-right">
          <span className="text-[13px] font-black text-white">{md.StrikerRuns}<span className="text-[9px] text-gray-500">({md.StrikerBalls})</span></span>
          {md.StrikerFours > 0 && <span className="text-[9px] text-blue-400">{md.StrikerFours}×4</span>}
          {md.StrikerSixes > 0 && <span className="text-[9px] text-violet-400">{md.StrikerSixes}×6</span>}
          <span className="text-[9px] text-gray-600 font-mono">SR {md.StrikerSR}</span>
        </div>
      </div>

      {/* Non-striker */}
      {md.CurrentNonStrikerName && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-800 shrink-0 border border-white/10">
              {md.NonStrikerImage && <img src={md.NonStrikerImage} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />}
            </div>
            <span className="text-[11px] font-bold text-gray-400">○ {md.CurrentNonStrikerName}</span>
          </div>
          <span className="text-[11px] text-gray-500">{md.NonStrikerRuns}<span className="text-[9px] text-gray-600">({md.NonStrikerBalls})</span></span>
        </div>
      )}

      {/* Bowler */}
      {md.CurrentBowlerName && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-800 shrink-0 border border-white/10">
              {md.BowlerImage && <img src={md.BowlerImage} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />}
            </div>
            <span className="text-[11px] font-bold text-blue-400">● {md.CurrentBowlerName}</span>
          </div>
          <span className="text-[9px] text-gray-500 font-mono">
            {md.BowlerOvers}ov · {md.BowlerRuns}R · {md.BowlerWickets}W · Eco {parseFloat(md.BowlerEconomy || 0).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

// Match result banner
// Replace BcciResultBanner entirely:
function BcciResultBanner({ md, innRows, fmtC }) {
  const winningId = String(md.WinningTeamID || "");
  // Comments field contains the full result: "India Won by 7 Wickets"
  const resultComment = (md.Comments || md.Commentss || "").trim();
  const mom = md.MOM || "";
  const momRuns = md.MOMRuns && md.MOMRuns !== "-" ? md.MOMRuns : null;
  const momWkts = md.MOMWicket && md.MOMWicket !== "-" ? md.MOMWicket : null;
  const momImg  = md.MOMImage || "";

  if (!resultComment && !winningId && !mom) return null;

  // Find winner team name from innRows if we have WinningTeamID
  const winner = innRows.find(r => String(r.id) === winningId);
  const winnerName = winner?.name || winner?.code || "";

  return (
    <div className="px-4 py-3 border-t border-white/5" style={{ background: "rgba(74,222,128,0.04)" }}>
      {/* Result line */}
      <div className="flex items-center gap-2 mb-1.5">
        <Trophy size={13} className="text-amber-400 shrink-0" />
        <p className="text-[12px] font-black" style={{ color: "#4ade80" }}>
          {resultComment || (winnerName ? `${winnerName} won` : "Match completed")}
        </p>
      </div>

      {/* Player of the Match */}
      {mom && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
          {momImg && (
            <div className="w-7 h-7 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
              <img src={momImg} alt="" className="w-full h-full object-cover"
                onError={e => { e.target.style.display = "none"; }} />
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Star size={10} className="text-amber-400 shrink-0" />
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">POTM</span>
            <span className="text-[10px] font-bold text-white">{mom}</span>
            {momRuns && <span className="text-[9px] text-gray-500">{momRuns}R</span>}
            {momWkts && momWkts !== "-" && <span className="text-[9px] text-gray-500">{momWkts}W</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// Batting card
function BcciBattingCard({ battingCard, bowlingCard, strikerID, nonStrikerID }) {
  if (!battingCard?.length) return <p className="text-center text-gray-700 text-xs py-6">No batting data</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead><tr className="border-b border-white/5">
          {["Batter", "Dismissal", "R", "B", "4s", "6s", "SR"].map((h, i) => (
            <th key={h} className={`py-2.5 font-black text-gray-500 uppercase tracking-wider text-[9px] ${i === 0 ? "pl-4 text-left" : "text-right px-1.5"} ${i === 6 ? "pr-4" : ""}`}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {battingCard.map((b, i) => {
            const name = b.PlayerName || b.BatsmanName || b.Name || "—";
            const isBatting = b.IsBatting || b.isNotOut || (b.OutDesc || "").toLowerCase() === "not out";
            const outDesc = b.OutDesc || b.DismissalText || b.HowOut || (isBatting ? "not out" : "—");
            return (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="pl-4 py-2.5">
                  <span className={`font-bold text-[11px] ${isBatting ? "text-amber-400" : "text-gray-300"}`}>
                    {name}{isBatting ? " ★" : ""}
                  </span>
                </td>
                <td className="px-1.5 py-2.5 text-[9px] text-gray-500 italic max-w-[90px] truncate">{outDesc}</td>
                <td className="px-1.5 py-2.5 text-right font-black text-white">{b.Runs ?? "—"}</td>
                <td className="px-1.5 py-2.5 text-right text-gray-500">{b.Balls ?? "—"}</td>
                <td className="px-1.5 py-2.5 text-right text-blue-400/80">{b.Fours ?? "—"}</td>
                <td className="px-1.5 py-2.5 text-right text-violet-400/80">{b.Sixes ?? "—"}</td>
                <td className="pr-4 py-2.5 text-right text-gray-600 font-mono">{b.StrikeRate ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Bowling card
function BcciBowlingCard({ bowlingCard }) {
  if (!bowlingCard?.length) return <p className="text-center text-gray-700 text-xs py-6">No bowling data</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead><tr className="border-b border-white/5">
          {["Bowler", "O", "M", "R", "W", "Eco"].map((h, i) => (
            <th key={h} className={`py-2.5 font-black text-gray-500 uppercase tracking-wider text-[9px] ${i === 0 ? "pl-4 text-left" : "text-right px-1.5"} ${i === 5 ? "pr-4" : ""}`}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {bowlingCard.map((b, i) => {
            const name = b.PlayerName || b.BowlerName || b.Name || "—";
            const isCur = b.IsBowling || b.isCurrentBowler || false;
            return (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="pl-4 py-2.5">
                  <span className={`font-bold text-[11px] ${isCur ? "text-blue-400" : "text-gray-300"}`}>{name}{isCur ? " ●" : ""}</span>
                </td>
                <td className="px-1.5 py-2.5 text-right text-white font-mono">{b.Overs ?? "—"}</td>
                <td className="px-1.5 py-2.5 text-right text-gray-500">{b.Maidens ?? "—"}</td>
                <td className="px-1.5 py-2.5 text-right text-white font-bold">{b.Runs ?? "—"}</td>
                <td className="px-1.5 py-2.5 text-right text-green-400 font-black">{b.Wickets ?? "—"}</td>
                <td className="pr-4 py-2.5 text-right text-gray-500">{b.Economy ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Main BCCI scorecard
function BcciScorecard({ match }) {
  const [sc, setSc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("batting");
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
  const matchRef = useRef(match);
  useEffect(() => { matchRef.current = match; }, [match]);

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
      setSc(json);
      setLastUpdate(new Date()); setCountdown(30); setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000); return () => clearInterval(t); }, [lastUpdate]);

  // ── Parse the BCCI API response ──────────────────────────────────────────
  // BCCI returns: { matchStatus, postMatch:[{...}], squadA, squadB, ... }
  // Live match data is in postMatch[0]
  const rawMd = sc?.postMatch?.[0] || sc?.liveMatch?.[0] || sc?.upcomingMatch?.[0] || match;
  const isNowLive = rawMd?.MatchStatus === "Live" || sc?.matchStatus === "live";
const isFinished = !isNowLive && (
  rawMd?.WinningTeamID ||
  rawMd?.MatchStatus === "Result" ||
  rawMd?.MatchStatus === "Post" ||        // ← BCCI uses "Post" for completed
  sc?.matchStatus === "post" ||           // ← top-level matchStatus
  !!rawMd?.Comments                       // ← if there's a result comment, match is done
);

  const fmt = bcciFmt(rawMd?.MatchType || match.MatchType);
  const fmtC = bcciFmtColors(rawMd?.MatchType || match.MatchType);

  // Current innings index (1 or 2)
  const curInn = String(rawMd?.CurrentInnings || "1");

  // Build innings rows from the postMatch response structure
  const firstBatCode  = rawMd?.FirstBattingTeamCode  || "";
  const secondBatCode = rawMd?.SecondBattingTeamCode || "";
  const firstBatName  = rawMd?.FirstBattingTeamName  || "";
  const secondBatName = rawMd?.SecondBattingTeamName || "";
  const firstBatId    = String(rawMd?.FirstBattingTeamID  || "1");
  const secondBatId   = String(rawMd?.SecondBattingTeamID || "2");
  const homeId        = String(rawMd?.HomeTeamID  || "");
  const awayId        = String(rawMd?.AwayTeamID  || "");

  function teamLogo(id) {
    if (String(id) === homeId) return rawMd?.MatchHomeTeamLogo || rawMd?.HomeTeamLogo || "";
    if (String(id) === awayId) return rawMd?.MatchAwayTeamLogo || rawMd?.AwayTeamLogo || "";
    return "";
  }

  const innRows = [
    {
      id: firstBatId, code: firstBatCode, name: firstBatName, num: "1",
      summary: rawMd?.["1Summary"] || "", runs: rawMd?.["1FallScore"] || "",
      wkts: rawMd?.["1FallWickets"] || "0", overs: rawMd?.["1FallOvers"] || "",
      rr: rawMd?.["1RunRate"] || "",
    },
    {
      id: secondBatId, code: secondBatCode, name: secondBatName, num: "2",
      summary: rawMd?.["2Summary"] || "", runs: rawMd?.["2FallScore"] || "",
      wkts: rawMd?.["2FallWickets"] || "0", overs: rawMd?.["2FallOvers"] || "",
      rr: rawMd?.["2RunRate"] || "",
    },
  ];

  const curInnRR = innRows.find(r => r.num === curInn)?.rr || "";
  const tossText = rawMd?.TossDetails || rawMd?.TossText || "";
  const chasingText = rawMd?.ChasingText || rawMd?.Comments || "";
  const matchOvers = rawMd?.MATCH_NO_OF_OVERS || "50";

  // Scorecard data (if backend returns it)
  const scorecardInn = sc?.scorecardData?.innings || sc?.innings || [];
  const currentInnCard = scorecardInn.find(i =>
    String(i.number || i.inningsNumber || i.InningsNumber) === curInn
  ) || scorecardInn[0] || null;
  const battingCard = currentInnCard?.batting || currentInnCard?.BattingCard || [];
  const bowlingCard = currentInnCard?.bowling || currentInnCard?.BowlingCard || [];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-14 gap-4">
      <div className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "rgba(245,158,11,0.12)", borderTopColor: fmtC.color }} />
      <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Loading scorecard…</p>
    </div>
  );

  if (error && !rawMd?.MatchName) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
      <AlertCircle size={24} className="text-red-500/60" />
      <p className="text-[11px] text-gray-700">{error}</p>
      <button onClick={() => load()} className="px-4 py-2 rounded-xl border text-[10px] font-bold"
        style={{ borderColor: fmtC.border, color: fmtC.color }}>Retry</button>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Activity size={12} style={{ color: fmtC.color }} />
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest truncate max-w-[160px]">
            {rawMd?.CompetitionName || match.CompetitionName}
          </span>
          {isNowLive
            ? <span className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Live {countdown}s
              </span>
            : isFinished
              ? <span className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                  ✓ Completed
                </span>
              : <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded"
                  style={{ background: fmtC.bg, color: fmtC.color, border: `1px solid ${fmtC.border}` }}>
                  {fmt} · {rawMd?.MatchOrder || match.MatchOrder}
                </span>
          }
        </div>
        <button onClick={() => load()} className={`text-gray-600 hover:text-amber-400 transition-all ${refreshing ? "animate-spin" : ""}`}>
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Match card */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {/* Venue + toss */}
        <div className="px-4 py-2.5 border-b border-white/5 bg-white/[0.01]">
          <p className="text-[10px] text-gray-400 font-semibold">
            📍 {rawMd?.GroundName || match.GroundName}{rawMd?.city ? `, ${rawMd.city}` : ""}
          </p>
          {tossText && <p className="text-[9px] text-gray-600 mt-0.5 italic">🪙 {tossText}</p>}
          <p className="text-[9px] text-gray-600 mt-0.5">{fmt} · {rawMd?.MatchOrder || match.MatchOrder} · {matchOvers} overs</p>
        </div>

        {/* Innings rows */}
        <div className="p-3 space-y-2">
          {innRows.map(({ id, code, name, num, runs, wkts, overs, rr }) => {
            const isBatting = isNowLive && num === curInn;
            const logo = teamLogo(id);
            const meta = getIccTeam(code);
            const hasScore = !!runs;
            return (
              <div key={num}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all"
                style={{
                  background: isBatting ? `${meta.primary}18` : "rgba(255,255,255,0.02)",
                  borderColor: isBatting ? `${meta.primary}50` : "rgba(255,255,255,0.05)",
                }}>
                {/* Logo */}
                <div className="w-9 h-9 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                  {logo
                    ? <img src={logo} alt="" className="w-full h-full object-contain p-0.5" onError={e => { e.target.style.display = "none"; }} />
                    : <span className="text-lg">{meta.flag}</span>}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white">{code}</span>
                    {isBatting && (
                      <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(245,166,35,0.2)", color: "#f5a623" }}>Batting</span>
                    )}
                    {isFinished && String(rawMd?.WinningTeamID) === String(id) && (
                      <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>Won</span>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-600 truncate">{name}</p>
                </div>
                {/* Score */}
                <div className="text-right shrink-0">
                  {hasScore ? (
                    <>
                      <span className="text-xl font-black text-white">{runs}/{wkts}</span>
                      {overs && <p className="text-[9px] text-gray-600">({overs}/{matchOvers} ov)</p>}
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-700 font-bold uppercase">
                      {num === "2" && innRows[0].runs ? "Yet to bat" : bcciFmtDate(rawMd?.MatchDate || match.MatchDate)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live stats bar */}
        {isNowLive && (
          <div className="px-4 py-2.5 border-t border-white/5 flex gap-4 flex-wrap bg-white/[0.01]">
            {curInnRR && parseFloat(curInnRR) > 0 && (
              <div>
                <span className="text-[8px] font-black text-gray-700 uppercase block">CRR</span>
                <span className="text-sm font-black text-green-400">{parseFloat(curInnRR).toFixed(2)}</span>
              </div>
            )}
            <div>
              <span className="text-[8px] font-black text-gray-700 uppercase block">Innings</span>
              <span className="text-sm font-black text-white">{curInn === "1" ? "1st" : "2nd"}</span>
            </div>
            {rawMd?.MatchProgress && (
              <div>
                <span className="text-[8px] font-black text-gray-700 uppercase block">Progress</span>
                <span className="text-sm font-black text-purple-400">{parseFloat(rawMd.MatchProgress || 0).toFixed(0)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Live players */}
        {isNowLive && rawMd?.CurrentStrikerName && <BcciLivePlayers md={rawMd} />}

        {/* Chasing / match status text */}
        {chasingText && (
          <div className="px-4 py-2.5 border-t border-white/5 text-center">
            <p className="text-[11px] font-black" style={{ color: isNowLive ? "#f59e0b" : "#4ade80" }}>
              {chasingText}
            </p>
          </div>
        )}

        {/* Result banner */}
        {isFinished && <BcciResultBanner md={rawMd} innRows={innRows} fmtC={fmtC} />}

        {/* Upcoming */}
        {!isNowLive && !isFinished && !innRows[0].runs && (
          <div className="px-4 py-4 border-t border-white/5 text-center space-y-1">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Match starts</p>
            <p className="text-base font-black text-white">{bcciFmtDate(rawMd?.MatchDate || match.MatchDate)}</p>
            <p className="text-[11px] text-gray-500">
              {rawMd?.CustomMatchTime || rawMd?.MatchTime || match.MatchTime} IST · {rawMd?.GroundName || ""}
            </p>
          </div>
        )}
      </div>

      {/* Batting / Bowling tabs */}
      {(battingCard.length > 0 || bowlingCard.length > 0) && (
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex border-b border-white/5">
            {[
              { k: "batting", l: `${firstBatCode} Bat` },
              { k: "bowling", l: `${secondBatCode} Bowl` },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className="flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-b-2"
                style={{ color: tab === t.k ? fmtC.color : "#4b5563", borderBottomColor: tab === t.k ? fmtC.color : "transparent", background: "transparent" }}>
                {t.l}
              </button>
            ))}
          </div>
          <div className="min-h-[80px]">
            {tab === "batting" && <BcciBattingCard battingCard={battingCard} bowlingCard={bowlingCard} />}
            {tab === "bowling" && <BcciBowlingCard bowlingCard={bowlingCard} />}
          </div>
        </div>
      )}

      {lastUpdate && (
        <p className="text-[8px] text-gray-700 text-center italic">
          Updated {lastUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST · refreshes every 30s
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── WT20 SCORECARD ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function Wt20BattingCard({ batsmen, teams, battingTeamId, bowlingTeamId }) {
  const battingTeam = teams?.[battingTeamId]; const bowlingTeam = teams?.[bowlingTeamId];
  const batted = batsmen?.filter(b => b.Balls !== "" && b.Balls !== undefined) || [];
  if (!batted.length) return <p className="text-center text-gray-700 text-xs py-6">No batting data yet</p>;
  return (
    <div className="overflow-x-auto"><table className="w-full text-[11px]">
      <thead><tr className="border-b border-white/5">{["Batter","Dismissal","R","B","4s","6s","SR"].map((h,i) => <th key={h} className={`py-2.5 font-black text-gray-500 uppercase tracking-wider text-[9px] ${i===0?"pl-4 text-left":"text-right px-2"} ${i===6?"pr-4":""}`}>{h}</th>)}</tr></thead>
      <tbody>{batted.map((b,i)=>{
        const player=battingTeam?.Players?.[b.Batsman];const name=player?.Name_Short||player?.Name_Full||`#${b.Batsman}`;
        const isBatting=b.Howout==="Batting";const dismissal=isBatting?"not out":(b.Howout_short||b.Howout||"—");
        const bowlerP=b.Bowler?(bowlingTeam?.Players?.[b.Bowler]?.Name_Short||""):"";
        const dismissalFull=isBatting?"not out":(dismissal+(bowlerP?` b ${bowlerP}`:""));
        return(<tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
          <td className="pl-4 py-2.5"><span className={`font-bold text-[11px] ${isBatting?"text-amber-400":"text-gray-300"}`}>{name}{isBatting?" ★":""}</span></td>
          <td className="px-2 py-2.5 text-[9px] text-gray-500 italic max-w-[90px] truncate">{dismissalFull}</td>
          <td className="px-2 py-2.5 text-right font-black text-white">{b.Runs}</td>
          <td className="px-2 py-2.5 text-right text-gray-500">{b.Balls}</td>
          <td className="px-2 py-2.5 text-right text-blue-400/80">{b.Fours}</td>
          <td className="px-2 py-2.5 text-right text-violet-400/80">{b.Sixes}</td>
          <td className="pr-4 py-2.5 text-right text-gray-600 font-mono">{parseFloat(b.Strikerate||0).toFixed(1)}</td>
        </tr>);})}</tbody>
    </table></div>
  );
}

function Wt20BowlingCard({ bowlers, bowlingTeamId, teams }) {
  const bowlingTeam = teams?.[bowlingTeamId];
  const bowled = bowlers?.filter(b => b.Balls_Bowled > 0) || [];
  if (!bowled.length) return <p className="text-center text-gray-700 text-xs py-6">No bowling data yet</p>;
  return (
    <div className="overflow-x-auto"><table className="w-full text-[11px]">
      <thead><tr className="border-b border-white/5">{["Bowler","O","M","R","W","Eco"].map((h,i) => <th key={h} className={`py-2.5 font-black text-gray-500 uppercase tracking-wider text-[9px] ${i===0?"pl-4 text-left":"text-right px-2"} ${i===5?"pr-4":""}`}>{h}</th>)}</tr></thead>
      <tbody>{bowled.map((b,i)=>{
        const player=bowlingTeam?.Players?.[b.Bowler];const name=player?.Name_Short||player?.Name_Full||`#${b.Bowler}`;const isCurrent=b.Isbowlingnow;
        return(<tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
          <td className="pl-4 py-2.5"><span className={`font-bold text-[11px] ${isCurrent?"text-blue-400":"text-gray-300"}`}>{name}{isCurrent?" ●":""}</span></td>
          <td className="px-2 py-2.5 text-right text-white font-mono">{b.Overs}</td>
          <td className="px-2 py-2.5 text-right text-gray-500">{b.Maidens}</td>
          <td className="px-2 py-2.5 text-right text-white font-bold">{b.Runs}</td>
          <td className="px-2 py-2.5 text-right text-green-400 font-black">{b.Wickets}</td>
          <td className="pr-4 py-2.5 text-right text-gray-500">{parseFloat(b.Economyrate||0).toFixed(2)}</td>
        </tr>);})}</tbody>
    </table></div>
  );
}

function Wt20Scorecard({ matchId }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); const [activeTab, setActiveTab] = useState("batting");
  const [refreshing, setRefreshing] = useState(false); const [countdown, setCountdown] = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null); const idRef = useRef(matchId);
  useEffect(() => { idRef.current = matchId; setData(null); setLoading(true); setError(null); }, [matchId]);
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/wt20/scorecard?game_id=${idRef.current}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json(); setData(json.data || json); setLastUpdate(new Date()); setCountdown(30); setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [load, matchId]);
  useEffect(() => { const t = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000); return () => clearInterval(t); }, [lastUpdate]);

  if (loading) return <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(139,92,246,0.15)", borderTopColor: "#8b5cf6" }} /><p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Loading scorecard…</p></div>;
  if (error || !data) return <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4"><AlertCircle size={28} className="text-red-500/60" /><p className="text-[11px] text-gray-700">{error || "No data"}</p><button onClick={() => load()} className="mt-2 px-4 py-2 rounded-xl border border-purple-500/30 text-purple-400 text-xs font-bold">Retry</button></div>;

  const md = data.Matchdetail || {}; const seriesInfo = md.Series || {}; const venue = md.Venue || {};
  const innings = data.Innings || []; const teams = data.Teams || {};
  const isLive = md.Match?.Live === true; const isComplete = !isLive && innings.some(inn => inn.Total);
  const homeTeamId = md.Team_Home; const awayTeamId = md.Team_Away;
  const homeTeam = teams[homeTeamId]; const awayTeam = teams[awayTeamId];
  const tossWonByTeam = teams[md.Tosswonby];
  const firstInn = innings[0]; const battingTeamId = firstInn?.Battingteam; const bowlingTeamId = firstInn?.Bowlingteam;
  const battingTeam = teams[battingTeamId]; const bowlingTeam = teams[bowlingTeamId];
  const rr = firstInn?.Runrate || "0.00"; const batsmen = firstInn?.Batsmen || []; const bowlers = firstInn?.Bowlers || [];
  const allotted = firstInn?.AllottedOvers || "20"; const overs = firstInn?.Overs || "0";
  const currentBowler = (firstInn?.Bowlers || []).find(b => b.Isbowlingnow);
  const thisOverArr = currentBowler?.ThisOver || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Activity size={13} className="text-purple-400" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{seriesInfo.Series_short_display_name || "WT20 WC 2026"}</span>
          {isLive && <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Live {countdown}s</span>}
          {isComplete && !isLive && <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">✓ Completed</span>}
        </div>
        <button onClick={() => load()} className={`text-gray-600 hover:text-purple-400 transition-all ${refreshing ? "animate-spin" : ""}`}><RefreshCw size={12} /></button>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 bg-white/[0.01]">
          <p className="text-[10px] text-gray-400">📍 {venue.Name}</p>
          {tossWonByTeam && <p className="text-[9px] text-gray-600 mt-0.5 italic">🪙 {tossWonByTeam.Name_Short} elected to {md.Toss_elected_to}</p>}
        </div>
        <div className="p-3 space-y-2">
          {[{ id: homeTeamId, team: homeTeam }, { id: awayTeamId, team: awayTeam }].map(({ id, team }) => {
            const meta = getIccTeam(team?.Name_Short || ""); const isBatting = id === battingTeamId && isLive;
            const myInnings = innings.find(inn => inn.Battingteam === id); const hasScore = myInnings?.Total !== undefined && myInnings?.Total !== "";
            return (
              <div key={id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all"
                style={{ background: isBatting ? `${meta.primary}15` : "rgba(255,255,255,0.02)", borderColor: isBatting ? `${meta.primary}40` : "rgba(255,255,255,0.05)" }}>
                <span className="text-2xl shrink-0">{meta.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5"><span className="text-sm font-black text-white">{team?.Name_Short || "—"}</span>
                    {isBatting && <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(245,166,35,0.2)", color: "#f5a623" }}>Batting</span>}
                  </div>
                  <p className="text-[9px] text-gray-600">{team?.Name_Full || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  {hasScore ? <><span className="text-xl font-black text-white">{myInnings.Total}/{myInnings.Wickets}</span><p className="text-[9px] text-gray-600">({myInnings.Overs}/{myInnings.AllottedOvers} ov)</p></>
                    : <span className="text-[10px] text-gray-700 font-bold uppercase">Yet to bat</span>}
                </div>
              </div>
            );
          })}
        </div>
        {isLive && firstInn && (
          <>
            <div className="px-4 py-3 border-t border-white/5 flex gap-4 flex-wrap bg-white/[0.01]">
              {parseFloat(rr) > 0 && <div><span className="text-[8px] font-black text-gray-700 uppercase block">CRR</span><span className="text-sm font-black text-green-400">{parseFloat(rr).toFixed(2)}</span></div>}
              <div><span className="text-[8px] font-black text-gray-700 uppercase block">Overs</span><span className="text-sm font-black text-white">{overs}/{allotted}</span></div>
            </div>
            {thisOverArr.length > 0 && (
              <div className="px-4 py-3 border-t border-white/5" style={{ background: "rgba(139,92,246,0.03)" }}>
                <div className="flex items-center gap-3">
                  <div className="shrink-0"><span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-1">This Over</span><span className="text-[11px] font-black text-white">{currentBowler?.Overs || overs}</span></div>
                  <div className="w-px h-8 bg-white/5 shrink-0" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {thisOverArr.map((ball, i) => {
                      const runs = String(ball.B ?? ""); const type = String(ball.T ?? "").toLowerCase();
                      let label = runs === "0" ? "·" : runs;
                      if (type === "wk" || type === "w") label = "W";
                      else if (type === "wd") label = "WD";
                      else if (type === "nb") label = `${runs}nb`;
                      return <BallChip key={i} label={label} />;
                    })}
                    {Array.from({ length: Math.max(0, 6 - thisOverArr.length) }).map((_, i) => (
                      <span key={`e-${i}`} className="flex items-center justify-center rounded-full shrink-0"
                        style={{ width: 30, height: 30, background: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(255,255,255,0.08)" }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {md.Status && (
  <div className="px-4 py-2.5 border-t border-white/5" style={{ background: isComplete && !isLive ? "rgba(74,222,128,0.03)" : "transparent" }}>
    {isComplete && !isLive && (
      <div className="flex items-center justify-center gap-2 mb-1">
        <Trophy size={12} className="text-amber-400" />
        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Result</span>
      </div>
    )}
    <p className="text-[11px] text-center font-black" style={{ color: isLive ? "#f59e0b" : "#4ade80" }}>{md.Status}</p>
  </div>
)}
      </div>
      <div className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="flex border-b border-white/5">
          {[{ k: "batting", l: `${battingTeam?.Name_Short || "BAT"} Bat` }, { k: "bowling", l: `${bowlingTeam?.Name_Short || "BOWL"} Bowl` }].map(t => (
            <button key={t.k} onClick={() => setActiveTab(t.k)} className="flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-b-2"
              style={{ color: activeTab === t.k ? "#8b5cf6" : "#4b5563", borderBottomColor: activeTab === t.k ? "#8b5cf6" : "transparent", background: "transparent" }}>{t.l}</button>
          ))}
        </div>
        <div className="min-h-[200px]">
          {activeTab === "batting" && <Wt20BattingCard batsmen={batsmen} teams={teams} battingTeamId={battingTeamId} bowlingTeamId={bowlingTeamId} />}
          {activeTab === "bowling" && <Wt20BowlingCard bowlers={bowlers} bowlingTeamId={bowlingTeamId} teams={teams} />}
        </div>
      </div>
      {lastUpdate && <p className="text-[8px] text-gray-700 text-center italic">Updated {lastUpdate.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})} IST · refreshes every 30s</p>}
    </div>
  );
}

// ─── WT20 SCHEDULE ────────────────────────────────────────────────────────────
function Wt20Schedule({ onSelectMatch, activeMatchId }) {
  const [matches, setMatches] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch(`${API_BASE}/api/wt20/schedule?series_ids=${WT20_SERIES_ID}&game_count=10`); if (!res.ok) throw new Error(`HTTP ${res.status}`); const json = await res.json(); setMatches(json.data?.matches || []); setError(null); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(139,92,246,0.2)", borderTopColor: "#8b5cf6" }} /></div>;
  if (error) return <div className="text-center py-10 space-y-3"><AlertCircle size={24} className="text-red-500/50 mx-auto" /><p className="text-[11px] text-gray-600">{error}</p><button onClick={load} className="px-4 py-2 rounded-xl border text-[10px] font-bold" style={{ borderColor: "rgba(139,92,246,0.3)", color: "#8b5cf6" }}>Retry</button></div>;
  const sections = [
    { label: "🔴 Live Now", items: matches.filter(m => m.live) },
    { label: "📅 Upcoming", items: matches.filter(m => m.upcoming) },
    { label: "✅ Recent",   items: matches.filter(m => m.recent && !m.live) },
  ].filter(s => s.items.length > 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Calendar size={13} className="text-purple-400" /><span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">WT20 WC Schedule</span></div>
      {sections.map(({ label, items }) => (
        <div key={label}>
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-2">
            {items.map(match => {
              const homeShort = match.teama_short || "—"; const awayShort = match.teamb_short || "—";
              const homeMeta = getIccTeam(homeShort); const awayMeta = getIccTeam(awayShort);
              const isActive = match.match_id === activeMatchId; const isLive = match.live; const score = match.scores?.[0];
              return (
                <button key={match.match_id} onClick={() => onSelectMatch(match.match_id)}
                  className="w-full text-left rounded-2xl border transition-all duration-200 overflow-hidden active:scale-[0.98]"
                  style={{ background: isActive ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.02)", borderColor: isActive ? "rgba(139,92,246,0.35)" : isLive ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)", boxShadow: isActive ? "0 0 20px rgba(139,92,246,0.15)" : "none" }}>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{match.match_number} · {match.group ? `Group ${match.group}` : match.stage}</span>
                        {isLive && <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-red-400 animate-pulse inline-block" />Live</span>}
                      </div>
                      <span className="text-[9px] text-gray-600 font-bold">{match.match_time_ist} IST</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0"><span className="text-xl shrink-0">{homeMeta.flag}</span><div className="min-w-0"><span className="text-sm font-black text-white">{homeShort}</span><p className="text-[8px] text-gray-600 truncate">{match.teama_display_name}</p></div></div>
                      <div className="shrink-0 text-center px-2">{score ? <div className="text-center"><span className="text-xs font-black text-white">{score.team_runs}/{score.team_wickets}</span><p className="text-[8px] text-gray-600">({score.team_overs} ov)</p></div> : <span className="text-[10px] font-black text-gray-700">vs</span>}</div>
                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0"><div className="min-w-0 text-right"><span className="text-sm font-black text-white">{awayShort}</span><p className="text-[8px] text-gray-600 truncate">{match.teamb_display_name}</p></div><span className="text-xl shrink-0">{awayMeta.flag}</span></div>
                    </div>
                    <p className="text-[8px] text-gray-700 mt-1.5">📍 {match.venue}{isActive && <span className="float-right text-[8px] font-black" style={{ color: "#8b5cf6" }}>● SELECTED</span>}</p>
                    {match.match_result && <p className="text-[9px] text-green-400 font-bold mt-0.5">{match.match_result}</p>}
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

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SMART CRICKET PANEL ──────────────────────────────────────────────────────
// Priority: India Men's LIVE > WT20 LIVE > WT20 recent/upcoming > India upcoming
// ═══════════════════════════════════════════════════════════════════════════════
function SmartCricketPanel() {
  const [indiaLive, setIndiaLive]       = useState([]);
  const [indiaUpcoming, setIndiaUpcoming] = useState([]);
  const [loadingIndia, setLoadingIndia]   = useState(true);
  const [bcciCountdown, setBcciCountdown] = useState(60);
  const [bcciLastUpdate, setBcciLastUpdate] = useState(null);
  const [bcciRefreshing, setBcciRefreshing] = useState(false);
  const [wt20Matches, setWt20Matches]     = useState([]);
  const [mode, setMode]                   = useState(null);
  const [manualMode, setManualMode]       = useState(null);
  const [selectedIndia, setSelectedIndia] = useState(null);
  const [selectedWt20Id, setSelectedWt20Id] = useState(null);
  const [subPanel, setSubPanel]           = useState("scores");
  const [indiaRecent, setIndiaRecent] = useState([]);

  const loadIndia = useCallback(async (silent = false) => {
    if (!silent) setLoadingIndia(true);
    setBcciRefreshing(true);
    try {
      const [liveRes, upRes] = await Promise.all([
        fetch(`${API_BASE}/api/bcci/live`),
        fetch(`${API_BASE}/api/bcci/upcoming`),
      ]);
      const recentRes = await fetch(`${API_BASE}/api/bcci/recent`);
if (recentRes.ok) {
  const recentJson = await recentRes.json();
  const recent = (recentJson.recentMatches || recentJson.postMatches || []).filter(isIndiaMensMatch);
  setIndiaRecent(recent);
}
      const [liveJson, upJson] = await Promise.all([liveRes.json(), upRes.json()]);
      const live     = (liveJson.liveMatches || []).filter(isIndiaMensMatch);
      const upcoming = (upJson.upcomingMatches || []).filter(isIndiaMensMatch);
      setIndiaLive(live); setIndiaUpcoming(upcoming);
      setBcciLastUpdate(new Date()); setBcciCountdown(60);
    } catch {}
    finally { setLoadingIndia(false); setBcciRefreshing(false); }
  }, []);

  const loadWt20 = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/wt20/schedule?series_ids=${WT20_SERIES_ID}&game_count=10`);
      if (!res.ok) return;
      const json = await res.json();
      setWt20Matches(json.data?.matches || []);
    } catch {}
  }, []);

  useEffect(() => { loadIndia(); const t = setInterval(() => loadIndia(true), 60000); return () => clearInterval(t); }, []);
  useEffect(() => { loadWt20();  const t = setInterval(() => loadWt20(), 60000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setBcciCountdown(c => c <= 1 ? 60 : c - 1), 1000); return () => clearInterval(t); }, [bcciLastUpdate]);

  // Auto-select logic
  // Replace this useEffect:
useEffect(() => {
  if (manualMode) return;
  if (indiaLive.length > 0) {
    setMode("india");
    setSelectedIndia(prev => indiaLive.find(m => m.MatchID === prev?.MatchID) || indiaLive[0]);
  } else {
    const wt20Live = wt20Matches.filter(m => m.live);
    if (wt20Live.length > 0) {
      setMode("wt20");
      setSelectedWt20Id(prev => wt20Live.find(m => m.match_id === prev) ? prev : wt20Live[0].match_id);
    } else {
      const wt20Upcoming = wt20Matches.filter(m => m.upcoming || m.recent);
      if (wt20Upcoming.length > 0 && mode !== "india") {
        setMode("wt20");
        if (!selectedWt20Id) setSelectedWt20Id(wt20Upcoming[0].match_id);
      } else if (indiaUpcoming.length > 0) {
        if (mode !== "wt20") setMode("india");
        if (!selectedIndia && indiaRecent.length > 0 && mode === "india") {
  setSelectedIndia(indiaRecent[0]);
}
      }
    }
  }
}, [indiaLive, indiaUpcoming, wt20Matches]);

// WITH THIS:
useEffect(() => {
  if (manualMode) return;

  // ── India live always wins priority ──────────────────────────────────────
  if (indiaLive.length > 0) {
    setMode("india");
    setSelectedIndia(prev =>
      indiaLive.find(m => m.MatchID === prev?.MatchID) || indiaLive[0]
    );
    return;
  }

  // ── WT20 logic: live > most recent finished > next upcoming ──────────────
  if (wt20Matches.length > 0) {
    const wt20Live    = wt20Matches.filter(m => m.live);
    const wt20Recent  = wt20Matches.filter(m => m.recent && !m.live);
    const wt20Upcoming = wt20Matches.filter(m => m.upcoming);

    // Pick the best match to show
    // Priority: live → most recent finished → next upcoming
    let bestId = null;
    if (wt20Live.length > 0) {
      // If currently selected is also live, keep it; otherwise pick first live
      const stillLive = wt20Live.find(m => m.match_id === selectedWt20Id);
      bestId = stillLive ? selectedWt20Id : wt20Live[0].match_id;
    } else if (wt20Recent.length > 0) {
      // Show most recent finished result, UNLESS user has manually picked something
      bestId = wt20Recent[0].match_id;  // always default to most recent finished
    } else if (wt20Upcoming.length > 0) {
      bestId = selectedWt20Id || wt20Upcoming[0].match_id;
    }

    if (bestId) {
      setMode("wt20");
      setSelectedWt20Id(bestId);
    }
    return;
  }

  // ── Fallback: India upcoming ──────────────────────────────────────────────
  if (indiaUpcoming.length > 0) {
    setMode("india");
    setSelectedIndia(prev =>
      indiaUpcoming.find(m => m.MatchID === prev?.MatchID) || indiaUpcoming[0]
    );
  }
}, [indiaLive, indiaUpcoming, wt20Matches, manualMode]);

  const hasIndiaLive = indiaLive.length > 0;
  const hasWt20Live  = wt20Matches.some(m => m.live);
  const activeMode   = manualMode || mode || "wt20";

  const modeTabs = [
    { k: "india", l: "🇮🇳 India", live: hasIndiaLive },
    { k: "wt20",  l: "♀ WT20 WC", live: hasWt20Live  },
  ];

  return (
    <div className="space-y-3">
      {/* Priority banner */}
      {hasIndiaLive && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <PulsingDot color="#f59e0b" />
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">🇮🇳 India live</span>
          <span className="ml-auto text-[8px] text-gray-600 font-mono">{bcciCountdown}s</span>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1.5">
        {modeTabs.map(({ k, l, live }) => (
          <button key={k}
            onClick={() => { setManualMode(k); setMode(k); setSubPanel("scores"); }}
            className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5"
            style={{
              background: activeMode === k ? (k === "india" ? "rgba(245,158,11,0.1)" : "rgba(139,92,246,0.1)") : "rgba(255,255,255,0.02)",
              borderColor: activeMode === k ? (k === "india" ? "rgba(245,158,11,0.3)" : "rgba(139,92,246,0.3)") : "rgba(255,255,255,0.06)",
              color: activeMode === k ? (k === "india" ? "#f59e0b" : "#8b5cf6") : "#6b7280",
            }}>
            {l}
            {live && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: k === "india" ? "#f59e0b" : "#ef4444" }} />}
          </button>
        ))}
        {manualMode && (
          <button onClick={() => setManualMode(null)}
            className="px-2.5 py-2 rounded-xl text-[8px] font-black uppercase border"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)", color: "#4b5563" }}>Auto</button>
        )}
      </div>

      {/* ── INDIA VIEW ── */}
      {activeMode === "india" && (
        <div className="space-y-3">
          <div className="flex gap-1">
            {[{ k: "scores", l: "Scorecard" }, { k: "schedule", l: "Fixtures" }].map(({ k, l }) => (
              <button key={k} onClick={() => setSubPanel(k)}
                className="flex-1 py-1.5 rounded-xl text-[8px] font-black uppercase border transition-all"
                style={{ background: subPanel === k ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)", borderColor: subPanel === k ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)", color: subPanel === k ? "#f59e0b" : "#4b5563" }}>{l}</button>
            ))}
          </div>

{subPanel === "scores" && (
  <>
    {/* India match selector — live + recent finished + upcoming */}
    {(indiaLive.length > 0 || indiaUpcoming.length > 0) && (
      <div className="space-y-1.5 mb-2">
        {/* Live matches */}
        {indiaLive.map(m => {
          const fmtC = bcciFmtColors(m.MatchType);
          const isSelected = selectedIndia?.MatchID === m.MatchID;
          const inn1 = m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]}` : null;
          const inn2 = m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]}` : null;
          return (
            <button key={m.MatchID} onClick={() => setSelectedIndia(m)}
              className="w-full text-left rounded-2xl border overflow-hidden transition-all active:scale-[0.98]"
              style={{
                background: isSelected ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.03)",
                borderColor: isSelected ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.2)",
                boxShadow: isSelected ? "0 0 14px rgba(239,68,68,0.12)" : "none",
              }}>
              <div className="px-3 py-2.5 flex items-center gap-2">
                <span className="flex items-center gap-1 bg-red-500/15 text-red-400 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0">
                  <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse inline-block" />Live
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white truncate">{m.HomeTeamName} vs {m.AwayTeamName}</p>
                  {m.CurrentStrikerName && <p className="text-[8px] text-amber-400">★ {m.CurrentStrikerName} {m.StrikerRuns}({m.StrikerBalls})</p>}
                </div>
                <div className="text-right shrink-0">
                  {inn2
                    ? <div><p className="text-[8px] text-gray-500">{m.FirstBattingTeamCode} {inn1}</p><p className="text-[10px] font-black text-white">{m.SecondBattingTeamCode} {inn2}</p></div>
                    : inn1 ? <p className="text-[10px] font-black text-white">{inn1} <span className="text-[8px] text-gray-600">({m["1FallOvers"]} ov)</span></p>
                    : null}
                </div>
                {isSelected && <span className="text-[8px] font-black text-red-400 shrink-0">●</span>}
              </div>
            </button>
          );
        })}

        {/* Between live matches and upcoming matches, add: */}

{/* Recently finished */}
{indiaRecent.slice(0, 2).map(m => {
  const fmtC = bcciFmtColors(m.MatchType);
  const isSelected = selectedIndia?.MatchID === m.MatchID;
  // Parse result from Comments field: "India Won by 7 Wickets"
  const resultText = m.Comments || m.Commentss || "";
  const inn1 = m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]}` : null;
  const inn2 = m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]}` : null;
  return (
    <button key={m.MatchID} onClick={() => setSelectedIndia(m)}
      className="w-full text-left rounded-2xl border overflow-hidden transition-all active:scale-[0.98]"
      style={{
        background: isSelected ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.02)",
        borderColor: isSelected ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.06)",
        boxShadow: isSelected ? "0 0 14px rgba(74,222,128,0.1)" : "none",
      }}>
      <div className="px-3 py-2.5 flex items-center gap-2">
        <span className="text-[7px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full shrink-0">FT</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-white truncate">{m.HomeTeamName} vs {m.AwayTeamName}</p>
          {resultText
            ? <p className="text-[8px] font-black" style={{ color: "#4ade80" }}>{resultText.trim()}</p>
            : <p className="text-[8px] text-gray-600">{m.MatchOrder} · {bcciFmtDate(m.MatchDate)}</p>
          }
        </div>
        <div className="text-right shrink-0">
          {inn1 && <p className="text-[9px] text-gray-500">{m.FirstBattingTeamCode} {inn1}</p>}
          {inn2 && <p className="text-[10px] font-black text-white">{m.SecondBattingTeamCode} {inn2}</p>}
        </div>
        {isSelected && <span className="text-[8px] font-black text-emerald-400 shrink-0">●</span>}
      </div>
    </button>
  );
})}

        {/* Upcoming matches */}
        {indiaUpcoming.slice(0, 3).map(m => {
          const fmtC = bcciFmtColors(m.MatchType);
          const isSelected = selectedIndia?.MatchID === m.MatchID;
          return (
            <button key={m.MatchID} onClick={() => setSelectedIndia(m)}
              className="w-full text-left rounded-2xl border overflow-hidden transition-all active:scale-[0.98]"
              style={{
                background: isSelected ? `${fmtC.color}08` : "rgba(255,255,255,0.02)",
                borderColor: isSelected ? fmtC.border : "rgba(255,255,255,0.06)",
                boxShadow: isSelected ? `0 0 14px ${fmtC.color}15` : "none",
              }}>
              <div className="px-3 py-2.5 flex items-center gap-2">
                <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: fmtC.bg, color: fmtC.color, border: `1px solid ${fmtC.border}` }}>
                  {bcciFmt(m.MatchType)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white truncate">{m.HomeTeamName} vs {m.AwayTeamName}</p>
                  <p className="text-[8px] text-gray-600">{m.MatchOrder} · {bcciFmtDate(m.MatchDate)} {m.CustomMatchTime || m.MatchTime} IST</p>
                </div>
                {isSelected && <span className="text-[8px] font-black shrink-0" style={{ color: fmtC.color }}>●</span>}
              </div>
            </button>
          );
        })}
      </div>
    )}

    {/* Scorecard */}
    {selectedIndia
      ? <div className="pt-2 border-t border-white/5"><BcciScorecard match={selectedIndia} /></div>
      : !loadingIndia && <div className="text-center py-10"><p className="text-[11px] text-gray-700">No India matches right now</p></div>
    }
  </>
)}

          {subPanel === "schedule" && (
            <div className="space-y-2">
              {[...indiaLive, ...indiaUpcoming].map(m => {
                const fmtC = bcciFmtColors(m.MatchType);
                const isLive = indiaLive.some(l => l.MatchID === m.MatchID);
                return (
                  <button key={m.MatchID} onClick={() => { setSelectedIndia(m); setSubPanel("scores"); }}
                    className="w-full text-left rounded-2xl border overflow-hidden transition-all"
                    style={{ background: isLive ? "rgba(239,68,68,0.03)" : "rgba(255,255,255,0.02)", borderColor: isLive ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)" }}>
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded" style={{ background: fmtC.bg, color: fmtC.color }}>{bcciFmt(m.MatchType)}</span>
                        <span className="text-[8px] text-gray-600">{m.MatchOrder}</span>
                        {isLive && <span className="flex items-center gap-1 text-red-400 text-[8px] font-black"><span className="w-1 h-1 rounded-full bg-red-400 animate-pulse inline-block" />Live</span>}
                        <span className="ml-auto text-[8px] text-gray-600">{bcciFmtDate(m.MatchDate)}</span>
                      </div>
                      <p className="text-[11px] font-black text-white mt-1">{m.HomeTeamName} vs {m.AwayTeamName}</p>
                      <p className="text-[8px] text-gray-700 mt-0.5">📍 {m.GroundName}{m.city ? `, ${m.city}` : ""}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── WT20 VIEW ── */}
      {activeMode === "wt20" && (
        <div className="space-y-3">
          <div className="flex gap-1">
            {[{ k: "scores", l: "Scorecard" }, { k: "schedule", l: "Schedule" }].map(({ k, l }) => (
              <button key={k} onClick={() => setSubPanel(k)}
                className="flex-1 py-1.5 rounded-xl text-[8px] font-black uppercase border transition-all"
                style={{ background: subPanel === k ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.02)", borderColor: subPanel === k ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)", color: subPanel === k ? "#8b5cf6" : "#4b5563" }}>{l}</button>
            ))}
          </div>

          {subPanel === "scores" && (
            <>
              {/* Match selector strip — live first, then recent, then upcoming */}
              {wt20Matches.length > 0 && (
                <div className="space-y-1.5">
                  {[
                    ...wt20Matches.filter(m => m.live),
                    ...wt20Matches.filter(m => m.recent && !m.live).slice(0, 2),
                    ...wt20Matches.filter(m => m.upcoming).slice(0, 2),
                  ].map(m => {
                    const homeShort = m.teama_short || "—";
                    const awayShort = m.teamb_short || "—";
                    const homeMeta  = getIccTeam(homeShort);
                    const awayMeta  = getIccTeam(awayShort);
                    const isSelected = m.match_id === selectedWt20Id;
                    const isLive     = m.live;
                    const isRecent   = m.recent && !m.live;
                    const score      = m.scores?.[0];
                    return (
                      <button key={m.match_id}
                        onClick={() => setSelectedWt20Id(m.match_id)}
                        className="w-full text-left rounded-2xl border overflow-hidden transition-all active:scale-[0.98]"
                        style={{
                          background: isSelected ? (isLive ? "rgba(239,68,68,0.08)" : "rgba(139,92,246,0.08)") : "rgba(255,255,255,0.02)",
                          borderColor: isSelected ? (isLive ? "rgba(239,68,68,0.3)" : "rgba(139,92,246,0.3)") : isLive ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)",
                          boxShadow: isSelected ? (isLive ? "0 0 14px rgba(239,68,68,0.12)" : "0 0 14px rgba(139,92,246,0.12)") : "none",
                        }}>
                        <div className="px-3 py-2.5 flex items-center gap-2">
                          <div className="shrink-0">
                            {isLive
                              ? <span className="flex items-center gap-1 bg-red-500/15 text-red-400 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-red-400 animate-pulse inline-block" />Live</span>
                              : isRecent
                                ? <span className="text-[7px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">FT</span>
                                : <span className="text-[7px] font-black text-gray-600 bg-white/5 px-1.5 py-0.5 rounded-full">Soon</span>
                            }
                          </div>
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span style={{ fontSize: 16, lineHeight: 1 }}>{homeMeta.flag}</span>
                            <span className="text-[11px] font-black text-white">{homeShort}</span>
                            <span className="text-[8px] text-gray-700">vs</span>
                            <span className="text-[11px] font-black text-white">{awayShort}</span>
                            <span style={{ fontSize: 16, lineHeight: 1 }}>{awayMeta.flag}</span>
                          </div>
                          <div className="shrink-0 text-right">
                            {score
                              ? <span className="text-[10px] font-black text-white">{score.team_runs}/{score.team_wickets}<span className="text-[8px] text-gray-600 ml-0.5">({score.team_overs})</span></span>
                              : <span className="text-[9px] text-gray-600">{m.match_time_ist} IST</span>
                            }
                          </div>
                          {isSelected && <span className="text-[8px] font-black shrink-0" style={{ color: isLive ? "#ef4444" : "#8b5cf6" }}>●</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Scorecard for selected match */}
              {selectedWt20Id
                ? <Wt20Scorecard matchId={selectedWt20Id} />
                : <div className="text-center py-10"><p className="text-[11px] text-gray-700">No match selected</p></div>
              }
            </>
          )}

          {subPanel === "schedule" && <Wt20Schedule activeMatchId={selectedWt20Id} onSelectMatch={(id) => { setSelectedWt20Id(id); setSubPanel("scores"); }} />}
        </div>
      )}

      {bcciLastUpdate && (
        <p className="text-[7px] text-gray-700 text-right italic">India: {bcciLastUpdate.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})} IST</p>
      )}
    </div>
  );
}

// ─── FIFA MATCH CARD ──────────────────────────────────────────────────────────
function FifaMatchCard({ match }) {
  const status = getFifaStatus(match);
  const hTeam = match.Home, aTeam = match.Away;
  const hName = fifaTeamName(hTeam), aName = fifaTeamName(aTeam);
  const group = fifaGroupName(match); const city = fifaCity(match); const stadium = fifaStadium(match);
  const isLive = status === "live", isDone = status === "finished", isUp = status === "upcoming";
  const hWon = isDone && match.Winner === hTeam?.IdTeam;
  const aWon = isDone && match.Winner === aTeam?.IdTeam;
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: isLive ? "rgba(239,68,68,0.04)" : isDone ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.015)", borderColor: isLive ? "rgba(239,68,68,0.25)" : isDone ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.05)", boxShadow: isLive ? "0 0 20px rgba(239,68,68,0.08)" : "none" }}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">{group}</span>
          {match.MatchNumber && <span className="text-[8px] text-gray-700 font-bold">· #{match.MatchNumber}</span>}
        </div>
        {isLive && <span className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/25 text-red-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />{match.MatchTime || "Live"}</span>}
        {isDone && <span className="text-[8px] font-black text-green-500/70 uppercase">FT</span>}
        {isUp && <span className="text-[8px] font-bold text-gray-600">{fmtFifaTime(match.Date)} IST</span>}
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5"><img src={getFifaFlagUrl(hTeam?.IdCountry)} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}} /></div>
            <div className="min-w-0"><span className="text-[12px] font-black uppercase tracking-tight block" style={{ color: hWon ? "#4ade80" : isUp ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)" }}>{hTeam?.Abbreviation || hName}</span><span className="text-[8px] text-gray-600 block truncate">{hName}</span></div>
          </div>
          <div className="shrink-0 px-2 text-center">
            {isUp ? <span className="text-[11px] font-black text-gray-700">vs</span>
              : <div className="flex items-center gap-1"><span className="text-xl font-black leading-none" style={{ color: hWon ? "#4ade80" : "white" }}>{match.HomeTeamScore ?? "-"}</span><span className="text-[10px] text-gray-600 px-0.5">:</span><span className="text-xl font-black leading-none" style={{ color: aWon ? "#4ade80" : "white" }}>{match.AwayTeamScore ?? "-"}</span></div>}
          </div>
          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <div className="min-w-0 text-right"><span className="text-[12px] font-black uppercase tracking-tight block" style={{ color: aWon ? "#4ade80" : isUp ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)" }}>{aTeam?.Abbreviation || aName}</span><span className="text-[8px] text-gray-600 block truncate">{aName}</span></div>
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5"><img src={getFifaFlagUrl(aTeam?.IdCountry)} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}} /></div>
          </div>
        </div>
        {(city || stadium) && <p className="text-[8px] text-gray-700 mt-2">📍 {city}{stadium ? ` · ${stadium}` : ""}</p>}
        {isUp && <p className="text-[8px] text-gray-600 mt-0.5 font-bold uppercase">{fmtFifaDate(match.Date)}</p>}
      </div>
    </div>
  );
}

function FifaScoresPanel() {
  const [matches, setMatches] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false); const [lastUpdate, setLastUpdate] = useState(null); const [filter, setFilter] = useState("today");
  const fetchMatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); setRefreshing(true);
    try {
      const r = await fetch(`${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`, { headers: { "Accept": "application/json" } });
      if (!r.ok) throw new Error(`FIFA API ${r.status}`);
      const j = await r.json(); setMatches(j.Results || []); setLastUpdate(new Date()); setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchMatches(); const t = setInterval(() => fetchMatches(true), 30000); return () => clearInterval(t); }, [fetchMatches]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const live = matches.filter(m => getFifaStatus(m) === "live");
  const today = matches.filter(m => new Date(m.Date).toISOString().slice(0, 10) === todayStr);
  const upcoming = matches.filter(m => getFifaStatus(m) === "upcoming").sort((a, b) => new Date(a.Date) - new Date(b.Date)).slice(0, 12);
  const results = matches.filter(m => getFifaStatus(m) === "finished").sort((a, b) => new Date(b.Date) - new Date(a.Date)).slice(0, 10);
  const shown = filter === "live" ? live : filter === "today" ? today : filter === "upcoming" ? upcoming : results;
  const TABS = [{ k: "today", l: "Today", c: today.length }, { k: "live", l: "Live", c: live.length }, { k: "upcoming", l: "Next", c: null }, { k: "results", l: "Results", c: null }];
  if (loading) return <div className="flex flex-col items-center justify-center py-16 gap-4"><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(30,213,150,0.15)", borderTopColor: "#1ed596" }} /><p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Loading FIFA scores…</p></div>;
  if (error) return <div className="text-center py-12 space-y-3"><AlertCircle size={24} className="text-red-500/50 mx-auto" /><p className="text-[11px] text-gray-600">{error}</p><button onClick={() => fetchMatches()} className="px-4 py-2 rounded-xl border text-[10px] font-bold" style={{ borderColor: "rgba(30,213,150,0.3)", color: "#1ed596" }}>Retry</button></div>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Globe size={14} style={{ color: "#1ed596" }} /><span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">FIFA WC 2026™</span>
          {live.length > 0 && <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/25 text-red-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-red-400 animate-pulse inline-block" />{live.length} Live</span>}
        </div>
        <button onClick={() => fetchMatches()} className={`text-gray-600 hover:text-green-400 ${refreshing ? "animate-spin" : ""}`}><RefreshCw size={12} /></button>
      </div>
      <div className="flex gap-1.5">
        {TABS.map(({ k, l, c }) => (
          <button key={k} onClick={() => setFilter(k)} className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase border flex items-center justify-center gap-1 transition-all"
            style={{ background: filter === k ? "rgba(30,213,150,0.1)" : "rgba(255,255,255,0.02)", borderColor: filter === k ? "rgba(30,213,150,0.3)" : "rgba(255,255,255,0.06)", color: filter === k ? "#1ed596" : "#6b7280" }}>
            {l}{c != null && c > 0 && <span className="text-[7px] rounded-full px-1 font-black" style={{ background: "rgba(30,213,150,0.2)", color: "#1ed596" }}>{c}</span>}
          </button>
        ))}
      </div>
      {shown.length === 0 ? <div className="text-center py-10"><p className="text-[11px] text-gray-700">No matches found</p></div>
        : <div className="space-y-2">{shown.map(m => <FifaMatchCard key={m.IdMatch} match={m} />)}</div>}
      {lastUpdate && <p className="text-[8px] text-gray-700 text-center italic">Updated {lastUpdate.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})} IST · Refreshes every 30s</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function LiveCricketTV() {
  const [sportTab, setSportTab] = useState("cricket");
  const [footballPanel, setFootballPanel] = useState("scores");
  const ambientColor = sportTab === "cricket" ? "rgba(245,158,11,0.15)" : "rgba(30,213,150,0.18)";

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
        style={{ background: `radial-gradient(ellipse 60% 35% at 50% 0%, ${ambientColor} 0%, transparent 65%)` }} />

      <header className="relative z-10 h-14 flex items-center px-4 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/watch" className="p-1.5 hover:bg-white/5 rounded-full transition-colors"><ArrowLeft size={17} className="text-gray-400" /></Link>
            <Link to="/"><img src="/logo_39.png" className="h-6" alt="logo" /></Link>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-2xl p-1 border border-white/[0.07]">
            <button onClick={() => setSportTab("cricket")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              style={{ background: sportTab === "cricket" ? "rgba(245,158,11,0.15)" : "transparent", color: sportTab === "cricket" ? "#f59e0b" : "#6b7280", boxShadow: sportTab === "cricket" ? "0 0 12px rgba(245,158,11,0.2)" : "none" }}>
              🏏 Cricket
            </button>
            <button onClick={() => setSportTab("football")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              style={{ background: sportTab === "football" ? "rgba(30,213,150,0.15)" : "transparent", color: sportTab === "football" ? "#1ed596" : "#6b7280", boxShadow: sportTab === "football" ? "0 0 12px rgba(30,213,150,0.2)" : "none" }}>
              ⚽ Football
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1.5 rounded-full border"
            style={{ color: sportTab === "cricket" ? "#f59e0b" : "#1ed596", borderColor: sportTab === "cricket" ? "rgba(245,158,11,0.25)" : "rgba(30,213,150,0.25)", background: sportTab === "cricket" ? "rgba(245,158,11,0.06)" : "rgba(30,213,150,0.06)" }}>
            <Signal size={8} />Live
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-5 pb-24">
        {sportTab === "cricket" && (
          <>
            <div className="mb-5">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-0.5">🏏 Live Cricket</p>
              <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">Cricket <span style={{ color: "#f59e0b" }}>Live TV</span></h1>
              <p className="text-[11px] text-gray-600 mt-1">India ODI · ICC Women's T20 WC · Star Sports</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0"><SportSection channels={CRICKET_CHANNELS} /></div>
              <div className="w-full lg:w-[340px] shrink-0"><SmartCricketPanel /></div>
            </div>
          </>
        )}
        {sportTab === "football" && (
          <>
            <div className="mb-5">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-0.5">⚽ FIFA World Cup 2026™</p>
              <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">Football <span style={{ color: "#1ed596" }}>Live TV</span></h1>
              <p className="text-[11px] text-gray-600 mt-1">USA · Canada · Mexico · June–July 2026</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0"><SportSection channels={FOOTBALL_CHANNELS} /></div>
              <div className="w-full lg:w-[320px] shrink-0">
                <div className="flex gap-1 mb-4">
                  {[{ k: "scores", l: "⚽ Scores" }, { k: "upcoming", l: "Fixtures" }].map(({ k, l }) => (
                    <button key={k} onClick={() => setFootballPanel(k)} className="flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all"
                      style={{ background: footballPanel === k ? "rgba(30,213,150,0.1)" : "rgba(255,255,255,0.02)", borderColor: footballPanel === k ? "rgba(30,213,150,0.3)" : "rgba(255,255,255,0.06)", color: footballPanel === k ? "#1ed596" : "#6b7280" }}>{l}</button>
                  ))}
                </div>
                <FifaScoresPanel />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
