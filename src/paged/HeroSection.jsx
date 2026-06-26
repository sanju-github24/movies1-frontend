import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FIFA_API_BASE    = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION = "17";
const FIFA_SEASON      = "285023";
const FIFA_STAGE       = "289273";
const WT20_SERIES_ID   = "12672";
const API_BASE         = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";

// ─── THUMBNAIL RESOLVER ───────────────────────────────────────────────────────
const IND_VS_IRE_IMG = "https://images.slivcdn.com/videoasset_images/manage_file/1000019970/178238619430072_IRE_vs_IND_Vaibhav_India_Debut_masthead_large_v3_3200x1800.jpg?h=auto&w=1712&q=eco";

function resolveThumbnail(slide) {
  if (slide.sport === "football") return "/fifa_2026.webp";
  const codes = [(slide.home.code || "").toUpperCase(), (slide.away.code || "").toUpperCase()];
  const names = [(slide.home.name || "").toUpperCase(), (slide.away.name || "").toUpperCase()];
  const hasIND = codes.some(c => c === "IND" || c === "INDIA") || names.some(n => n.includes("INDIA"));
  const hasAFG = codes.some(c => c === "AFG" || c === "AFGHANISTAN") || names.some(n => n.includes("AFGHANISTAN"));
  const hasIRE = codes.some(c => c === "IRE" || c === "IRELAND") || names.some(n => n.includes("IRELAND"));
  if (hasIND && hasIRE) return IND_VS_IRE_IMG;
  if (hasIND && hasAFG) return "/india-vs-afg.avif";
  return "/women_t20.jpg";
}

// ─── BCCI HELPERS ─────────────────────────────────────────────────────────────
const BCCI_WOMENS_COMP_IDS = new Set([238]);
function isIndiaMensMatch(m) { return !BCCI_WOMENS_COMP_IDS.has(Number(m.CompetitionID)); }
const BCCI_FORMAT_LABEL = { "One Day D/N":"ODI","One Day":"ODI","T20":"T20I","Test":"Test","Test D/N":"Test" };
function bcciFmt(type) { return BCCI_FORMAT_LABEL[type] || type || "MATCH"; }
function bcciFmtDate(s) {
  try { return new Date(s).toLocaleDateString("en-IN",{day:"numeric",month:"short",timeZone:"Asia/Kolkata"}); }
  catch { return s; }
}
function bcciFmtTime(s) {
  if (!s) return "";
  if (s.includes("AM") || s.includes("PM")) return s;
  try { const [h,m]=s.split(":").map(Number); return `${((h%12)||12)}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`; }
  catch { return s; }
}
// Countdown label in the BCCI style: "4 HOURS TO GO" / "2 DAYS TO GO"
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

