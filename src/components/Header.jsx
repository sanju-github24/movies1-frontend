import React, { useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { FaWhatsapp, FaTelegramPlane } from "react-icons/fa";
import { Copy, CornerRightDown, Zap, Film, MonitorPlay, Clock, Sparkles, ChevronRight } from "lucide-react";
import { AppContext } from "../context/AppContext";
import MatchCenter from "../paged/MatchCenter";
// ─── MATCH HASH ENCODER ───────────────────────────────────────────────────────
function encodeMatchHash(payload) {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const API_BASE         = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
const FIFA_API_BASE    = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION = "17";
const FIFA_SEASON      = "285023";
const FIFA_STAGE       = "289273";
const WT20_SERIES_ID   = "12672";

// ─── FLAGS / HELPERS ──────────────────────────────────────────────────────────
const ICC_FLAGS = {
  ENG:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",SL:"🇱🇰",AUS:"🇦🇺",SA:"🇿🇦",IND:"🇮🇳",AFG:"🇦🇫",
  PAK:"🇵🇰",NZ:"🇳🇿",WI:"🏴",SCO:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",IRE:"🇮🇪",BAN:"🇧🇩",NED:"🇳🇱",
};
function getFlag(c) { return ICC_FLAGS[c] || "🏏"; }
function getFifaFlag(code) { return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`; }
const BCCI_FMT = { "One Day D/N":"ODI","One Day":"ODI","T20":"T20I","Test":"Test","Test D/N":"Test" };
function bcciFmt(t) { return BCCI_FMT[t] || t || "MATCH"; }
function fifaName(t) { return t?.TeamName?.find(x=>x.Locale==="en-GB")?.Description||t?.Abbreviation||""; }
function fifaStatus(m) {
  if (m.MatchStatus===3) return "live";
  if (m.HomeTeamScore!==null&&m.HomeTeamScore!==undefined) return "finished";
  return "upcoming";
}

// ─── LIVE SPORTS HOOK ─────────────────────────────────────────────────────────
function useLiveSports() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    const out = [];

    // BCCI India cricket
    try {
      const r = await fetch(`${API_BASE}/api/bcci/live`);
      if (r.ok) {
        const j = await r.json();
        (j.liveMatches||[]).forEach(m => out.push({
          id: `bcci-${m.MatchID}`,
          sport: "cricket", type: "bcci",
          badge: bcciFmt(m.MatchType),
          homeCode: m.FirstBattingTeamCode||"—",
          awayCode: m.SecondBattingTeamCode||"—",
          homeFlag: getFlag(m.FirstBattingTeamCode),
          awayFlag: getFlag(m.SecondBattingTeamCode),
          homeScore: m["1FallScore"] ? `${m["1FallScore"]}/${m["1FallWickets"]||0}` : null,
          awayScore: m["2FallScore"] ? `${m["2FallScore"]}/${m["2FallWickets"]||0}` : null,
          homeOvers: m["1FallOvers"]||"",
          striker: m.CurrentStrikerName ? `★ ${m.CurrentStrikerName} ${m.StrikerRuns}(${m.StrikerBalls})` : "",
          status: m.ChasingText||"",
          hash: encodeMatchHash({
            sport:"cricket", type:"bcci",
            homeCode: m.FirstBattingTeamCode||"—",
            awayCode: m.SecondBattingTeamCode||"—",
            matchData: m,
          }),
        }));
      }
    } catch {}

    // WT20 Women's T20 WC
    try {
      const r = await fetch(`${API_BASE}/api/wt20/schedule?series_ids=${WT20_SERIES_ID}&game_count=10`);
      if (r.ok) {
        const j = await r.json();
        (j.data?.matches||[]).filter(m=>m.live).forEach(m => {
          const sc = m.scores?.[0];
          out.push({
            id: `wt20-${m.match_id}`,
            sport: "cricket", type: "wt20",
            badge: "T20I",
            homeCode: m.teama_short||"—",
            awayCode: m.teamb_short||"—",
            homeFlag: getFlag(m.teama_short),
            awayFlag: getFlag(m.teamb_short),
            homeScore: sc ? `${sc.team_runs}/${sc.team_wickets}` : null,
            awayScore: null,
            homeOvers: sc?.team_overs||"",
            striker: "",
            status: m.match_result||"",
            hash: encodeMatchHash({
              sport:"cricket", type:"wt20",
              homeCode: m.teama_short||"—",
              awayCode: m.teamb_short||"—",
              matchId: m.match_id,
            }),
          });
        });
      }
    } catch {}

    // FIFA WC 2026
    try {
      const r = await fetch(
        `${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`,
        { headers: { Accept:"application/json" } }
      );
      if (r.ok) {
        const j = await r.json();
        (j.Results||[]).filter(m=>fifaStatus(m)==="live").forEach(m => {
          const h=m.Home, a=m.Away;
          out.push({
            id: `fifa-${m.IdMatch}`,
            sport: "football", type: "fifa",
            badge: "FIFA WC",
            homeCode: h?.Abbreviation||fifaName(h)||"—",
            awayCode: a?.Abbreviation||fifaName(a)||"—",
            homeFlagUrl: getFifaFlag(h?.IdCountry),
            awayFlagUrl: getFifaFlag(a?.IdCountry),
            homeScore: m.HomeTeamScore??null,
            awayScore: m.AwayTeamScore??null,
            homeOvers: "",
            striker: "",
            status: m.MatchTime||"",
            hash: encodeMatchHash({
              sport:"football", type:"fifa",
              homeCode: h?.Abbreviation||fifaName(h)||"—",
              awayCode: a?.Abbreviation||fifaName(a)||"—",
              matchId: m.IdMatch,
            }),
          });
        });
      }
    } catch {}

    setMatches(out);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch_();
    const t = setInterval(fetch_, 45000);
    return () => clearInterval(t);
  }, [fetch_]);

  return { matches, loading };
}

// ─── PULSING DOT ──────────────────────────────────────────────────────────────
function Dot({ color="#ef4444", size=5 }) {
  return (
    <span className="relative flex shrink-0" style={{width:size,height:size}}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{background:color}}/>
      <span className="relative inline-flex rounded-full h-full w-full"
        style={{background:color}}/>
    </span>
  );
}

// ─── LIVE MATCH STRIP ─────────────────────────────────────────────────────────
// Clean inline card(s) — one row per live match, click → match center
function LiveMatchStrip() {
  const { matches, loading } = useLiveSports();
  const navigate = useNavigate();

  if (loading || matches.length === 0) return null;

  return (
    <div className="w-full max-w-7xl mt-4 px-0">
      {/* Header label */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <Dot color="#ef4444" size={6}/>
        <span className="text-[9px] font-black text-red-400 uppercase tracking-[0.25em]">Live Now</span>
        <span className="text-[9px] text-gray-700">· {matches.length} match{matches.length>1?"es":""}</span>
      </div>

      <div className="flex flex-col gap-2">
        {matches.map(m => (
          <button
            key={m.id}
            onClick={() => navigate(`/match-center/${m.hash}`)}
            className="w-full text-left group"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 active:scale-[0.99] hover:border-white/10"
              style={{
                background: "rgba(255,255,255,0.025)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              {/* Sport badge */}
              <span
                className="text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-full shrink-0 leading-none"
                style={{
                  background: m.sport==="football" ? "rgba(52,211,153,0.1)" : "rgba(139,92,246,0.1)",
                  color: m.sport==="football" ? "#34d399" : "#a78bfa",
                  border: `1px solid ${m.sport==="football" ? "rgba(52,211,153,0.2)" : "rgba(139,92,246,0.2)"}`,
                }}
              >
                {m.sport==="football" ? "⚽ FIFA" : `🏏 ${m.badge}`}
              </span>

              {/* Teams + score */}
              {m.sport === "football" ? (
                // Football: flag | NAME  score:score  NAME | flag
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                    <span className="text-[13px] font-black text-white truncate">{m.homeCode}</span>
                    <div className="w-5 h-4 rounded-[3px] overflow-hidden border border-white/10 shrink-0">
                      <img src={m.homeFlagUrl} alt="" className="w-full h-full object-cover"
                        onError={e=>{e.target.style.display="none";}}/>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 px-1">
                    <span className="text-[15px] font-black text-white tabular-nums leading-none">{m.homeScore??"-"}</span>
                    <span className="text-[10px] text-gray-600 font-bold">:</span>
                    <span className="text-[15px] font-black text-white tabular-nums leading-none">{m.awayScore??"-"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-5 h-4 rounded-[3px] overflow-hidden border border-white/10 shrink-0">
                      <img src={m.awayFlagUrl} alt="" className="w-full h-full object-cover"
                        onError={e=>{e.target.style.display="none";}}/>
                    </div>
                    <span className="text-[13px] font-black text-white truncate">{m.awayCode}</span>
                  </div>
                </div>
              ) : (
                // Cricket: two inline team rows
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{m.homeFlag}</span>
                      <span className="text-[12px] font-black text-white">{m.homeCode}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {m.homeScore
                        ? <>
                            <span className="text-[13px] font-black text-white tabular-nums">{m.homeScore}</span>
                            {m.homeOvers && <span className="text-[8px] text-gray-600">({m.homeOvers})</span>}
                          </>
                        : <span className="text-[8px] text-gray-700">Yet to bat</span>
                      }
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{m.awayFlag}</span>
                      <span className="text-[12px] font-black text-gray-300">{m.awayCode}</span>
                    </div>
                    <div>
                      {m.awayScore
                        ? <span className="text-[13px] font-black text-gray-300 tabular-nums">{m.awayScore}</span>
                        : <span className="text-[8px] text-gray-700">Yet to bat</span>
                      }
                    </div>
                  </div>
                  {m.striker && (
                    <p className="text-[8px] text-amber-400 font-bold pt-0.5 truncate">{m.striker}</p>
                  )}
                  {m.status && !m.striker && (
                    <p className="text-[8px] text-gray-600 italic truncate">{m.status}</p>
                  )}
                </div>
              )}

              {/* Arrow */}
              <ChevronRight
                size={14}
                className="text-gray-700 group-hover:text-gray-400 transition-colors shrink-0"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const Header = () => {
  const { userData, movies = [] } = useContext(AppContext);
  const [copied, setCopied] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [progress, setProgress] = useState(0);

  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showMemberPopup, setShowMemberPopup] = useState(false);
  const [showBettingPopup, setShowBettingPopup] = useState(false);

  const [mobileFocusId, setMobileFocusId] = useState(null);
  const movieGridRef = useRef(null);
  const navigate = useNavigate();

  const adminEmail = "sanjusanjay0444@gmail.com";
  const isAdmin = (userData?.email?.toLowerCase() === adminEmail) || (currentUserEmail?.toLowerCase() === adminEmail);
  const siteUrl = "https://www.1anchormovies.live";

  const latestMovies = useMemo(() => {
    return [...movies]
      .filter(m => m.showOnHomepage)
      .sort((a,b) => new Date(b.homepage_added_at||b.created_at||0) - new Date(a.homepage_added_at||a.created_at||0))
      .slice(0, 100);
  }, [movies]);

  const isMobileView = () => window.innerWidth < 640;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUserEmail(session.user.email);
    });
  }, []);

  const handleClickOutside = useCallback((event) => {
    if (mobileFocusId !== null && isMobileView()) {
      if (movieGridRef.current && !movieGridRef.current.contains(event.target))
        setMobileFocusId(null);
    }
  }, [mobileFocusId]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleCardClick = (movieId, event) => {
    if (isMobileView()) {
      event.stopPropagation();
      setMobileFocusId(mobileFocusId === movieId ? null : movieId);
    }
  };

  useEffect(() => {
    supabase.from("stories").select("*")
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data, error }) => { if (!error) setStories(data); });
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error(err); }
  };

  const formatTimeAgo = (timestamp) => {
    const diff = new Date() - new Date(timestamp);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleShareComplete = () => {
    setShowSharePopup(false);
    localStorage.setItem("hasJoinedTelegram", "true");
  };

  return (
    <div className="flex flex-col items-center mt-1 px-4 sm:px-5 w-full bg-gray-950 min-h-screen">

      {/* ── LIVE MATCH STRIP ────────────────────────────────────────────── */}
      <LiveMatchStrip />

      {/* ── STORIES ─────────────────────────────────────────────────────── */}
      {stories.length > 0 && (
        <div className="w-full max-w-7xl mt-4">
          <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl p-4 border border-gray-800 shadow-xl">
            <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-yellow-500"/> Featured Stories
            </h3>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide py-1">
              {stories.map((story, idx) => (
                <div key={story.id}
                  onClick={() => { setActiveStory(story); setActiveStoryIndex(idx); }}
                  className="flex-shrink-0 flex flex-col items-center group cursor-pointer">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] transition-transform group-hover:scale-110 ${
                    JSON.parse(localStorage.getItem("viewedStories")||"[]").includes(story.id)
                      ? "bg-gray-700" : "bg-gradient-to-tr from-blue-500 to-cyan-400"
                  }`}>
                    <div className="bg-gray-950 rounded-full w-full h-full p-1 overflow-hidden">
                      <img src={story.poster_url} className="w-full h-full object-cover rounded-full" alt=""/>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-2 truncate w-16 text-center">{story.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MOVIE GRID ──────────────────────────────────────────────────── */}
      {latestMovies.length > 0 && (
        <div className="w-full max-w-7xl px-3 sm:px-6 py-6 bg-gray-900/40 rounded-3xl border border-gray-800 my-6 space-y-8">

          {/* Section header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/10 p-2 rounded-xl">
                <Clock className="w-6 h-6 text-red-500 animate-pulse"/>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">Fresh Releases</h2>
                <p className="text-gray-500 text-xs font-medium">Recently updated HD quality movies</p>
              </div>
            </div>
            <button onClick={handleCopy}
              className="flex items-center gap-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">
              {copied ? "Link Copied!" : "Invite Friends"} <Copy className="w-4 h-4"/>
            </button>
          </div>

          {/* Admin panel */}
          {isAdmin && (
            <div className="w-full p-4 bg-red-950/20 border border-red-500/30 rounded-2xl text-center">
              <Link to="/admin" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-red-400 hover:text-red-300 font-black uppercase italic tracking-tighter transition-all">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"/>
                ACCESS SECURE ADMIN PANEL
              </Link>
            </div>
          )}

          {/* Telegram banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-2xl p-6 border border-blue-500/10 group">
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <FaTelegramPlane className="text-blue-500 text-2xl"/>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-white font-bold text-lg">Never miss a movie!</h3>
                  <p className="text-blue-300/60 text-sm">Join our updates for instant HD links.</p>
                </div>
              </div>
              <a href="https://t.me/anchor2025"
                className="bg-cyan-500 hover:bg-cyan-400 text-white px-8 py-3 rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-cyan-500/20 transition-all flex items-center gap-2">
                <Zap className="w-4 h-4 fill-white"/> JOIN TELEGRAM
              </a>
            </div>
          </div>

          {/* Movie grid */}
          <div ref={movieGridRef}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {latestMovies.map(movie => {
              const isFocused = mobileFocusId === movie.id;
              return (
                <div key={movie.id}
                  className="group relative bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 transition-all hover:border-blue-500/50"
                  onClick={e => handleCardClick(movie.id, e)}>
                  <div className="aspect-[2/3] relative overflow-hidden">
                    <img src={movie.poster||movie.poster_url||"/default-poster.jpg"} alt={movie.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-transform duration-700 ${isFocused?"scale-110":"group-hover:scale-110"}`}/>
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {movie.note && (
                        <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded shadow-xl uppercase">
                          {movie.note}
                        </span>
                      )}
                      <span className="text-[10px] font-black bg-black/60 backdrop-blur-md text-blue-400 px-2 py-0.5 rounded border border-white/10">
                        {formatTimeAgo(movie.homepage_added_at||movie.created_at)}
                      </span>
                    </div>
                    {movie.subCategory && (
                      <div className="absolute top-2 right-2">
                        <span className="text-[9px] font-black bg-red-500 backdrop-blur-md text-white px-2 py-0.5 rounded border border-white/20 shadow-lg uppercase tracking-tighter">
                          {movie.subCategory}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {movie.imdb && (
                        <span className="bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg">
                          IMDb {movie.imdb}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 text-center">
                    <h2 className="text-xs sm:text-sm font-bold text-gray-200 truncate group-hover:text-blue-400 transition-colors"
                      style={{ color: movie.linkColor||"" }}>
                      {movie.title}
                    </h2>
                  </div>
                  <div className={`absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-3 transition-all duration-300 ${isFocused?"opacity-100":"opacity-0 group-hover:opacity-100"}`}>
                    <Link to={`/movie/${movie.slug}`}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 transition"
                      onClick={e=>e.stopPropagation()}>
                      <Film className="w-4 h-4"/> DETAILS
                    </Link>
                    {movie.watchUrl && (
                      <a href={movie.watchUrl}
                        className="w-full bg-white text-black text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                        onClick={e=>e.stopPropagation()}>
                        <MonitorPlay className="w-4 h-4"/> WATCH NOW
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="w-full py-12 text-center border-t border-gray-900 mt-12 bg-gray-950/50">
        <div className="flex flex-col items-center gap-4">
          <Link to="/"><img src="/logo_39.png" className="h-8 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" alt="Logo"/></Link>
          <p className="text-gray-600 text-[10px] tracking-[0.3em] font-bold uppercase">© 1TamilMV & AnchorMovies 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default Header;
