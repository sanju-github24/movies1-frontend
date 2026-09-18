import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { isIndiaMensMatch } from "../utils/indiaMatch";
import { encodeMatchHash } from "../utils/matchHash";
import { teamCrest, flagImg } from "../utils/teamCrest";
import { fetchTabFeed, fetchHeroFixtures, splitTeams, heroPlayUrl } from "../utils/liveTabs";
import LiveViewer from "../components/LiveViewer";
import { codeForTeam } from "../utils/teamCrest";
import { langName } from "../utils/langs";

// Build a specific match-center link so the hero "Watch Live" goes to the match,
// not the generic live-cricket page.
const mcLink = (payload) => `/match-center/${encodeMatchHash(payload)}`;
// FanCode match → scorecard-only match center (no video stream).
function fcLink(fc) {
  return mcLink({ sport: "cricket", type: "fancode", matchId: fc.matchId, title: fc.titleRaw, seriesText: fc.tournament });
}
function bcciLink(m, home, away) {
  return mcLink({
    sport: "cricket", type: "bcci",
    homeCode: home?.code || m.HomeTeamCode, awayCode: away?.code || m.AwayTeamCode,
    leagueLabel: m.CompetitionName || "India Cricket",
    matchData: {
      MatchID: m.MatchID, CompetitionID: m.CompetitionID, MatchOrder: m.MatchOrder,
      CompetitionName: m.CompetitionName, HomeTeamName: m.HomeTeamName, AwayTeamName: m.AwayTeamName,
      MatchHomeTeamLogo: m.MatchHomeTeamLogo, MatchAwayTeamLogo: m.MatchAwayTeamLogo,
      HomeTeamCode: m.HomeTeamCode, AwayTeamCode: m.AwayTeamCode, MatchType: m.MatchType,
      GroundName: m.GroundName, SmMatchID: m.SmMatchID,
    },
  });
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FIFA_API_BASE    = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION = "17";
const FIFA_SEASON      = "285023";
const FIFA_STAGE       = "289273";
const WT20_SERIES_ID   = "12672";
const API_BASE         = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";

// ─── THUMBNAIL RESOLVER ───────────────────────────────────────────────────────
const IND_VS_IRE_IMG = "https://images.slivcdn.com/videoasset_images/manage_file/1000019970/178238619430072_IRE_vs_IND_Vaibhav_India_Debut_masthead_large_v3_3200x1800.jpg?h=auto&w=1712&q=eco";

/* Cricket boards do not publish a per-match image — BCCI's feed has no image
   field at all — so a live match's real thumbnail can only come from a streamer
   that made one, which is what the FanCode lookup below is for. This is what we
   show when there is no such thumbnail.

   It used to end at "/women_t20.jpg", so every India men's fixture that was not
   against Ireland or Afghanistan was headlined with a photo of a women's T20 —
   the wrong match, the wrong teams, the wrong tournament. The opponent's flag
   is at least about this fixture, and there is one for every country. */
function resolveThumbnail(slide) {
  if (slide.sport === "football") return "/fifa_2026.webp";
  const codes = [(slide.home.code || "").toUpperCase(), (slide.away.code || "").toUpperCase()];
  const names = [(slide.home.name || "").toUpperCase(), (slide.away.name || "").toUpperCase()];
  const has = (c, full) => codes.some((x) => x === c) || names.some((n) => n.includes(full));
  const hasIND = has("IND", "INDIA");
  if (hasIND && has("IRE", "IRELAND")) return IND_VS_IRE_IMG;
  if (hasIND && has("AFG", "AFGHANISTAN")) return "/india-vs-afg.avif";

  // Whoever India is playing — their flag says more than a stock photo does.
  const opponent = codes.find((c) => c && c !== "IND") || "";
  return flagImg(opponent) || flagImg(codes[0]) || "/banner.jpg";
}

// ─── BCCI HELPERS ─────────────────────────────────────────────────────────────
/* isIndiaMensMatch is shared with the home page strip and the sports page.
   This file used to carry its own copy that excluded one competition id and
   nothing else, so the hero would happily headline a match India was not in. */
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

// ─── FANCODE ──────────────────────────────────────────────────────────────────
// We cross-check each BCCI men's match against FanCode's live/scheduled list.
// If the same match is LIVE on FanCode, we use FanCode's match thumbnail here.
//
// Read through our own worker rather than a publisher's GitHub file directly.
// That file was one of several the site and the player each fetched on their
// own, in different shapes — so the two could disagree about what was on, and
// every change a publisher made had to be absorbed twice. The worker settles
// on one shape and one answer; this reshapes it to what the hero already reads.
async function fetchFancodeMatches() {
  const k = "hero_fancode_v2";
  const cached = getCached(k);
  if (cached !== null && cached !== undefined) return cached;
  try {
    const { live, upcoming } = await fetchTabFeed("fc");
    const shape = (m, status) => {
      const sides = splitTeams(m.name);
      return {
        matchId: m.id,
        category: m.category || "",
        titleRaw: m.name || "",
        title: (m.name || "").toLowerCase(),
        status,
        tournament: m.event || "",
        teams: sides ? [sides.home.toLowerCase(), sides.away.toLowerCase()] : [],
        teamNames: sides ? [sides.home, sides.away] : [],
        startTime: m.start || "",
        thumb: m.poster || m.logo || null,
      };
    };
    const matches = [
      ...live.map(m => shape(m, "LIVE")),
      ...upcoming.map(m => shape(m, "NOT_STARTED")),
    ];
    setCache(k, matches);
    return matches;
  } catch { setCache(k, []); return []; }
}

// Find a MEN's FanCode match for the two given team names (women's excluded).
function fcMatchForMens(fcList, homeName, awayName) {
  const h = (homeName || "").toLowerCase().trim();
  const a = (awayName || "").toLowerCase().trim();
  if (h.length < 3 || a.length < 3) return null;
  return fcList.find(fc => {
    if (fc.title.includes("women")) return false; // BCCI men's → skip women's feeds
    const hay = `${fc.title} ${fc.teams.join(" ")}`;
    return hay.includes(h) && hay.includes(a);
  }) || null;
}

// ─── FIFA / ICC HELPERS ───────────────────────────────────────────────────────
const ICC_FLAGS = {
  ENG:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",SL:"🇱🇰",AUS:"🇦🇺",IND:"🇮🇳",AFG:"🇦🇫",SA:"🇿🇦",
  PAK:"🇵🇰",NZ:"🇳🇿",WI:"🏴",SCO:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",IRE:"🇮🇪",BAN:"🇧🇩",NED:"🇳🇱",
};
function fmtDateIST(d) {
  try { return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",timeZone:"Asia/Kolkata"}); }
  catch { return ""; }
}

// ─── SIDE BUILDER ─────────────────────────────────────────────────────────────
// Bundles code + display name + logo + score + overs into ONE object per team,
// so a logo can never get attached to the wrong code/score again.
function buildSide({ code, name, logo, score, overs }) {
  return {
    code: code || "—",
    name: name || code || "—",
    logo: teamCrest(code, logo),
    score: score || null,
    overs: overs || null,
  };
}

// Derive a team code from an (optional) code and the team NAME — never defaults
// to "IND", so away tours (e.g. India in Zimbabwe) don't mislabel the home team.
const TEAM_NAME_TO_CODE = {
  "india":"IND","zimbabwe":"ZIM","australia":"AUS","england":"ENG","pakistan":"PAK",
  "sri lanka":"SL","south africa":"SA","new zealand":"NZ","west indies":"WI",
  "bangladesh":"BAN","afghanistan":"AFG","ireland":"IRE","netherlands":"NED",
  "nepal":"NEP","scotland":"SCO","namibia":"NAM","oman":"OMA","united states":"USA","uae":"UAE",
};
function teamCode(code, name) {
  if (code) return code;
  const n = (name || "").trim();
  if (!n) return "—";
  return TEAM_NAME_TO_CODE[n.toLowerCase()] || n.slice(0, 3).toUpperCase();
}

// ─── CACHE ────────────────────────────────────────────────────────────────────
const _cache={};
function getCached(k){const e=_cache[k];return(e&&Date.now()-e.ts<600000)?e.data:null;}
function setCache(k,d){_cache[k]={data:d,ts:Date.now()};}

// ─── HIGHLIGHT FETCHERS ───────────────────────────────────────────────────────
const FIFA_VIDEOS_API="https://cxm-api.fifa.com/fifaplusweb/api/sections/matchdetails/videos";


async function fetchIndiaHighlights(smMatchId){
  if(!smMatchId)return null;
  const k=`hero_india_hl_v2_${smMatchId}`;
  const cached=getCached(k);
  if(cached!==null&&cached!==undefined)return cached;
  try{
    const res=await fetch(`${API_BASE}/api/bcci/highlight?smMatchId=${smMatchId}`);
    if(!res.ok)return null;
    const json=await res.json();
    const videos=json.data||[];
    if(!videos.length){setCache(k,null);return null;}
    const mapped=videos.map(v=>({
      id:v._id||v.id,
      title:v.title||"Untitled",
      thumbnail:v.thumbnail_image||v.imageUrl||v.imageBackup||null,
      shortCode:v.short_code||null,
      urlSegment:v.titleUrlSegment||null,
    }));
    setCache(k,mapped);return mapped;
  }catch{return null;}
}

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
/* Nothing left to draw over a photograph. Kept as a component because the
   football hero has its own and the slide chooses between them; if the grid
   is ever wanted back for the fallback case, it belongs here. */
function CricketHeroBg(){
  return(
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Grid and giant blurred flag removed. They were drawn for the fallback
          background, where there is no photograph to compete with — over one,
          they are texture on top of a picture that did not need it. */}
      {/* No slowly rotating wash. It turned behind the hero forever, which
          reads as something loading that never finishes, and the artwork it
          sat under is the thing worth looking at. */}
    </div>
  );
}
function FootballHeroBg(){
  return(
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 opacity-[0.025]" style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(255,255,255,1) 49px,rgba(255,255,255,1) 50px)"}}/>
      {/* Removed with its cricket twin, for the same reason. */}
    </div>
  );
}