// ─── FIFA / ICC HELPERS ───────────────────────────────────────────────────────
const ICC_FLAGS = {
  ENG:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",SL:"🇱🇰",AUS:"🇦🇺",IND:"🇮🇳",AFG:"🇦🇫",SA:"🇿🇦",
  PAK:"🇵🇰",NZ:"🇳🇿",WI:"🏴",SCO:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",IRE:"🇮🇪",BAN:"🇧🇩",NED:"🇳🇱",
};
function getFifaFlagUrl(c) { return `https://api.fifa.com/api/v3/picture/flags-sq-1/${c}`; }
function fifaAbbr(t) { return t?.Abbreviation||t?.TeamName?.find(x=>x.Locale==="en-GB")?.Description||""; }
function fmtIST(d) {
  try { return new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"}); }
  catch { return ""; }
}
function fmtDateIST(d) {
  try { return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",timeZone:"Asia/Kolkata"}); }
  catch { return ""; }
}
function fifaGroupName(m) { return m.GroupName?.find(x=>x.Locale==="en-GB")?.Description||""; }
function fifaCityStadium(m) {
  const city=m.Stadium?.CityName?.find(x=>x.Locale==="en-GB")?.Description||"";
  const std=m.Stadium?.Name?.find(x=>x.Locale==="en-GB")?.Description||"";
  return city?`${city}${std?` · ${std}`:""}`:std;
}

// ─── SIDE BUILDER ─────────────────────────────────────────────────────────────
// Bundles code + display name + logo + score + overs into ONE object per team,
// so a logo can never get attached to the wrong code/score again.
function buildSide({ code, name, logo, score, overs }) {
  return {
    code: code || "—",
    name: name || code || "—",
    logo: logo || null,
    score: score || null,
    overs: overs || null,
  };
}

// ─── CACHE ────────────────────────────────────────────────────────────────────
const _cache={};
function getCached(k){const e=_cache[k];return(e&&Date.now()-e.ts<600000)?e.data:null;}
function setCache(k,d){_cache[k]={data:d,ts:Date.now()};}

// ─── PULSING DOT ──────────────────────────────────────────────────────────────
function PulsingDot({color="#ef4444",size=8}){
  return(
    <span className="relative flex shrink-0" style={{width:size,height:size}}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{background:color}}/>
      <span className="relative inline-flex rounded-full h-full w-full" style={{background:color}}/>
    </span>
  );
}

// ─── TEAM BADGE (circular, BCCI-style) ────────────────────────────────────────
// Tracks image-load failure in state and falls back to the flag glyph,
// instead of hiding a broken <img> and leaving an empty/invisible box.
function TeamBadge({ team, size = "clamp(20px,4.5vw,40px)" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasLogo = !!team.logo && !imgFailed;
  const flag = ICC_FLAGS[team.code] || "🏏";
  return hasLogo ? (
    <div
      className="rounded-full overflow-hidden bg-white/5 border border-white/15 shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <img
        src={team.logo}
        alt=""
        className="w-full h-full object-contain"
        style={{ padding: "12%" }}
        onError={() => setImgFailed(true)}
      />
    </div>
  ) : (
    <span style={{ fontSize: size, lineHeight: 1, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))", flexShrink: 0 }}>
      {flag}
    </span>
  );
}

function FootballTeamBadge({ team, size = "clamp(28px,5vw,48px)" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasLogo = !!team.logo && !imgFailed;
  return hasLogo ? (
    <div className="rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/5" style={{ width: size, height: size }}>
      <img src={team.logo} alt="" className="w-full h-full object-cover" onError={() => setImgFailed(true)}/>
    </div>
  ) : (
    <div className="rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/5 flex items-center justify-center" style={{ width: size, height: size }}>
      <span style={{ fontSize: "60%" }}>🌍</span>
    </div>
  );
}

// ─── BACKGROUNDS ─────────────────────────────────────────────────────────────
function CricketHeroBg({ away }){
  const aFlag = ICC_FLAGS[away.code] || "🏏";
  return(
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 opacity-[0.035]" style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.5) 39px,rgba(255,255,255,0.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.5) 39px,rgba(255,255,255,0.5) 40px)"}}/>
      <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 opacity-[0.10]">
        <span style={{fontSize:"clamp(80px,16vw,200px)",lineHeight:1,filter:"blur(3px)"}}>{aFlag}</span>
      </div>
      <div className="absolute" style={{top:"-40%",right:"-10%",width:"70%",height:"200%",background:"conic-gradient(from 200deg at 60% 50%,transparent 0deg,rgba(139,92,246,0.07) 30deg,transparent 60deg)",animation:"heroSlowSpin 20s linear infinite"}}/>
    </div>
  );
}
function FootballHeroBg(){
  return(
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 opacity-[0.025]" style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(255,255,255,1) 49px,rgba(255,255,255,1) 50px)"}}/>
      <div className="absolute" style={{top:"-50%",right:"-20%",width:"80%",height:"200%",background:"conic-gradient(from 200deg at 60% 50%,transparent 0deg,rgba(30,213,150,0.07) 40deg,transparent 80deg)",animation:"heroSlowSpin 25s linear infinite"}}/>
    </div>
  );
}

