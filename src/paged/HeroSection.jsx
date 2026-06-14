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
function resolveThumbnail(slide) {
  if (slide.sport === "football") return "/fifa_2026.webp";
  const teams = [(slide.homeShort || "").toUpperCase(), (slide.awayShort || "").toUpperCase()];
  const names = [(slide.homeTeamName || "").toUpperCase(), (slide.awayTeamName || "").toUpperCase()];
  const hasIND = teams.some(t => t === "IND" || t === "INDIA") || names.some(n => n.includes("INDIA"));
  const hasAFG = teams.some(t => t === "AFG" || t === "AFGHANISTAN") || names.some(n => n.includes("AFGHANISTAN"));
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

// ─── BACKGROUNDS ─────────────────────────────────────────────────────────────
function CricketHeroBg({awayShort}){
  const aFlag=ICC_FLAGS[awayShort]||"🏏";
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

// ─── CRICKET SLIDE ────────────────────────────────────────────────────────────
function CricketSlide({slide}){
  const hFlag=ICC_FLAGS[slide.homeShort]||"🏏";
  const aFlag=ICC_FLAGS[slide.awayShort]||"🏏";
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
      <CricketHeroBg awayShort={slide.awayShort}/>

      <div className="relative z-10 flex flex-col justify-end h-full px-4 sm:px-8 pb-5 sm:pb-7 pt-4 sm:pt-5">

        {/* ── Badges ── */}
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
              📅 {slide.dateLabel}{slide.timeLabel?` · ${slide.timeLabel} IST`:""}
            </span>
          )}
        </div>

        {/* ── Teams ── */}
        <div className="flex items-end gap-2 sm:gap-5 mb-1.5 sm:mb-2.5">

          {/* Home */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            {slide.homeLogo?(
              <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white/5 border border-white/15 shrink-0">
                <img src={slide.homeLogo} alt="" className="w-full h-full object-contain p-0.5" onError={e=>{e.target.style.display="none";}}/>
              </div>
            ):(
              <span style={{fontSize:"clamp(18px,4vw,34px)",lineHeight:1,filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.6))",flexShrink:0}}>{hFlag}</span>
            )}
            <div className="min-w-0">
              <span className="font-black uppercase italic tracking-tighter leading-none text-white block"
                style={{fontSize:"clamp(24px,6vw,58px)",textShadow:"0 2px 20px rgba(0,0,0,0.8)"}}>
                {slide.homeShort}
              </span>
              {(isLive||isFinished)&&slide.homeScore&&(
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-black text-white leading-none" style={{fontSize:"clamp(11px,2.6vw,20px)"}}>{slide.homeScore}</span>
                  {slide.homeOvers&&<span className="text-gray-400 font-bold" style={{fontSize:"clamp(8px,1.6vw,10px)"}}>({slide.homeOvers})</span>}
                </div>
              )}
            </div>
          </div>

          {/* VS */}
          <div className="self-center shrink-0 pb-1">
            <span className="font-black text-gray-600 uppercase tracking-widest" style={{fontSize:"clamp(8px,1.8vw,13px)"}}>vs</span>
          </div>

          {/* Away */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <div className="min-w-0">
              <span className="font-black uppercase italic tracking-tighter leading-none text-white/80 block"
                style={{fontSize:"clamp(24px,6vw,58px)",textShadow:"0 2px 20px rgba(0,0,0,0.8)"}}>
                {slide.awayShort}
              </span>
              {(isLive||isFinished)&&slide.awayScore&&(
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-black text-white leading-none" style={{fontSize:"clamp(11px,2.6vw,20px)"}}>{slide.awayScore}</span>
                  {slide.awayOvers&&<span className="text-gray-400 font-bold" style={{fontSize:"clamp(8px,1.6vw,10px)"}}>({slide.awayOvers})</span>}
                </div>
              )}
            </div>
            {slide.awayLogo?(
              <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white/5 border border-white/15 shrink-0">
                <img src={slide.awayLogo} alt="" className="w-full h-full object-contain p-0.5" onError={e=>{e.target.style.display="none";}}/>
              </div>
            ):(
              <span style={{fontSize:"clamp(18px,4vw,34px)",lineHeight:1,filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.6))",flexShrink:0}}>{aFlag}</span>
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

        {/* ── CTA ── */}
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

// ─── FOOTBALL SLIDE ───────────────────────────────────────────────────────────
function FootballSlide({slide}){
  const isLive=slide.status==="live";
  const isFinished=slide.status==="finished";
  const isUpcoming=slide.status==="upcoming";
  const hWon=isFinished&&slide.homeScore>slide.awayScore;
  const aWon=isFinished&&slide.awayScore>slide.homeScore;

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

        {/* ── Badges ── */}
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
              📅 {slide.dateLabel}{slide.timeLabel?` · ${slide.timeLabel} IST`:""}
            </span>
          )}
        </div>

        {/* ── Teams ── */}
        <div className="flex items-end gap-2 sm:gap-5 mb-1.5 sm:mb-2.5">

          {/* Home */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            {slide.homeFlagImg&&(
              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/5">
                <img src={slide.homeFlagImg} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/>
              </div>
            )}
            <div className="min-w-0">
              <span className="font-black uppercase italic tracking-tighter leading-none block"
                style={{fontSize:"clamp(24px,6vw,58px)",textShadow:"0 2px 20px rgba(0,0,0,0.8)",color:hWon?"#4ade80":"white"}}>
                {slide.homeShort}
              </span>
              {(isLive||isFinished)&&slide.homeScore!==null&&slide.homeScore!==undefined&&(
                <p className="font-black leading-none mt-0.5" style={{fontSize:"clamp(11px,2.6vw,20px)",color:hWon?"#4ade80":"white"}}>{slide.homeScore}</p>
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="self-center shrink-0 pb-1">
            {(isLive||isFinished)
              ?<span className="font-black text-white/40" style={{fontSize:"clamp(14px,3.5vw,22px)"}}>:</span>
              :<span className="font-black text-gray-600 uppercase tracking-widest" style={{fontSize:"clamp(8px,1.8vw,13px)"}}>vs</span>
            }
          </div>

          {/* Away */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <div className="min-w-0">
              <span className="font-black uppercase italic tracking-tighter leading-none block"
                style={{fontSize:"clamp(24px,6vw,58px)",textShadow:"0 2px 20px rgba(0,0,0,0.8)",color:aWon?"#4ade80":"rgba(255,255,255,0.8)"}}>
                {slide.awayShort}
              </span>
              {(isLive||isFinished)&&slide.awayScore!==null&&slide.awayScore!==undefined&&(
                <p className="font-black leading-none mt-0.5" style={{fontSize:"clamp(11px,2.6vw,20px)",color:aWon?"#4ade80":"white"}}>{slide.awayScore}</p>
              )}
            </div>
            {slide.awayFlagImg&&(
              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/5">
                <img src={slide.awayFlagImg} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display="none";}}/>
              </div>
            )}
          </div>
        </div>

        {/* ── Meta ── */}
        <div className="mb-2.5 sm:mb-4 space-y-0.5">
          {slide.venue&&<p className="text-gray-500 font-bold" style={{fontSize:"clamp(8px,2vw,11px)"}}>📍 {slide.venue}</p>}
          {isFinished&&<p className="font-black" style={{fontSize:"clamp(8px,2vw,11px)",color:"#4ade80"}}>{hWon?`${slide.homeShort} win`:aWon?`${slide.awayShort} win`:"Draw"} · FT {slide.homeScore}–{slide.awayScore}</p>}
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

// ─── THUMBNAIL STRIP (desktop only) ──────────────────────────────────────────
function ThumbnailStrip({slides,activeIdx,onSelect}){
  return(
    <div className="absolute bottom-4 right-4 z-20 hidden sm:flex gap-2 items-end">
      {slides.map((slide,i)=>{
        const isActive=i===activeIdx;
        const isCricket=slide.sport==="cricket";
        const accent=isCricket?"rgba(139,92,246,0.7)":"rgba(30,213,150,0.7)";
        const hFlag=isCricket?(ICC_FLAGS[slide.homeShort]||"🏏"):"⚽";
        const aFlag=isCricket?(ICC_FLAGS[slide.awayShort]||"🏏"):"🌍";
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
                <span className="text-[7px] font-black text-white/50 uppercase">{slide.homeShort} v {slide.awayShort}</span>
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
    const ck="hero_slides_v5";
    const cached=getCached(ck);
    if(cached){setSlides(cached);setLoading(false);return;}

    const liveC=[],liveF=[],finC=[],finF=[],upC=[],upF=[];

    // ── BCCI ──
    try{
      const [liveRes,upRes,recentRes]=await Promise.allSettled([
        fetch(`${API_BASE}/api/bcci/live`),
        fetch(`${API_BASE}/api/bcci/upcoming`),
        fetch(`${API_BASE}/api/bcci/recent`),
      ]);
      if(liveRes.status==="fulfilled"&&liveRes.value.ok){
        const j=await liveRes.value.json();
        for(const m of(j.liveMatches||[]).filter(isIndiaMensMatch).slice(0,2)){
          const homeIsFirst=(m.FirstBattingTeamID&&String(m.FirstBattingTeamID)===String(m.HomeTeamID));
          const inn1=m["1FallScore"]?`${m["1FallScore"]}/${m["1FallWickets"]}`:null;
          const inn2=m["2FallScore"]?`${m["2FallScore"]}/${m["2FallWickets"]}`:null;
          liveC.push({id:`bcci-live-${m.MatchID}`,sport:"cricket",status:"live",homeShort:m.HomeTeamCode||"IND",awayShort:m.AwayTeamCode||"AFG",homeTeamName:m.HomeTeamName||"",awayTeamName:m.AwayTeamName||"",homeLogo:m.MatchHomeTeamLogo||null,awayLogo:m.MatchAwayTeamLogo||null,tournament:m.CompetitionName||"India Cricket",matchFmt:bcciFmt(m.MatchType),venue:m.GroundName?`${m.GroundName}${m.city?`, ${m.city}`:""}` :"",homeScore:homeIsFirst?inn1:inn2,awayScore:homeIsFirst?inn2:inn1,homeOvers:homeIsFirst?(m["1FallOvers"]||null):(m["2FallOvers"]||null),tossText:m.TossDetails||null,result:m.ChasingText||null,strikerName:m.CurrentStrikerName||null,strikerRuns:m.StrikerRuns??null,strikerBalls:m.StrikerBalls??null});
        }
      }
      if(recentRes.status==="fulfilled"&&recentRes.value.ok){
        const j=await recentRes.value.json();
        for(const m of(j.recentMatches||j.postMatches||[]).filter(isIndiaMensMatch).slice(0,2)){
          const homeIsFirst=(m.FirstBattingTeamID&&String(m.FirstBattingTeamID)===String(m.HomeTeamID));
          const inn1=m["1FallScore"]?`${m["1FallScore"]}/${m["1FallWickets"]}`:null;
          const inn2=m["2FallScore"]?`${m["2FallScore"]}/${m["2FallWickets"]}`:null;
          finC.push({id:`bcci-fin-${m.MatchID}`,sport:"cricket",status:"finished",homeShort:m.HomeTeamCode||"IND",awayShort:m.AwayTeamCode||"AFG",homeTeamName:m.HomeTeamName||"",awayTeamName:m.AwayTeamName||"",homeLogo:m.MatchHomeTeamLogo||null,awayLogo:m.MatchAwayTeamLogo||null,tournament:m.CompetitionName||"India Cricket",matchFmt:bcciFmt(m.MatchType),venue:m.GroundName?`${m.GroundName}${m.city?`, ${m.city}`:""}` :"",homeScore:homeIsFirst?inn1:inn2,awayScore:homeIsFirst?inn2:inn1,result:m.Comments||m.Commentss||null});
        }
      }
      if(upRes.status==="fulfilled"&&upRes.value.ok){
        const j=await upRes.value.json();
        for(const m of(j.upcomingMatches||[]).filter(isIndiaMensMatch).slice(0,2)){
          upC.push({id:`bcci-up-${m.MatchID}`,sport:"cricket",status:"upcoming",homeShort:m.HomeTeamCode||"IND",awayShort:m.AwayTeamCode||"",homeTeamName:m.HomeTeamName||"",awayTeamName:m.AwayTeamName||"",homeLogo:m.MatchHomeTeamLogo||null,awayLogo:m.MatchAwayTeamLogo||null,tournament:m.CompetitionName||"India Cricket",matchFmt:bcciFmt(m.MatchType),venue:m.GroundName?`${m.GroundName}${m.city?`, ${m.city}`:""}` :"",dateLabel:bcciFmtDate(m.MatchDate),timeLabel:bcciFmtTime(m.CustomMatchTime||m.MatchTime||"")});
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
          let homeScore=null,awayScore=null,homeOvers=null,tossText=null,result=null;
          try{
            const sr=await fetch(`${API_BASE}/api/wt20/scorecard?game_id=${m.match_id}`);
            if(sr.ok){
              const sj=await sr.json();const sd=sj.data||sj;const md=sd.Matchdetail||{};const teams=sd.Teams||{};const innings=sd.Innings||[];
              const tossTeam=teams[md.Tosswonby];if(tossTeam)tossText=`${tossTeam.Name_Short} elected to ${md.Toss_elected_to}`;
              result=md.Status||null;
              const bi=innings[0];if(bi){const bt=teams[bi.Battingteam];if(bt?.Name_Short===(m.teama_short||"")){homeScore=`${bi.Total}/${bi.Wickets}`;homeOvers=`${bi.Overs}/${bi.AllottedOvers||20}`;}else{awayScore=`${bi.Total}/${bi.Wickets}`;}}
            }
          }catch{}
          if(!homeScore&&score)homeScore=`${score.team_runs}/${score.team_wickets}`;
          liveC.push({id:`wt20-live-${m.match_id}`,sport:"cricket",status:"live",homeShort:m.teama_short||"—",awayShort:m.teamb_short||"—",homeTeamName:m.teama_display_name||"",awayTeamName:m.teamb_display_name||"",tournament:"ICC WT20 WC 2026",matchFmt:"T20I",venue:m.venue||"England",homeScore,awayScore,homeOvers,tossText,result});
        }
        for(const m of matches.filter(x=>x.recent&&!x.live).slice(0,1)){
          const score=m.scores?.[0];
          finC.push({id:`wt20-fin-${m.match_id}`,sport:"cricket",status:"finished",homeShort:m.teama_short||"—",awayShort:m.teamb_short||"—",homeTeamName:m.teama_display_name||"",awayTeamName:m.teamb_display_name||"",tournament:"ICC WT20 WC 2026",matchFmt:"T20I",venue:m.venue||"England",homeScore:score?`${score.team_runs}/${score.team_wickets}`:null,homeOvers:score?`${score.team_overs}/20`:null,result:m.match_result||null});
        }
        for(const m of matches.filter(x=>x.upcoming).slice(0,1)){
          upC.push({id:`wt20-up-${m.match_id}`,sport:"cricket",status:"upcoming",homeShort:m.teama_short||"—",awayShort:m.teamb_short||"—",homeTeamName:m.teama_display_name||"",awayTeamName:m.teamb_display_name||"",tournament:"ICC WT20 WC 2026",matchFmt:"T20I",venue:m.venue||"England",dateLabel:m.start_date?fmtDateIST(m.start_date):"",timeLabel:m.match_time_ist||""});
        }
      }
    }catch{}

    // ── FIFA ──
    try{
      const url=`${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`;
      const res=await fetch(url,{headers:{Accept:"application/json"}});
      if(res.ok){
        const json=await res.json();const all=json.Results||[];
        const todayStr=new Date().toISOString().slice(0,10);
        const fifaLive=all.filter(m=>m.MatchStatus===3);
        const fifaFin=all.filter(m=>m.MatchStatus!==3&&m.HomeTeamScore!==null&&m.HomeTeamScore!==undefined).sort((a,b)=>new Date(b.Date)-new Date(a.Date));
        const fifaUp=all.filter(m=>m.MatchStatus===0&&(m.HomeTeamScore===null||m.HomeTeamScore===undefined)).sort((a,b)=>new Date(a.Date)-new Date(b.Date));
        const todayFin=fifaFin.filter(m=>new Date(m.Date).toISOString().slice(0,10)===todayStr);
        const bFS=(m,status)=>({id:`fifa-${m.IdMatch}`,sport:"football",status,homeShort:fifaAbbr(m.Home)||"TBD",awayShort:fifaAbbr(m.Away)||"TBD",homeFlagImg:m.Home?.IdCountry?getFifaFlagUrl(m.Home.IdCountry):null,awayFlagImg:m.Away?.IdCountry?getFifaFlagUrl(m.Away.IdCountry):null,tournament:"FIFA World Cup 2026™",group:fifaGroupName(m),venue:fifaCityStadium(m),homeScore:m.HomeTeamScore,awayScore:m.AwayTeamScore,minute:m.MatchTime||null,dateLabel:fmtDateIST(m.Date),timeLabel:fmtIST(m.Date)});
        for(const m of fifaLive.slice(0,2))liveF.push(bFS(m,"live"));
        for(const m of(todayFin.length>0?todayFin:fifaFin).slice(0,2))finF.push(bFS(m,"finished"));
        for(const m of fifaUp.slice(0,2))upF.push(bFS(m,"upcoming"));
      }
    }catch{}

    // ── Order ──
    let ordered=[];
    const hasLC=liveC.length>0,hasLF=liveF.length>0;
    if(hasLC&&hasLF)ordered=[liveC[0],liveF[0],liveC[1]||finC[0]||upC[0],liveF[1]||finF[0]||upF[0]];
    else if(hasLC)ordered=[liveC[0],liveC[1]||finC[0],finF[0]||upF[0],upC[0]||finC[1]||upF[1]];
    else if(hasLF)ordered=[liveF[0],liveF[1]||finF[0],finC[0]||upC[0],upF[0]||finC[1]||upC[1]];
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