// ─── CRICKET SLIDE (BCCI-card style: badge + name stacked, centered VS, footer) ──
function CricketSlide({slide, onPlay}){
  const { home, away } = slide;
  const isLive=slide.status==="live";
  const isFinished=slide.status==="finished";
  const isUpcoming=slide.status==="upcoming";
  const fmtBadge=slide.matchFmt||"CRICKET";
  const isODI=fmtBadge==="ODI", isTest=fmtBadge==="Test";
  const fmtColor=isODI?"#f59e0b":isTest?"#ef4444":"#8b5cf6";
  const fmtBg=isODI?"rgba(245,158,11,0.15)":isTest?"rgba(239,68,68,0.15)":"rgba(139,92,246,0.15)";
  const fmtBorder=isODI?"rgba(245,158,11,0.3)":isTest?"rgba(239,68,68,0.3)":"rgba(139,92,246,0.3)";

  // ── Highlight support ──────────────────────────────────────────────────────
  const highlight=slide.highlight||null;
  const bestClip=Array.isArray(highlight)
    ?(highlight.find(v=>(v.title||"").toLowerCase().includes("match highlights"))||highlight[0])
    :highlight;
  const [playerModal,setPlayerModal]=useState(null);
  const [streamLoading,setStreamLoading]=useState(false);

  // Background priority:
  //  1. FanCode thumbnail when the match is live on FanCode,
  //  2. highlight thumbnail for finished matches,
  //  3. static fallback by teams.
  const fallbackBg=resolveThumbnail(slide);
  const bgImg=slide.fancodeThumb
    ? slide.fancodeThumb
    : (isFinished&&bestClip?.thumbnail)?bestClip.thumbnail:fallbackBg;
  const isIndiaAfg=fallbackBg.includes("india-vs-afg");
  const base=isIndiaAfg?"#0a0008":"#0a0015";
  const btm=isIndiaAfg?"#06000a":"#030007";

  const openHighlight=async(e)=>{
    e.preventDefault();e.stopPropagation();
    if(!bestClip||streamLoading)return;
    const watchUrl=bestClip.shortCode
      ?`https://www.bcci.tv/bccilink/videos/${bestClip.shortCode}`
      :bestClip.urlSegment
      ?`https://www.bcci.tv/videos/${bestClip.urlSegment}`
      :null;
    if(!watchUrl)return;
    setStreamLoading(true);
    try{
      const res=await fetch(`${API_BASE}/api/get-stream?url=${encodeURIComponent(watchUrl)}`);
      const json=await res.json();
      if(res.ok&&json.success&&json.url){
        const params=new URLSearchParams({url:json.url,title:bestClip.title||"Watch"});
        setPlayerModal({src:`/player.html?${params}`,title:bestClip.title||"Watch"});
        setStreamLoading(false);return;
      }
    }catch{}
    setStreamLoading(false);
  };

  return(
    <div className="relative w-full h-full select-none">
      {/* ── Fullscreen player modal ── */}
      {playerModal&&(
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.96)",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:"rgba(0,0,0,0.7)",flexShrink:0}}>
            <span style={{color:fmtColor,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.15em"}}>▶ {playerModal.title}</span>
            <button onClick={()=>setPlayerModal(null)} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"#fff",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          <iframe src={playerModal.src} style={{flex:1,width:"100%",border:"none"}} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen/>
        </div>
      )}

      <div className="absolute inset-0">
        <img src={bgImg} alt="" className="w-full h-full object-cover animate-fade-in"
          style={{objectPosition:"center 22%"}}
          onError={(e)=>{ if(e.currentTarget.src!==fallbackBg){ e.currentTarget.onerror=null; e.currentTarget.src=fallbackBg; } }}/>
        {/* The picture has to survive this.
            Five layers were darkening it — these three, a vignette, and the
            textured background painted over the top — and deepening two of
            them turned most of the frame black with a sliver of photo on the
            right. They are back to carrying the copy and no more: the left
            wash clears by 62% so the subjects stay lit, the floor lifts by
            just over half, and the vignette is a suggestion rather than a
            frame. Text sits bottom-left, where the floor and the wash overlap
            and both are near solid. */}
        <div className="absolute inset-0" style={{background:`linear-gradient(100deg, ${base}f2 0%, ${base}cc 24%, ${base}70 44%, transparent 62%)`}}/>
        <div className="absolute bottom-0 left-0 right-0" style={{height:"56%",background:`linear-gradient(to top, ${btm}f7 0%, ${btm}b8 30%, transparent 100%)`}}/>
        <div className="absolute top-0 left-0 right-0 h-24" style={{background:`linear-gradient(to bottom, ${btm}b3, transparent)`}}/>
        <div className="absolute inset-0 pointer-events-none" style={{boxShadow:"inset 0 0 110px 8px rgba(0,0,0,0.30)"}}/>
      </div>
      <CricketHeroBg/>

      <div className="relative z-10 flex flex-col justify-end h-full px-4 sm:px-8 pb-5 sm:pb-7 pt-4 sm:pt-5">

        {/* ── Commentary languages ──
            Above the badges rather than among them: the badges say what the
            match is, this says how it can be heard, and mixing the two made
            "Hindi" look like the name of a competition. Named, not counted —
            it is the name that decides whether someone presses play — and the
            one the player will open in comes first and is marked. Absent for a
            single language, which offers nothing to choose. */}
        {Array.isArray(slide.languages) && slide.languages.length > 1 && (
          <div className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2 flex-wrap"
               aria-label={`Commentary in ${slide.languages.map(langName).join(", ")}`}>
            <span className="font-black uppercase tracking-widest text-white/50 mr-0.5"
              style={{fontSize:"clamp(7px,1.8vw,9px)"}}>
              🎙
            </span>
            {slide.languages.map((c, i) => (
              <span key={c}
                className={`px-1.5 sm:px-2 py-0.5 rounded-full font-bold border
                            ${i === 0
                              ? "bg-white text-black border-white"
                              : "bg-black/40 text-white/85 border-white/20"}`}
                style={{fontSize:"clamp(7px,1.8vw,10px)"}}>
                {langName(c)}
              </span>
            ))}
          </div>
        )}

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
          {isFinished&&bestClip&&(
            <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border font-black uppercase tracking-widest"
              style={{fontSize:"clamp(7px,1.8vw,9px)",background:"rgba(249,115,22,0.15)",borderColor:"rgba(249,115,22,0.3)",color:"#fb923c"}}>
              ▶ Highlights
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
          {isFinished&&bestClip&&(
            <p className="font-bold truncate" style={{fontSize:"clamp(8px,2vw,10px)",color:"#fb923c",maxWidth:"70%"}}>▶ {bestClip.title}</p>
          )}
        </div>

        {/* ── CTA / footer ── */}
        {isFinished&&bestClip?(
          <button onClick={openHighlight} disabled={streamLoading}
            className="flex items-center gap-1.5 w-fit rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all active:scale-95 hover:scale-[1.03] disabled:opacity-60"
            style={{
              fontSize:"clamp(8px,2vw,13px)",
              padding:"clamp(7px,1.6vw,12px) clamp(12px,2.8vw,20px)",
              background:"linear-gradient(135deg,#f97316,#ea580c)",
              boxShadow:"0 0 20px rgba(249,115,22,0.45),0 4px 12px rgba(0,0,0,0.4)",
              color:"#fff",cursor:"pointer",border:"none",
            }}>
            {streamLoading
              ?<div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:"rgba(255,255,255,0.3)",borderTopColor:"#fff"}}/>
              :<Play style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}} fill="currentColor"/>
            }
            {streamLoading?"Loading…":"Watch Highlights"}
          </button>
        ):(
          slide.playSrc ? (
          /* A fixture we can actually play opens in place. Everything else is
             a scorecard or a highlight, which lives on its own route. */
          <button type="button" onClick={()=>onPlay&&onPlay(slide)}
            className="flex items-center gap-1.5 w-fit rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all active:scale-95 hover:scale-[1.03]"
            style={{
              fontSize:"clamp(8px,2vw,13px)",
              padding:"clamp(7px,1.6vw,12px) clamp(12px,2.8vw,20px)",
              background:`linear-gradient(135deg,${fmtColor},${isODI?"#b45309":isTest?"#b91c1c":"#6d28d9"})`,
              boxShadow:`0 0 20px ${fmtColor}44,0 4px 12px rgba(0,0,0,0.4)`,
              color:"#fff",
            }}>
            {/* No play triangle on a fixture that has not started — the icon
                is a promise, and an upcoming match cannot keep it. */}
            {!isUpcoming&&<Play style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}} fill="currentColor"/>}
            {isUpcoming&&<Clock style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}}/>}
            {slide.scorecardOnly?"View Scorecard"
              :isLive?"Watch Live"
              :isFinished?"View Scorecard"
              :slide.countdown?`Starts ${slide.countdown}`
              :slide.timeLabel?`Starts ${slide.timeLabel}`
              :"Match Preview"}
          </button>
          ) : (
          <Link to={slide.link || "/live-cricket-tv"}
            className="flex items-center gap-1.5 w-fit rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all active:scale-95 hover:scale-[1.03]"
            style={{
              fontSize:"clamp(8px,2vw,13px)",
              padding:"clamp(7px,1.6vw,12px) clamp(12px,2.8vw,20px)",
              background:`linear-gradient(135deg,${fmtColor},${isODI?"#b45309":isTest?"#b91c1c":"#6d28d9"})`,
              boxShadow:`0 0 20px ${fmtColor}44,0 4px 12px rgba(0,0,0,0.4)`,
              color:"#fff",
            }}>
            {/* No play triangle on a fixture that has not started — the icon
                is a promise, and an upcoming match cannot keep it. */}
            {!isUpcoming&&<Play style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}} fill="currentColor"/>}
            {isUpcoming&&<Clock style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}}/>}
            {slide.scorecardOnly?"View Scorecard"
              :isLive?"Watch Live"
              :isFinished?"View Scorecard"
              :slide.countdown?`Starts ${slide.countdown}`
              :slide.timeLabel?`Starts ${slide.timeLabel}`
              :"Match Preview"}
          </Link>
          )
        )}
      </div>
    </div>
  );
}