// ─── CRICKET SLIDE (BCCI-card style: badge + name stacked, centered VS, footer) ──
function CricketSlide({slide}){
  const { home, away } = slide;
  const isLive=slide.status==="live";
  const isFinished=slide.status==="finished";
  const isUpcoming=slide.status==="upcoming";
  const fmtBadge=slide.matchFmt||"CRICKET";
  const isODI=fmtBadge==="ODI", isTest=fmtBadge==="Test";
  const fmtColor=isODI?"#f59e0b":isTest?"#ef4444":"#8b5cf6";
  const fmtBg=isODI?"rgba(245,158,11,0.15)":isTest?"rgba(239,68,68,0.15)":"rgba(139,92,246,0.15)";
  const fmtBorder=isODI?"rgba(245,158,11,0.3)":isTest?"rgba(239,68,68,0.3)":"rgba(139,92,246,0.3)";
  const bgImg=resolveThumbnail(slide);
  const isIndiaAfg=bgImg.includes("india-vs-afg");
  const base=isIndiaAfg?"#0a0008":"#0a0015";
  const btm=isIndiaAfg?"#06000a":"#030007";

  return(
    <div className="relative w-full h-full select-none">
      <div className="absolute inset-0">
        <img src={bgImg} alt="" className="w-full h-full object-cover object-center animate-fade-in"/>
        <div className="absolute inset-0" style={{background:`linear-gradient(to right,${base} 0%,${base}d9 45%,transparent 100%)`}}/>
        <div className="absolute bottom-0 left-0 right-0 h-36" style={{background:`linear-gradient(to top,${btm},transparent)`}}/>
        <div className="absolute top-0 left-0 right-0 h-16" style={{background:`linear-gradient(to bottom,${btm},transparent)`}}/>
      </div>
      <CricketHeroBg away={away}/>

      <div className="relative z-10 flex flex-col justify-end h-full px-4 sm:px-8 pb-5 sm:pb-7 pt-4 sm:pt-5">

        {/* ── Badges row ── */}
        <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3 flex-wrap">
          <span className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-black uppercase tracking-widest border"
            style={{fontSize:"clamp(7px,1.8vw,9px)",background:fmtBg,borderColor:fmtBorder,color:fmtColor}}>
            🏏 {slide.tournament}
          </span>
          {fmtBadge!=="CRICKET"&&(
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-black uppercase border"
              style={{fontSize:"clamp(7px,1.8vw,9px)",background:fmtBg,borderColor:fmtBorder,color:fmtColor}}>
              {fmtBadge}
            </span>
          )}
          {isLive&&(
            <span className="flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full border bg-red-500/15 border-red-500/30 text-red-400 font-black uppercase tracking-widest"
              style={{fontSize:"clamp(7px,1.8vw,9px)"}}>
              <PulsingDot color="#ef4444" size={5}/>Live
            </span>
          )}
          {isFinished&&(
            <span className="px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full border bg-purple-500/15 border-purple-500/30 text-purple-400 font-black uppercase tracking-widest"
              style={{fontSize:"clamp(7px,1.8vw,9px)"}}>
              ✓ Completed
            </span>
          )}
          {isUpcoming&&(
            <span className="px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full border bg-white/5 border-white/10 text-gray-400 font-black uppercase tracking-widest"
              style={{fontSize:"clamp(7px,1.8vw,9px)"}}>
              ⏱ {slide.countdown || slide.dateLabel}
            </span>
          )}
        </div>

        {/* ── Teams: badge-over-name BCCI layout ── */}
        <div className="flex items-center gap-3 sm:gap-8 mb-2 sm:mb-3">

          {/* Home */}
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 min-w-0" style={{width:"clamp(64px,16vw,120px)"}}>
            <TeamBadge team={home} size="clamp(28px,6vw,56px)"/>
            <span className="font-black uppercase tracking-tight text-white text-center truncate w-full"
              style={{fontSize:"clamp(11px,2.6vw,16px)"}}>
              {home.code}
            </span>
            {(isLive||isFinished)&&home.score&&(
              <div className="flex items-baseline gap-1">
                <span className="font-black text-white leading-none" style={{fontSize:"clamp(10px,2.2vw,14px)"}}>{home.score}</span>
                {home.overs&&<span className="text-gray-400 font-bold" style={{fontSize:"clamp(7px,1.4vw,9px)"}}>({home.overs})</span>}
              </div>
            )}
          </div>

          {/* VS */}
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            <span className="font-black text-gray-500 uppercase tracking-widest" style={{fontSize:"clamp(8px,1.8vw,13px)"}}>vs</span>
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 min-w-0" style={{width:"clamp(64px,16vw,120px)"}}>
            <TeamBadge team={away} size="clamp(28px,6vw,56px)"/>
            <span className="font-black uppercase tracking-tight text-white/90 text-center truncate w-full"
              style={{fontSize:"clamp(11px,2.6vw,16px)"}}>
              {away.code}
            </span>
            {(isLive||isFinished)&&away.score&&(
              <div className="flex items-baseline gap-1">
                <span className="font-black text-white leading-none" style={{fontSize:"clamp(10px,2.2vw,14px)"}}>{away.score}</span>
                {away.overs&&<span className="text-gray-400 font-bold" style={{fontSize:"clamp(7px,1.4vw,9px)"}}>({away.overs})</span>}
              </div>
            )}
          </div>
        </div>

        {/* ── Meta ── */}
        <div className="mb-2.5 sm:mb-4 space-y-0.5">
          {slide.tossText&&<p className="font-black flex items-center gap-1" style={{fontSize:"clamp(8px,2vw,11px)",color:"#f59e0b"}}>🪙 {slide.tossText}</p>}
          {slide.venue&&<p className="text-gray-500 font-bold" style={{fontSize:"clamp(8px,2vw,11px)"}}>📍 {slide.venue}</p>}
          {slide.result&&<p className="font-black" style={{fontSize:"clamp(8px,2vw,11px)",color:isFinished?"#a78bfa":"#f59e0b"}}>{slide.result}</p>}
          {isLive&&slide.strikerName&&<p className="text-amber-400 font-bold" style={{fontSize:"clamp(8px,2vw,11px)"}}>★ {slide.strikerName} {slide.strikerRuns}({slide.strikerBalls})</p>}
        </div>

        {/* ── CTA / footer ── */}
        <Link to="/live-cricket-tv"
          className="flex items-center gap-1.5 w-fit rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all active:scale-95 hover:scale-[1.03]"
          style={{
            fontSize:"clamp(8px,2vw,13px)",
            padding:"clamp(7px,1.6vw,12px) clamp(12px,2.8vw,20px)",
            background:`linear-gradient(135deg,${fmtColor},${isODI?"#b45309":isTest?"#b91c1c":"#6d28d9"})`,
            boxShadow:`0 0 20px ${fmtColor}44,0 4px 12px rgba(0,0,0,0.4)`,
            color:"#fff",
          }}>
          <Play style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}} fill="currentColor"/>
          {isLive?"Watch Live":isFinished?"View Scorecard":"Watch Now"}
        </Link>
      </div>
    </div>
  );
}