// ─── FOOTBALL SLIDE (same badge-over-name BCCI layout) ───────────────────────
function FootballSlide({slide, onPlay}){
  const { home, away } = slide;
  const isLive=slide.status==="live";
  const isFinished=slide.status==="finished";
  const isUpcoming=slide.status==="upcoming";
  const hWon=isFinished&&home.score>away.score;
  const aWon=isFinished&&away.score>home.score;

  // ── Highlight support ──────────────────────────────────────────────────────
  const highlight=slide.highlight||null;
  const [playerModal,setPlayerModal]=useState(null);
  const [streamLoading,setStreamLoading]=useState(false);

  // Use highlight thumbnail (from FIFA API) as background for finished matches
  const bgSrc=(isFinished&&highlight?.thumbnail)?highlight.thumbnail:"/fifa_2026.webp";

  const openHighlight=async(e)=>{
    e.preventDefault();e.stopPropagation();
    if(!highlight||streamLoading)return;
    const watchUrl=highlight.watchPath?`https://www.fifa.com${highlight.watchPath}`:null;
    if(!watchUrl)return;
    setStreamLoading(true);
    try{
      const res=await fetch(`${API_BASE}/api/get-stream?url=${encodeURIComponent(watchUrl)}`);
      const json=await res.json();
      if(res.ok&&json.success&&json.url){
        const params=new URLSearchParams({url:json.url,title:highlight.title||"Highlights"});
        setPlayerModal({src:`/player.html?${params}`,title:highlight.title||"Highlights"});
        setStreamLoading(false);return;
      }
    }catch{}
    setStreamLoading(false);
  };

  return(
    <div className="relative w-full h-full select-none">
      {/* ── Fullscreen player modal ── */}
      {playerModal&&(
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.96)",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:"rgba(0,0,0,0.7)",flexShrink:0}}>
            <span style={{color:"#1ed596",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.15em"}}>▶ {playerModal.title}</span>
            <button onClick={()=>setPlayerModal(null)} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"#fff",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          <iframe src={playerModal.src} style={{flex:1,width:"100%",border:"none"}} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen/>
        </div>
      )}

      <div className="absolute inset-0">
        <img src={bgSrc} alt="" className="w-full h-full object-cover animate-fade-in" style={{objectPosition:"center 22%"}}/>
        <div className="absolute inset-0" style={{background:"linear-gradient(105deg, #001a0a 0%, rgba(0,26,10,0.95) 26%, rgba(0,26,10,0.6) 46%, transparent 72%)"}}/>
        <div className="absolute bottom-0 left-0 right-0" style={{height:"62%",background:"linear-gradient(to top, #000d05 4%, rgba(0,13,5,0.8) 32%, transparent 100%)"}}/>
        <div className="absolute top-0 left-0 right-0 h-24" style={{background:"linear-gradient(to bottom, rgba(0,13,5,0.9), transparent)"}}/>
        <div className="absolute inset-0 pointer-events-none" style={{boxShadow:"inset 0 0 140px 40px rgba(0,0,0,0.55)"}}/>
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
          {isFinished&&highlight&&(
            <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border font-black uppercase tracking-widest"
              style={{fontSize:"clamp(7px,1.8vw,9px)",background:"rgba(249,115,22,0.15)",borderColor:"rgba(249,115,22,0.3)",color:"#fb923c"}}>
              ▶ Highlights
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
          {isFinished&&highlight&&(
            <p className="font-bold truncate" style={{fontSize:"clamp(8px,2vw,10px)",color:"#fb923c",maxWidth:"70%"}}>▶ {highlight.title}</p>
          )}
        </div>

        {/* ── CTA ── */}
        {isFinished&&highlight?(
          <button onClick={openHighlight} disabled={streamLoading}
            className="flex items-center gap-1.5 w-fit rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all active:scale-95 hover:scale-[1.03] disabled:opacity-60"
            style={{
              fontSize:"clamp(8px,2vw,13px)",
              padding:"clamp(7px,1.6vw,12px) clamp(12px,2.8vw,20px)",
              background:"linear-gradient(135deg,#f97316,#ea580c)",
              boxShadow:"0 0 20px rgba(249,115,22,0.45),0 4px 12px rgba(0,0,0,0.4)",
              color:"#fff",cursor:"pointer",border:"none",
            }}>
            {streamLoading
              ?<div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:"rgba(255,255,255,0.3)",borderTopColor:"#fff"}}/>
              :<Play style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}} fill="currentColor"/>
            }
            {streamLoading?"Loading…":"Watch Highlights"}
          </button>
        ):(
          slide.playSrc ? (
          /* A fixture we can actually play opens in place. Everything else is
             a scorecard or a highlight, which lives on its own route. */
          <button type="button" onClick={()=>onPlay&&onPlay(slide)}
            className="flex items-center gap-1.5 w-fit rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all active:scale-95 hover:scale-[1.03]"
            style={{
              fontSize:"clamp(8px,2vw,13px)",
              padding:"clamp(7px,1.6vw,12px) clamp(12px,2.8vw,20px)",
              background:"linear-gradient(135deg,#1ed596,#059669)",
              boxShadow:"0 0 20px rgba(30,213,150,0.4),0 4px 12px rgba(0,0,0,0.4)",
              color:"#fff",
            }}>
            {!isUpcoming&&<Play style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}} fill="currentColor"/>}
            {isUpcoming&&<Clock style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}}/>}
            {slide.scorecardOnly?"View Scorecard"
              :isLive?"Watch Live"
              :isFinished?"Match Highlights"
              :slide.countdown?`Starts ${slide.countdown}`
              :slide.timeLabel?`Starts ${slide.timeLabel}`
              :"Match Preview"}
          </button>
          ) : (
          <Link to={slide.link || "/live-cricket-tv"}
            className="flex items-center gap-1.5 w-fit rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all active:scale-95 hover:scale-[1.03]"
            style={{
              fontSize:"clamp(8px,2vw,13px)",
              padding:"clamp(7px,1.6vw,12px) clamp(12px,2.8vw,20px)",
              background:"linear-gradient(135deg,#1ed596,#059669)",
              boxShadow:"0 0 20px rgba(30,213,150,0.4),0 4px 12px rgba(0,0,0,0.4)",
              color:"#fff",
            }}>
            {!isUpcoming&&<Play style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}} fill="currentColor"/>}
            {isUpcoming&&<Clock style={{width:"clamp(11px,2.2vw,15px)",height:"clamp(11px,2.2vw,15px)"}}/>}
            {slide.scorecardOnly?"View Scorecard"
              :isLive?"Watch Live"
              :isFinished?"Match Highlights"
              :slide.countdown?`Starts ${slide.countdown}`
              :slide.timeLabel?`Starts ${slide.timeLabel}`
              :"Match Preview"}
          </Link>
          )
        )}
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
        const hCrest=home.logo, aCrest=away.logo;
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
                {hCrest
                  ? <img src={hCrest} alt="" className="w-4 h-4 object-contain shrink-0"/>
                  : <span style={{fontSize:16,lineHeight:1}}>{hFlag}</span>}
                <span className="text-[7px] font-black text-white/50 uppercase">{home.code} v {away.code}</span>
                {aCrest
                  ? <img src={aCrest} alt="" className="w-4 h-4 object-contain shrink-0"/>
                  : <span style={{fontSize:16,lineHeight:1}}>{aFlag}</span>}
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
  // A fixture the hero can play opens here rather than on the player's site.
  const [playing,setPlaying]=useState(null);
  const [transitioning,setTransitioning]=useState(false);
  const timerRef=useRef(null);

  const buildSlides=useCallback(async()=>{
    const ck="hero_slides_v11";   // v11: carries watchable fixtures; v10 caches have none
    const cached=getCached(ck);
    if(cached){setSlides(cached);setLoading(false);return;}

    const liveC=[],finC=[],upC=[];

    // FanCode feed (DOCTOR_STRANGE) — used to detect if a BCCI match is live there.
    const fcList = await fetchFancodeMatches();

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
            code: teamCode(m.HomeTeamCode, m.HomeTeamName), name: m.HomeTeamName, logo: m.MatchHomeTeamLogo,
            score: homeIsFirst ? inn1 : inn2,
            overs: homeIsFirst ? m["1FallOvers"] : m["2FallOvers"],
          });
          const away = buildSide({
            code: teamCode(m.AwayTeamCode, m.AwayTeamName), name: m.AwayTeamName, logo: m.MatchAwayTeamLogo,
            score: homeIsFirst ? inn2 : inn1,
            overs: homeIsFirst ? m["2FallOvers"] : m["1FallOvers"],
          });
          const fcLive = fcMatchForMens(fcList, m.HomeTeamName, m.AwayTeamName);
          liveC.push({
            id:`bcci-live-${m.MatchID}`, sport:"cricket", status:"live",
            link: bcciLink(m, home, away),
            home, away,
            tournament: m.CompetitionName || "India Cricket",
            matchFmt: bcciFmt(m.MatchType),
            venue: m.GroundName ? `${m.GroundName}${m.city?`, ${m.city}`:""}` : "",
            tossText: m.TossDetails || null,
            result: m.ChasingText || null,
            strikerName: m.CurrentStrikerName || null,
            strikerRuns: m.StrikerRuns ?? null,
            strikerBalls: m.StrikerBalls ?? null,
            // If this match exists on FanCode (scheduled OR live), use FanCode's
            // real match thumbnail instead of the generic fallback.
            fancodeThumb: fcLive ? fcLive.thumb : null,
            fancodeLive: !!(fcLive && fcLive.status === "LIVE"),
          });
        }
      }

      if(recentRes.status==="fulfilled"&&recentRes.value.ok){
        const j=await recentRes.value.json();
        for(const m of (j.recentMatches||j.postMatches||[]).filter(isIndiaMensMatch).slice(0,2)){
          const homeIsFirst = m.FirstBattingTeamID && String(m.FirstBattingTeamID)===String(m.HomeTeamID);
          const inn1 = m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]}` : null;
          const inn2 = m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]}` : null;
          const home = buildSide({ code: teamCode(m.HomeTeamCode, m.HomeTeamName), name: m.HomeTeamName, logo: m.MatchHomeTeamLogo, score: homeIsFirst ? inn1 : inn2 });
          const away = buildSide({ code: teamCode(m.AwayTeamCode, m.AwayTeamName), name: m.AwayTeamName, logo: m.MatchAwayTeamLogo, score: homeIsFirst ? inn2 : inn1 });
          finC.push({
            id:`bcci-fin-${m.MatchID}`, sport:"cricket", status:"finished",
            link: bcciLink(m, home, away),
            home, away,
            tournament: m.CompetitionName || "India Cricket",
            matchFmt: bcciFmt(m.MatchType),
            venue: m.GroundName ? `${m.GroundName}${m.city?`, ${m.city}`:""}` : "",
            result: m.Comments || m.Commentss || null,
            smMatchId: m.SmMatchID || m.MatchID,  // used for highlight fetching
          });
        }
      }

      if(upRes.status==="fulfilled"&&upRes.value.ok){
        const j=await upRes.value.json();
        for(const m of (j.upcomingMatches||[]).filter(isIndiaMensMatch).slice(0,2)){
          const home = buildSide({ code: teamCode(m.HomeTeamCode, m.HomeTeamName), name: m.HomeTeamName, logo: m.MatchHomeTeamLogo });
          const away = buildSide({ code: teamCode(m.AwayTeamCode, m.AwayTeamName), name: m.AwayTeamName, logo: m.MatchAwayTeamLogo });
          // A scheduled BCCI match that is already LIVE on FanCode → promote to live
          // (route into liveC so ordering treats it as live) and use FanCode's thumbnail.
          const fcUp = fcMatchForMens(fcList, m.HomeTeamName, m.AwayTeamName);
          const fcNowLive = !!(fcUp && fcUp.status === "LIVE");
          const upSlide = {
            id:`bcci-up-${m.MatchID}`, sport:"cricket", status: fcNowLive ? "live" : "upcoming",
            link: bcciLink(m, home, away),
            home, away,
            tournament: m.CompetitionName || "India Cricket",
            matchFmt: bcciFmt(m.MatchType),
            venue: m.GroundName ? `${m.GroundName}${m.city?`, ${m.city}`:""}` : "",
            dateLabel: bcciFmtDate(m.MatchDate),
            timeLabel: bcciFmtTime(m.CustomMatchTime || m.MatchTime || ""),
            countdown: countdownLabel(m.MatchDate),
            // Present on FanCode (scheduled or live) → use its real thumbnail.
            fancodeThumb: fcUp ? fcUp.thumb : null,
            fancodeLive: fcNowLive,
          };
          if (fcNowLive) liveC.push(upSlide); else upC.push(upSlide);
        }
      }
    }catch{}

    // ── FanCode standalone matches (scorecard only, no video) ──
    // Any FanCode cricket match not already shown via BCCI → its own hero card
    // that opens the FanCode scorecard match center. Video stream is not linked.
    try{
      const shown = new Set();
      for (const s of [...liveC, ...upC, ...finC]) {
        shown.add([s.home?.name, s.away?.name].map(x => (x || "").toLowerCase()).sort().join("|"));
      }
      let fcLiveN = 0, fcUpN = 0;
      for (const fc of fcList) {
        if (!fc.matchId) continue;
        if (fc.category && fc.category.toLowerCase() !== "cricket") continue;
        if (fc.status !== "LIVE" && fc.status !== "NOT_STARTED") continue;
        const names = fc.teamNames.length >= 2 ? fc.teamNames : fc.titleRaw.split(/\s+vs\s+/i).map(x => x.trim());
        if (names.length < 2) continue;
        const key = names.slice(0, 2).map(x => x.toLowerCase()).sort().join("|");
        if (shown.has(key)) continue;              // already shown via BCCI
        if (fc.status === "LIVE" ? fcLiveN >= 3 : fcUpN >= 3) continue;
        shown.add(key);
        if (fc.status === "LIVE") fcLiveN++; else fcUpN++;
        const home = buildSide({ code: teamCode(null, names[0]), name: names[0] });
        const away = buildSide({ code: teamCode(null, names[1]), name: names[1] });
        const slide = {
          id: `fc-${fc.matchId}`, sport: "cricket",
          status: fc.status === "LIVE" ? "live" : "upcoming",
          link: fcLink(fc), scorecardOnly: true,   // hero button → "View Scorecard"
          home, away,
          tournament: fc.tournament || "FanCode",
          matchFmt: "CRICKET", venue: "",
          fancodeThumb: fc.thumb || null,
          fancodeLive: fc.status === "LIVE",
          timeLabel: fc.startTime || "",
        };
        if (fc.status === "LIVE") liveC.push(slide); else upC.push(slide);
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
            link: mcLink({ sport:"cricket", type:"wt20", matchId:m.match_id, homeCode:m.teama_short||"", awayCode:m.teamb_short||"", leagueLabel:"ICC WT20 WC 2026" }),
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
            link: mcLink({ sport:"cricket", type:"wt20", matchId:m.match_id, homeCode:m.teama_short||"", awayCode:m.teamb_short||"", leagueLabel:"ICC WT20 WC 2026" }),
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
            link: mcLink({ sport:"cricket", type:"wt20", matchId:m.match_id, homeCode:m.teama_short||"", awayCode:m.teamb_short||"", leagueLabel:"ICC WT20 WC 2026" }),
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

    /* FIFA is no longer carried in this hero. It is a cricket page — the
       scores strip, every highlights row, the tournaments and both Watch Live
       shortcuts are cricket — and a World Cup fixture appearing in the rotation
       read as a different site's content dropped into the middle of this one.
       Football still has its own slide component and match-centre route; it
       simply does not take a turn in the headline any more. */

    // ── Fetch highlights for finished slides in parallel ──────────────────────
    // Highlights show in the hero from the moment the match ends until the next
    // live match of that tournament starts (the ordering below already handles
    // suppressing finished slides when a live one exists).
    await Promise.allSettled([
      ...finC.map(s=>
        fetchIndiaHighlights(s.smMatchId)
          .then(h=>{if(h)s.highlight=h;})
          .catch(()=>{})
      ),
    ]);

    /* ── Anything playable right now, and what is next ──
       BCCI knows the fixtures; only these feeds know which of them can
       actually be watched. A live one earns the top of the hero, because it is
       the single most useful thing this page can offer at that moment.
       Upcoming ones fill in behind, two from each source, India first. */
    const playC=[], playUpC=[];
    try{
      const { live: fxLive, upcoming: fxSoon } = await fetchHeroFixtures({ upcomingPerSource: 2 });

      const toSlide=(m,status)=>{
        const sides = splitTeams(m.name);
        /* Same as the home hero: the code comes from the name, or the flag
           has nothing to look up. */
        const home = buildSide({ code: codeForTeam(sides ? sides.home : m.name),
                                 name: sides ? sides.home : (m.name||"") });
        const away = sides ? buildSide({ code: codeForTeam(sides.away), name: sides.away }) : null;
        return {
          id:`fx-${m.tabKey}-${m.id}`, sport:"cricket", status,
          // Plays in place — see playSrc below; no link to follow off the page.
          link:null, playSrc: heroPlayUrl(m), playTitle: m.name,
          home, away,
          heroImage: m.poster || m.logo || null,
          fancodeThumb: m.poster || m.logo || null,   // what the slide reads for its backdrop
          tournament: m.event || m.source,
          matchFmt: m.category || "",
          venue:"",
          dateLabel:"", timeLabel: m.start || "",
          countdown:"",
          watchOn: m.source,
          // Which commentaries it has, the one it opens in first.
          languages: m.langs || [],
        };
      };

      /* Two live at most. The hero holds four slides and BCCI's own live and
         finished matches want a place in it too. */
      fxLive.slice(0,2).forEach(m=>playC.push(toSlide(m,"live")));
      fxSoon.forEach(m=>playUpC.push(toSlide(m,"upcoming")));
    }catch{ /* the feeds are optional; BCCI still fills the hero */ }

    /* Order: what can be watched now, then BCCI's live, then just-finished,
       then what is coming up. Without football to interleave, this is simply
       the cricket in priority order — the old version needed four branches to
       decide whose turn it was. */
    const final=[...playC, ...liveC, ...finC, ...upC, ...playUpC].filter(Boolean).slice(0,4);
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

  /* Nothing to show. Previously a FIFA fixture would almost always fill the
     hero, so an empty cricket list was hidden; now an off-season day would sit
     on the loading skeleton forever, because loading is false but there is no
     active slide. */
  if(!loading&&!active){
    return(
      <section className="relative w-full overflow-hidden bg-gray-950 rounded-none sm:rounded-2xl
                          flex flex-col items-center justify-center text-center px-6"
        style={{height:"clamp(220px,30vw,340px)"}}>
        <p className="text-gray-300 font-black uppercase tracking-widest text-xs">No matches right now</p>
        <p className="text-gray-500 text-[12px] mt-2 max-w-sm leading-relaxed">
          Live scores appear here as soon as a match starts. Highlights and fixtures are below.
        </p>
      </section>
    );
  }

  if(loading||!active){
    return(
      <>
        <section className="relative w-full overflow-hidden bg-gray-950 rounded-none sm:rounded-2xl"
          style={{height:"clamp(320px,46vw,520px)"}}>
          <div className="absolute inset-0 shimmer"/>
          <div className="relative z-10 flex flex-col justify-end h-full px-5 sm:px-8 pb-6 sm:pb-8">
            <div className="h-3.5 w-28 rounded-full bg-white/[0.06] mb-3"/>
            <div className="h-9 sm:h-12 w-52 sm:w-72 rounded-xl bg-white/[0.06] mb-3"/>
            <div className="h-3 w-40 rounded bg-white/[0.06] mb-5"/>
            <div className="h-10 w-32 rounded-xl bg-white/[0.06]"/>
          </div>
        </section>
      </>
    );
  }

  return(
    <>
      <style>{`
        .animate-fade-in{animation:fadeIn 0.4s ease-out forwards}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>

      {/* The hero was #030007 under a violet wash, with a purple progress bar and
          purple dots — a colour scheme belonging to nothing else on the site.
          Neutral ground, white controls: the artwork and the scores carry the
          colour now. */}
      <section className="relative w-full overflow-hidden bg-gray-950 rounded-none sm:rounded-2xl"
        style={{height:"clamp(320px,46vw,520px)"}}>

        <div className="absolute inset-0 transition-opacity duration-300" style={{opacity:transitioning?0:1}}>
          {isCricket
            ?<CricketSlide slide={active} onPlay={setPlaying}/>
            :<FootballSlide slide={active} onPlay={setPlaying}/>}

          <LiveViewer
            open={!!playing}
            title={playing?.playTitle || ""}
            src={playing?.playSrc || ""}
            onClose={()=>setPlaying(null)}
          />
        </div>

        {/* One arrow style for both ends and both breakpoints. The desktop
            "next" used to be positioned with calc(0.75rem + 356px) to dodge the
            thumbnail strip, which put it in mid-air whenever the strip was not
            there. It now sits at the edge like its twin, under the strip. */}
        {slides.length>1&&(
          <>
            <button onClick={()=>{goPrev();resetTimer();}} aria-label="Previous match"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full
                         flex items-center justify-center bg-black/60 backdrop-blur-md
                         ring-1 ring-white/15 text-white hover:bg-black/80 transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <button onClick={()=>{goNext();resetTimer();}} aria-label="Next match"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full
                         flex items-center justify-center bg-black/60 backdrop-blur-md
                         ring-1 ring-white/15 text-white hover:bg-black/80 transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <ChevronRight className="w-5 h-5"/>
            </button>
          </>
        )}

        {/* Mobile dots — white, like every other indicator on the site. */}
        {slides.length>1&&(
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:hidden">
            {slides.map((_,i)=>(
              <button key={i} onClick={()=>handleSelect(i)} aria-label={`Match ${i+1}`}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i===activeIdx ? "w-5 bg-white" : "w-1.5 bg-white/30"}`}/>
            ))}
          </div>
        )}

        {slides.length>1&&<ThumbnailStrip slides={slides} activeIdx={activeIdx} onSelect={handleSelect}/>}

        {/* No progress bar. A white line crawling across the foot of the hero
            every eight seconds draws the eye away from the match it sits under
            and tells nobody anything they wanted — the deck still advances on
            its own, and the dots and the strip both say where it is. */}
      </section>
    </>
  );
}