// ─── FOOTBALL SLIDE (same badge-over-name BCCI layout) ───────────────────────
function FootballSlide({slide}){
  const { home, away } = slide;
  const isLive=slide.status==="live";
  const isFinished=slide.status==="finished";
  const isUpcoming=slide.status==="upcoming";
  const hWon=isFinished&&home.score>away.score;
  const aWon=isFinished&&away.score>home.score;

  return(
    <div className="relative w-full h-full select-none">
      <div className="absolute inset-0">
        <img src="/fifa_2026.webp" alt="" className="w-full h-full object-cover object-center animate-fade-in"/>
        <div className="absolute inset-0 bg-gradient-to-r from-[#001a0a] via-[#001a0a]/85 to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#000d05] to-transparent"/>
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#000d05] to-transparent"/>
      </div>
      <FootballHeroBg/>

      <div className="relative z-10 flex flex-col justify-end h-full px-4 sm:px-8 pb-5 sm:pb-7 pt-4 sm:pt-5">

        {/* ── Badges row ── */}
        <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3 flex-wrap">
          <span className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-black uppercase tracking-widest border"
            style={{fontSize:"clamp(7px,1.8vw,9px)",background:"rgba(30,213,150,0.12)",borderColor:"rgba(30,213,150,0.3)",color:"#1ed596"}}>
            ⚽ FIFA World Cup 2026™
          </span>
          {slide.group&&(
            <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-black uppercase tracking-widest border"
              style={{fontSize:"clamp(7px,1.8vw,9px)",background:"rgba(255,255,255,0.05)",borderColor:"rgba(255,255,255,0.1)",color:"#9ca3af"}}>
              {slide.group}
            </span>
          )}
          {isLive&&(
            <span className="flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full border bg-red-500/15 border-red-500/30 text-red-400 font-black uppercase tracking-widest"
              style={{fontSize:"clamp(7px,1.8vw,9px)"}}>
              <PulsingDot color="#ef4444" size={5}/>
              {slide.minute?`${slide.minute}'`:"Live"}
            </span>
          )}
          {isFinished&&(
            <span className="px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full border bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-black uppercase tracking-widest"
              style={{fontSize:"clamp(7px,1.8vw,9px)"}}>
              ✓ Full Time
            </span>
          )}
          {isUpcoming&&(
            <span className="px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full border bg-white/5 border-white/10 text-gray-400 font-black uppercase tracking-widest"
              style={{fontSize:"clamp(7px,1.8vw,9px)"}}>
              ⏱ {slide.countdown || slide.dateLabel}
            </span>
          )}
        </div>

        {/* ── Teams: badge-over-name BCCI layout ── */}
        <div className="flex items-center gap-3 sm:gap-8 mb-2 sm:mb-3">

          {/* Home */}
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 min-w-0" style={{width:"clamp(64px,16vw,120px)"}}>
            <FootballTeamBadge team={home}/>
            <span className="font-black uppercase tracking-tight text-center truncate w-full"
              style={{fontSize:"clamp(11px,2.6vw,16px)",color:hWon?"#4ade80":"white"}}>
              {home.code}
            </span>
            {(isLive||isFinished)&&home.score!==null&&home.score!==undefined&&(
              <span className="font-black leading-none" style={{fontSize:"clamp(10px,2.2vw,14px)",color:hWon?"#4ade80":"white"}}>{home.score}</span>
            )}
          </div>

          {/* Separator */}
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            {(isLive||isFinished)
              ?<span className="font-black text-white/40" style={{fontSize:"clamp(13px,3vw,20px)"}}>:</span>
              :<span className="font-black text-gray-500 uppercase tracking-widest" style={{fontSize:"clamp(8px,1.8vw,13px)"}}>vs</span>
            }
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 min-w-0" style={{width:"clamp(64px,16vw,120px)"}}>
            <FootballTeamBadge team={away}/>
            <span className="font-black uppercase tracking-tight text-center truncate w-full"
              style={{fontSize:"clamp(11px,2.6vw,16px)",color:aWon?"#4ade80":"rgba(255,255,255,0.85)"}}>
              {away.code}
            </span>
            {(isLive||isFinished)&&away.score!==null&&away.score!==undefined&&(
              <span className="font-black leading-none" style={{fontSize:"clamp(10px,2.2vw,14px)",color:aWon?"#4ade80":"white"}}>{away.score}</span>
            )}
          </div>
        </div>

        {/* ── Meta ── */}
        <div className="mb-2.5 sm:mb-4 space-y-0.5">
          {slide.venue&&<p className="text-gray-500 font-bold" style={{fontSize:"clamp(8px,2vw,11px)"}}>📍 {slide.venue}</p>}
          {isFinished&&<p className="font-black" style={{fontSize:"clamp(8px,2vw,11px)",color:"#4ade80"}}>{hWon?`${home.code} win`:aWon?`${away.code} win`:"Draw"} · FT {home.score}–{away.score}</p>}
          {isLive&&slide.minute&&<p className="font-black text-amber-400" style={{fontSize:"clamp(8px,2vw,11px)"}}>{slide.minute}' · Match in progress</p>}
        </div>

        {/* ── CTA ── */}
        <Link to="/live-cricket-tv"
          className="flex items-center gap-1.5 w-fit rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all active:scale-95 hover:scale-[1.03]"
          style={{
            fontSize:"clamp(8px,2vw,13px)",
            padding:"clamp(7px,1.6vw,12px) clamp(12px,2.8vw,20px)",
            background:"linear-gradient(135deg,#1ed596,#059669)",
            boxShadow:"0 0 20px rgba(30,213,150,0.4),0 4px 12px rgba(0,0,0,0.4)",
            color:"#fff",
          }}>
          <Play style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}} fill="currentColor"/>
          {isLive?"Watch Live":isFinished?"Match Highlights":"Watch Now"}
        </Link>
      </div>
    </div>
  );
}

// ─── THUMBNAIL STRIP (desktop only, BCCI-ish chips) ───────────────────────────
function ThumbnailStrip({slides,activeIdx,onSelect}){
  return(
    <div className="absolute bottom-4 right-4 z-20 hidden sm:flex gap-2 items-end">
      {slides.map((slide,i)=>{
        const isActive=i===activeIdx;
        const isCricket=slide.sport==="cricket";
        const accent=isCricket?"rgba(139,92,246,0.7)":"rgba(30,213,150,0.7)";
        const { home, away } = slide;
        const hFlag=isCricket?(ICC_FLAGS[home.code]||"🏏"):"⚽";
        const aFlag=isCricket?(ICC_FLAGS[away.code]||"🏏"):"🌍";
        const stripBg=resolveThumbnail(slide);
        return(
          <button key={slide.id} onClick={()=>onSelect(i)}
            className="relative rounded-xl overflow-hidden border transition-all duration-200 shrink-0 group"
            style={{width:112,height:70,borderColor:isActive?accent:"rgba(255,255,255,0.1)",background:isCricket?"#100025":"#001a0a",boxShadow:isActive?`0 0 16px ${isCricket?"rgba(139,92,246,0.5)":"rgba(30,213,150,0.5)"}`:"none",transform:isActive?"scale(1.06)":"scale(1)"}}>
            <div className="absolute inset-0 z-0">
              <img src={stripBg} alt="" className="w-full h-full object-cover brightness-[0.35] group-hover:scale-110 transition-transform duration-300"/>
            </div>
            <div className="absolute inset-0 z-10 flex flex-col justify-between p-1.5">
              <div className="flex items-center justify-between">
                <span className="font-black rounded px-1 py-0.5 text-[7px]"
                  style={{background:isCricket?"rgba(139,92,246,0.25)":"rgba(30,213,150,0.25)",color:isCricket?"#c4b5fd":"#6ee7b7"}}>
                  {isCricket?"🏏":"⚽"}
                </span>
                {slide.status==="live"&&<span className="flex items-center gap-0.5 bg-red-500/20 rounded px-1 py-0.5"><PulsingDot color="#ef4444" size={4}/><span className="text-[6px] font-black text-red-400">LIVE</span></span>}
                {slide.status==="finished"&&<span className="text-[6px] font-black text-emerald-400 bg-emerald-500/15 rounded px-1 py-0.5">FT</span>}
                {slide.status==="upcoming"&&<span className="text-[6px] font-black text-gray-500 bg-white/5 rounded px-1 py-0.5">Soon</span>}
              </div>
              <div className="flex items-center justify-between">
                <span style={{fontSize:16,lineHeight:1}}>{hFlag}</span>
                <span className="text-[7px] font-black text-white/50 uppercase">{home.code} v {away.code}</span>
                <span style={{fontSize:16,lineHeight:1}}>{aFlag}</span>
              </div>
            </div>
            {isActive&&<div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full z-20" style={{background:isCricket?"linear-gradient(90deg,#8b5cf6,#6d28d9)":"linear-gradient(90deg,#1ed596,#059669)"}}/>}
          </button>
        );
      })}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function HeroSection(){
  const [slides,setSlides]=useState([]);
  const [loading,setLoading]=useState(true);
  const [activeIdx,setActiveIdx]=useState(0);
  const [transitioning,setTransitioning]=useState(false);
  const timerRef=useRef(null);

  const buildSlides=useCallback(async()=>{
    const ck="hero_slides_v6";
    const cached=getCached(ck);
    if(cached){setSlides(cached);setLoading(false);return;}

    const liveC=[],finC=[],upC=[],liveF=[],finF=[],upF=[];

    // ── BCCI ──
    try{
      const [liveRes,upRes,recentRes]=await Promise.allSettled([
        fetch(`${API_BASE}/api/bcci/live`),
        fetch(`${API_BASE}/api/bcci/upcoming`),
        fetch(`${API_BASE}/api/bcci/recent`),
      ]);

      if(liveRes.status==="fulfilled"&&liveRes.value.ok){
        const j=await liveRes.value.json();
        for(const m of (j.liveMatches||[]).filter(isIndiaMensMatch).slice(0,2)){
          const homeIsFirst = m.FirstBattingTeamID && String(m.FirstBattingTeamID)===String(m.HomeTeamID);
          const inn1 = m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]}` : null;
          const inn2 = m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]}` : null;
          const home = buildSide({
            code: m.HomeTeamCode, name: m.HomeTeamName, logo: m.MatchHomeTeamLogo,
            score: homeIsFirst ? inn1 : inn2,
            overs: homeIsFirst ? m["1FallOvers"] : m["2FallOvers"],
          });
          const away = buildSide({
            code: m.AwayTeamCode, name: m.AwayTeamName, logo: m.MatchAwayTeamLogo,
            score: homeIsFirst ? inn2 : inn1,
            overs: homeIsFirst ? m["2FallOvers"] : m["1FallOvers"],
          });
          liveC.push({
            id:`bcci-live-${m.MatchID}`, sport:"cricket", status:"live",
            home, away,
            tournament: m.CompetitionName || "India Cricket",
            matchFmt: bcciFmt(m.MatchType),
            venue: m.GroundName ? `${m.GroundName}${m.city?`, ${m.city}`:""}` : "",
            tossText: m.TossDetails || null,
            result: m.ChasingText || null,
            strikerName: m.CurrentStrikerName || null,
            strikerRuns: m.StrikerRuns ?? null,
            strikerBalls: m.StrikerBalls ?? null,
          });
        }
      }

      if(recentRes.status==="fulfilled"&&recentRes.value.ok){
        const j=await recentRes.value.json();
        for(const m of (j.recentMatches||j.postMatches||[]).filter(isIndiaMensMatch).slice(0,2)){
          const homeIsFirst = m.FirstBattingTeamID && String(m.FirstBattingTeamID)===String(m.HomeTeamID);
          const inn1 = m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]}` : null;
          const inn2 = m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]}` : null;
          const home = buildSide({ code: m.HomeTeamCode, name: m.HomeTeamName, logo: m.MatchHomeTeamLogo, score: homeIsFirst ? inn1 : inn2 });
          const away = buildSide({ code: m.AwayTeamCode, name: m.AwayTeamName, logo: m.MatchAwayTeamLogo, score: homeIsFirst ? inn2 : inn1 });
          finC.push({
            id:`bcci-fin-${m.MatchID}`, sport:"cricket", status:"finished",
            home, away,
            tournament: m.CompetitionName || "India Cricket",
            matchFmt: bcciFmt(m.MatchType),
            venue: m.GroundName ? `${m.GroundName}${m.city?`, ${m.city}`:""}` : "",
            result: m.Comments || m.Commentss || null,
          });
        }
      }

      if(upRes.status==="fulfilled"&&upRes.value.ok){
        const j=await upRes.value.json();
        for(const m of (j.upcomingMatches||[]).filter(isIndiaMensMatch).slice(0,2)){
          const home = buildSide({ code: m.HomeTeamCode, name: m.HomeTeamName, logo: m.MatchHomeTeamLogo });
          const away = buildSide({ code: m.AwayTeamCode, name: m.AwayTeamName, logo: m.MatchAwayTeamLogo });
          upC.push({
            id:`bcci-up-${m.MatchID}`, sport:"cricket", status:"upcoming",
            home, away,
            tournament: m.CompetitionName || "India Cricket",
            matchFmt: bcciFmt(m.MatchType),
            venue: m.GroundName ? `${m.GroundName}${m.city?`, ${m.city}`:""}` : "",
            dateLabel: bcciFmtDate(m.MatchDate),
            timeLabel: bcciFmtTime(m.CustomMatchTime || m.MatchTime || ""),
            countdown: countdownLabel(m.MatchDate),
          });
        }
      }
    }catch{}

    // ── WT20 ──
    try{
      const res=await fetch(`${API_BASE}/api/wt20/schedule?series_ids=${WT20_SERIES_ID}&game_count=10`);
      if(res.ok){
        const json=await res.json();
        const matches=json.data?.matches||[];

        for(const m of matches.filter(x=>x.live).slice(0,1)){
          const score=m.scores?.[0];
          let bi=null, tossText=null, result=null, battingIsTeamA=null;
          try{
            const sr=await fetch(`${API_BASE}/api/wt20/scorecard?game_id=${m.match_id}`);
            if(sr.ok){
              const sj=await sr.json(); const sd=sj.data||sj;
              const md=sd.Matchdetail||{}; const teams=sd.Teams||{}; const innings=sd.Innings||[];
              const tossTeam=teams[md.Tosswonby];
              if(tossTeam) tossText=`${tossTeam.Name_Short} elected to ${md.Toss_elected_to}`;
              result=md.Status||null;
              bi=innings[0];
              if(bi){
                const bt=teams[bi.Battingteam];
                battingIsTeamA = bt?.Name_Short === (m.teama_short || "");
              }
            }
          }catch{}

          const fallbackScore = score ? `${score.team_runs}/${score.team_wickets}` : null;
          const home = buildSide({
            code: m.teama_short, name: m.teama_display_name,
            score: battingIsTeamA===true && bi ? `${bi.Total}/${bi.Wickets}` : (battingIsTeamA===null ? fallbackScore : null),
            overs: battingIsTeamA===true && bi ? `${bi.Overs}/${bi.AllottedOvers||20}` : null,
          });
          const away = buildSide({
            code: m.teamb_short, name: m.teamb_display_name,
            score: battingIsTeamA===false && bi ? `${bi.Total}/${bi.Wickets}` : null,
            overs: battingIsTeamA===false && bi ? `${bi.Overs}/${bi.AllottedOvers||20}` : null,
          });

          liveC.push({
            id:`wt20-live-${m.match_id}`, sport:"cricket", status:"live",
            home, away,
            tournament:"ICC WT20 WC 2026", matchFmt:"T20I",
            venue: m.venue || "England",
            tossText, result,
          });
        }

        for(const m of matches.filter(x=>x.recent&&!x.live).slice(0,1)){
          const score=m.scores?.[0];
          const home = buildSide({
            code: m.teama_short, name: m.teama_display_name,
            score: score ? `${score.team_runs}/${score.team_wickets}` : null,
            overs: score ? `${score.team_overs}/20` : null,
          });
          const away = buildSide({ code: m.teamb_short, name: m.teamb_display_name });
          finC.push({
            id:`wt20-fin-${m.match_id}`, sport:"cricket", status:"finished",
            home, away,
            tournament:"ICC WT20 WC 2026", matchFmt:"T20I",
            venue: m.venue || "England",
            result: m.match_result || null,
          });
        }

        for(const m of matches.filter(x=>x.upcoming).slice(0,1)){
          const home = buildSide({ code: m.teama_short, name: m.teama_display_name });
          const away = buildSide({ code: m.teamb_short, name: m.teamb_display_name });
          upC.push({
            id:`wt20-up-${m.match_id}`, sport:"cricket", status:"upcoming",
            home, away,
            tournament:"ICC WT20 WC 2026", matchFmt:"T20I",
            venue: m.venue || "England",
            dateLabel: m.start_date ? fmtDateIST(m.start_date) : "",
            timeLabel: m.match_time_ist || "",
            countdown: m.start_date ? countdownLabel(m.start_date) : "",
          });
        }
      }
    }catch{}

    // ── FIFA ──
    try{
      const url=`${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`;
      const res=await fetch(url,{headers:{Accept:"application/json"}});
      if(res.ok){
        const json=await res.json(); const all=json.Results||[];
        const todayStr=new Date().toISOString().slice(0,10);
        const fifaLive=all.filter(m=>m.MatchStatus===3);
        const fifaFin=all.filter(m=>m.MatchStatus!==3&&m.HomeTeamScore!==null&&m.HomeTeamScore!==undefined).sort((a,b)=>new Date(b.Date)-new Date(a.Date));
        const fifaUp=all.filter(m=>m.MatchStatus===0&&(m.HomeTeamScore===null||m.HomeTeamScore===undefined)).sort((a,b)=>new Date(a.Date)-new Date(b.Date));
        const todayFin=fifaFin.filter(m=>new Date(m.Date).toISOString().slice(0,10)===todayStr);

        const buildFifaSlide=(m,status)=>{
          const home = buildSide({
            code: fifaAbbr(m.Home) || "TBD", name: fifaAbbr(m.Home) || "TBD",
            logo: m.Home?.IdCountry ? getFifaFlagUrl(m.Home.IdCountry) : null,
            score: m.HomeTeamScore,
          });
          const away = buildSide({
            code: fifaAbbr(m.Away) || "TBD", name: fifaAbbr(m.Away) || "TBD",
            logo: m.Away?.IdCountry ? getFifaFlagUrl(m.Away.IdCountry) : null,
            score: m.AwayTeamScore,
          });
          return {
            id:`fifa-${m.IdMatch}`, sport:"football", status,
            home, away,
            tournament:"FIFA World Cup 2026™",
            group: fifaGroupName(m),
            venue: fifaCityStadium(m),
            minute: m.MatchTime || null,
            dateLabel: fmtDateIST(m.Date),
            timeLabel: fmtIST(m.Date),
            countdown: status==="upcoming" ? countdownLabel(m.Date) : "",
          };
        };

        for(const m of fifaLive.slice(0,2)) liveF.push(buildFifaSlide(m,"live"));
        for(const m of (todayFin.length>0?todayFin:fifaFin).slice(0,2)) finF.push(buildFifaSlide(m,"finished"));
        for(const m of fifaUp.slice(0,2)) upF.push(buildFifaSlide(m,"upcoming"));
      }
    }catch{}

    // ── Order ──
    let ordered=[];
    const hasLC=liveC.length>0, hasLF=liveF.length>0;
    if(hasLC&&hasLF) ordered=[liveC[0],liveF[0],liveC[1]||finC[0]||upC[0],liveF[1]||finF[0]||upF[0]];
    else if(hasLC) ordered=[liveC[0],liveC[1]||finC[0],finF[0]||upF[0],upC[0]||finC[1]||upF[1]];
    else if(hasLF) ordered=[liveF[0],liveF[1]||finF[0],finC[0]||upC[0],upF[0]||finC[1]||upC[1]];
    else ordered=[finC[0]||upC[0],finF[0]||upF[0],upC[0]||finC[1],upF[0]||finF[1]];
    const final=ordered.filter(Boolean).slice(0,4);
    if(final.length>0){setCache(ck,final);setSlides(final);}
    setLoading(false);
  },[]);

  useEffect(()=>{buildSlides();const t=setInterval(buildSlides,10*60*1000);return()=>clearInterval(t);},[buildSlides]);

  const goTo=useCallback((idx)=>{
    if(idx===activeIdx||slides.length===0)return;
    setTransitioning(true);
    setTimeout(()=>{setActiveIdx(idx);setTransitioning(false);},280);
  },[activeIdx,slides.length]);

  const goNext=useCallback(()=>{if(slides.length===0)return;goTo((activeIdx+1)%slides.length);},[activeIdx,goTo,slides.length]);
  const goPrev=useCallback(()=>{if(slides.length===0)return;goTo((activeIdx-1+slides.length)%slides.length);},[activeIdx,goTo,slides.length]);

  const resetTimer=useCallback(()=>{
    clearInterval(timerRef.current);
    if(slides.length>0)timerRef.current=setInterval(goNext,8000);
  },[goNext,slides.length]);

  useEffect(()=>{
    if(slides.length===0)return;
    timerRef.current=setInterval(goNext,8000);
    return()=>clearInterval(timerRef.current);
  },[goNext,slides.length]);

  const handleSelect=(idx)=>{goTo(idx);resetTimer();};
  const active=slides[activeIdx];
  const isCricket=active?.sport==="cricket";

  if(loading||!active){
    return(
      <>
        <style>{`@keyframes heroSlowSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes heroProgress{from{width:0%}to{width:100%}}`}</style>
        <section className="relative w-full overflow-hidden" style={{height:"clamp(300px,50vw,540px)",background:"#030007"}}>
          <div className="absolute inset-0" style={{background:"linear-gradient(135deg,#0a0015 0%,#100025 50%,rgba(139,92,246,0.1) 100%)"}}/>
          <div className="relative z-10 flex flex-col justify-end h-full px-4 sm:px-8 pb-5 sm:pb-7 pt-4">
            <div className="h-4 w-28 rounded-full bg-white/5 animate-pulse mb-2"/>
            <div className="h-9 sm:h-14 w-44 sm:w-56 rounded-xl bg-white/5 animate-pulse mb-3"/>
            <div className="h-3 w-36 rounded bg-white/5 animate-pulse mb-4"/>
            <div className="h-8 sm:h-10 w-28 sm:w-32 rounded-xl bg-purple-900/30 animate-pulse"/>
          </div>
        </section>
      </>
    );
  }

  return(
    <>
      <style>{`
        @keyframes heroSlowSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes heroProgress{from{width:0%}to{width:100%}}
        .animate-fade-in{animation:fadeIn 0.4s ease-out forwards}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>

      <section className="relative w-full overflow-hidden" style={{height:"clamp(300px,50vw,540px)",background:"#030007"}}>

        <div className="absolute inset-0 transition-opacity duration-300" style={{opacity:transitioning?0:1}}>
          {isCricket?<CricketSlide slide={active}/>:<FootballSlide slide={active}/>}
        </div>

        {/* Left arrow */}
        <button onClick={()=>{goPrev();resetTimer();}}
          className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all hover:scale-110 active:scale-95"
          style={{background:"rgba(0,0,0,0.55)",borderColor:"rgba(255,255,255,0.1)",backdropFilter:"blur(8px)"}}>
          <ChevronLeft size={14} className="text-white sm:hidden"/>
          <ChevronLeft size={17} className="text-white hidden sm:block"/>
        </button>

        {/* Right arrow desktop */}
        <button onClick={()=>{goNext();resetTimer();}}
          className="hidden sm:flex absolute top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full items-center justify-center border transition-all hover:scale-110 active:scale-95"
          style={{right:slides.length>1?"calc(0.75rem + 356px)":"0.75rem",background:"rgba(0,0,0,0.55)",borderColor:"rgba(255,255,255,0.1)",backdropFilter:"blur(8px)"}}>
          <ChevronRight size={17} className="text-white"/>
        </button>

        {/* Right arrow mobile */}
        <button onClick={()=>{goNext();resetTimer();}}
          className="sm:hidden absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full flex items-center justify-center border transition-all hover:scale-110 active:scale-95"
          style={{background:"rgba(0,0,0,0.55)",borderColor:"rgba(255,255,255,0.1)",backdropFilter:"blur(8px)"}}>
          <ChevronRight size={14} className="text-white"/>
        </button>

        {/* Mobile dots */}
        {slides.length>1&&(
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:hidden">
            {slides.map((_,i)=>(
              <button key={i} onClick={()=>handleSelect(i)} className="rounded-full transition-all"
                style={{width:i===activeIdx?16:5,height:5,background:i===activeIdx?(isCricket?"#8b5cf6":"#1ed596"):"rgba(255,255,255,0.2)"}}/>
            ))}
          </div>
        )}

        {slides.length>1&&<ThumbnailStrip slides={slides} activeIdx={activeIdx} onSelect={handleSelect}/>}

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-white/[0.04]" style={{height:"2px"}}>
          <div key={`${activeIdx}-${active.id}`}
            style={{height:"100%",borderRadius:"9999px",background:isCricket?"linear-gradient(90deg,#8b5cf6,#6d28d9)":"linear-gradient(90deg,#1ed596,#059669)",animation:"heroProgress 8s linear forwards"}}/>
        </div>
      </section>
    </>
  );
}
