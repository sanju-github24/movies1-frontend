import React, { useEffect, useState, useRef, useMemo, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Helmet } from "react-helmet";
import { Loader2, Play, X, Clock3, TrendingUp, Volume2, VolumeX, UserCircle, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import SearchPage from "./SearchPage";
import DesktopDetailOverlay from "./DesktopDetailOverlay";

/* ===== Helper: Save Recently Watched ===== */
const saveRecentlyWatched = (movie) => {
  if (!movie || !movie.slug) return;
  try {
    const existing = JSON.parse(localStorage.getItem("recently_watched") || "[]");
    const filtered = existing.filter((m) => m.slug !== movie.slug);
    const updated = [movie, ...filtered].slice(0, 10);
    localStorage.setItem("recently_watched", JSON.stringify(updated));
  } catch (e) { console.error(e); }
};

/* ===== STORAGE helpers for resume times ===== */
const STORAGE_PREFIX = "video_last_time_v1:";
const readAllResumeTimes = () => {
  const resumeMap = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(raw);
          const id = key.replace(STORAGE_PREFIX, "");
          resumeMap[id] = parsed;
        } catch (e) {}
      }
    }
  } catch (e) { console.warn("Resume read error:", e); }
  return resumeMap;
};

const formatLanguageCount = (langs) => {
  const langArray = Array.isArray(langs) ? langs : [langs];
  if (langArray.length <= 1) return langArray[0] || "Unknown";
  return `${langArray.length} Languages`;
};

/* ===== Normalize a raw watch_html/merged item ===== */
const normalizeMeta = (item) => {
  const rawRating = item.imdb_rating ?? item.imdbRating;
  const imdbRating = rawRating != null
    ? (typeof rawRating === "number" ? rawRating.toFixed(1) : String(rawRating))
    : null;

  const year =
    item.year ||
    item.release_date?.split("-")[0] ||
    item.first_air_date?.split("-")[0] ||
    (item.created_at ? String(new Date(item.created_at).getFullYear()) : null);

  return { ...item, imdbRating, year };
};

/* ===== Generate slug from title ===== */
const generateSlug = (title) =>
  title?.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "";

// Language code → display name
const LANG_DISPLAY = {
  ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada",
  hi: "Hindi", en: "English"
};

// All languages we fetch TMDB content for (movies + TV + per-language trending)
const REGIONAL_LANG_CODES = ["ta", "te", "ml", "kn", "hi", "en"];

// Display name → code (for turning the user's profile language choices into TMDB codes)
const LANG_NAME_TO_CODE = {
  Tamil: "ta", Telugu: "te", Malayalam: "ml", Kannada: "kn", Hindi: "hi", English: "en"
};

// Resolve user's chosen language names to codes; empty/unknown → all languages
const resolveLangCodes = (langNames) => {
  const codes = (langNames || []).map(n => LANG_NAME_TO_CODE[n]).filter(Boolean);
  return codes.length > 0 ? codes : REGIONAL_LANG_CODES;
};

/* ===== Detect content type robustly from TMDB item ===== */
// A TMDB item is TV if: explicit content_type="tv", has first_air_date/name (TV fields),
// or was fetched from a ?type=tv endpoint (flagged as _isTv).
const detectContentType = (t) => {
  if (t.content_type === "tv") return "tv";
  if (t.content_type === "movie") return "movie";
  if (t._isTv) return "tv";                    // flag set by fetchTmdbMovies below
  if (t.first_air_date || t.name) return "tv"; // TMDB TV-specific fields
  return "movie";
};

/* ===== Build a unified movie object from a TMDB API response item ===== */
const buildTmdbMovie = (t) => {
  const title = t.title || t.name || "";
  const slug = generateSlug(title) || String(t.id || t.tmdb_id);
  const langCode = t.original_language || "en";
  const langDisplay = LANG_DISPLAY[langCode] || langCode.toUpperCase();
  const contentType = detectContentType(t);

  return {
    id: `tmdb_${t.id || t.tmdb_id}`,
    slug,
    title,
    source: "tmdb",
    content_type: contentType,                  // ← now reliable on the top-level object
    // ── Top-level copies of the identifiers, kept in sync with tmdbPayload below.
    // These survive even if some component spreads/clones the movie object and
    // drops the nested tmdbPayload field — that mismatch was previously causing
    // "Content Not Found" for genre-row / related-movie navigation.
    tmdb_id: t.tmdb_id || t.id || null,
    imdb_id: t.imdb_id || null,
    first_air_date: t.first_air_date || null,
    release_date: t.release_date || null,
    episodes: t.episodes || [],
    cast: t.cast || [],
    poster: t.poster_url || (t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : "/default-poster.jpg"),
    cover_poster: t.cover_poster_url || (t.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : (t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : "/default-cover.jpg")),
    title_logo: t.title_logo || null,
    description: t.overview || t.description || "",
    year: t.year || t.release_date?.split("-")[0] || t.first_air_date?.split("-")[0] || null,
    imdbRating: t.imdb_rating != null
      ? (typeof t.imdb_rating === "number" ? t.imdb_rating.toFixed(1) : String(t.imdb_rating))
      : (t.vote_average != null ? Number(t.vote_average).toFixed(1) : null),
    language: [langDisplay],
    genres: (t.genres || []).map(g => (typeof g === "object" ? g.name : g)),
    tmdb_genres: (t.genres || []).map(g => (typeof g === "object" ? g.name : g)),
    categories: (t.genres || []).map(g => (typeof g === "object" ? g.name : g)),
    certification: t.certification || null,
    runtime: t.runtime || null,
    trailer_key: t.trailer_key || null,
    // ─── tmdbPayload: everything WatchHtmlPage needs via location.state ───
    tmdbPayload: {
      // identifiers
      tmdb_id:      t.tmdb_id || t.id,
      imdb_id:      t.imdb_id || null,
      // display
      title,
      slug,
      poster:       t.poster_url || (t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : "/default-poster.jpg"),
      cover_poster: t.cover_poster_url || (t.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : "/default-cover.jpg"),
      description:  t.overview || t.description || "",
      year:         t.year || t.release_date?.split("-")[0] || t.first_air_date?.split("-")[0],
      imdb_rating:  t.imdb_rating || t.vote_average,
      // ← content_type is now authoritative — WatchHtmlPage uses this directly
      content_type: contentType,
      // TV-specific raw fields so WatchHtmlPage can also self-detect
      first_air_date: t.first_air_date || null,
      release_date:   t.release_date   || null,
      // episodes / cast come from WatchHtmlPage's own TMDB detail fetch
      episodes:     t.episodes || [],
      cast:         t.cast     || [],
      genres:       (t.genres  || []).map(g => (typeof g === "object" ? g.name : g)),
      certification: t.certification || null,
      runtime:      t.runtime  || null,
      trailer_key:  t.trailer_key || null,
    },
    show_on_hero: false,
    is_trending:  false,
  };
};

/* ====== Mobile Bottom Navigation ====== */
const MobileNav = ({ session, onSearchClick, showSearch }) => {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    {
      label: "Home",
      path: "/",
      icon: (active) => (
        <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: "Search",
      isAction: true,
      icon: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
      ),
    },
    {
      label: "Watchlist",
      path: "/watchlist",
      icon: (active) => (
        <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      label: "Torrents",
      path: "/search-torrent",
      icon: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: "Profile",
      path: session ? "/profile" : "/auth",
      icon: (active) => session ? (
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${active ? "bg-white text-blue-600" : "bg-blue-600 text-white"}`}>
          {session.user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() ||
            session.user?.email?.charAt(0)?.toUpperCase() || "U"}
        </div>
      ) : (
        <UserCircle className="w-5 h-5" />
      ),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-[150] bg-black/90 backdrop-blur-xl border-t border-white/5"
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = item.isAction ? showSearch : (item.path === "/" ? path === "/" : path.startsWith(item.path));
          const isTorrents = item.path === "/search-torrent";

          if (item.isAction) {
            return (
              <button key="search" onClick={onSearchClick}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-90">
                <span className={isActive ? "text-blue-400" : "text-gray-500"}>{item.icon(isActive)}</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-blue-400" : "text-gray-600"}`}>{item.label}</span>
              </button>
            );
          }

          return (
            <Link key={item.path} to={item.path}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-90 relative">
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
              )}
              <span className={`transition-colors ${isActive ? "text-blue-400" : isTorrents ? "text-red-400/70" : "text-gray-500"}`}>
                {item.icon(isActive)}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${isActive ? "text-blue-400" : isTorrents ? "text-red-400/70" : "text-gray-600"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

/* ====== Component: Netflix-Style Trending Numbers Row ====== */
/* ====== Component: Hotstar-Style Trending Numbers Row ====== */
const HOTSTAR_NUMBER_OVERLAYS = [
  "https://img10.hotstar.com/image/upload/f_auto,q_90,w_128/discovery/PROD/top-10-overlays/version-1/LTR/overlay-1.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90/discovery/PROD/top-10-overlays/version-1/LTR/overlay-2.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90/discovery/PROD/top-10-overlays/version-1/LTR/overlay-3.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90/discovery/PROD/top-10-overlays/version-1/LTR/overlay-4.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90/discovery/PROD/top-10-overlays/version-1/LTR/overlay-5.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90/discovery/PROD/top-10-overlays/version-1/LTR/overlay-6.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90,w_128/discovery/PROD/top-10-overlays/version-1/LTR/overlay-7.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90,w_128/discovery/PROD/top-10-overlays/version-1/LTR/overlay-8.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90,w_128/discovery/PROD/top-10-overlays/version-1/LTR/overlay-9.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90,w_128/discovery/PROD/top-10-overlays/version-1/LTR/overlay-10.png",
];

const TrendingNumbersRow = ({ movies, onSelect, title = "Top 10 Today", limit = 10 }) => {
  const rowRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const timerRef = useRef(null);

  const handleMouseEnter = (id) => {
    if (window.innerWidth < 640) return;
    setHoveredId(id);
    timerRef.current = setTimeout(() => setShowTrailer(true), 2000);
  };
  const handleMouseLeave = () => {
    setHoveredId(null);
    setShowTrailer(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div className="mb-16 w-full max-w-7xl px-4 mx-auto overflow-visible">
      <h2 className="text-xl font-bold text-gray-200 mb-10 px-2 border-l-4 border-blue-600 pl-3 uppercase tracking-widest flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-500" /> {title}
      </h2>

      <div className="relative group/row">
        <div
          ref={rowRef}
          className="flex overflow-x-auto scrollbar-hide scroll-smooth pt-2 pb-16 px-2"
          style={{ gap: "52px" }}
        >
          {movies.slice(0, limit).map((movie, index) => (
           <div
  key={movie.id}
  className="relative flex-none cursor-pointer group"
  style={{
    width: "clamp(200px, 22vw, 300px)",
    zIndex: hoveredId === movie.id ? 40 : 10,  // ← whole card lifts up on hover
    transition: "z-index 0s",
  }}
  onMouseEnter={() => handleMouseEnter(movie.id)}
  onMouseLeave={handleMouseLeave}
  onClick={() => onSelect(movie)}
>
              {/* ── 16:9 Cover Poster Card ── */}
              <div
                className="relative w-full overflow-hidden rounded-xl bg-gray-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-blue-500 group-hover:scale-105 group-hover:shadow-blue-900/40"
                style={{ aspectRatio: "16/9" }}
              >
                {/* Always use cover_poster for landscape look */}
                <img
                  src={movie.cover_poster || movie.poster || "/default-cover.jpg"}
                  alt={movie.title}
                  className={`w-full h-full object-cover transition-opacity duration-700 ${
                    hoveredId === movie.id && showTrailer && movie.trailer_key
                      ? "opacity-0"
                      : "opacity-100"
                  }`}
                />

                {/* Trailer iframe on hover */}
                {hoveredId === movie.id && showTrailer && movie.trailer_key && window.innerWidth >= 640 && (
                  <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full scale-[1.4] pointer-events-none">
                      <iframe
                        src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${movie.trailer_key}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay"
                      />
                    </div>
                    <div className="absolute top-2 left-2 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm">
                      <span className="text-[7px] font-black text-white/90 uppercase tracking-[0.2em]">Trailer</span>
                    </div>
                  </div>
                )}

                {/* Badges top-right */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end pointer-events-none z-30">
                  {movie.imdbRating && (
                    <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
                      <div className="bg-[#f5c518] text-black px-1 rounded-[2px] font-black text-[7px] leading-none">IMDb</div>
                      <span className="text-[9px] font-black text-white">{movie.imdbRating}</span>
                    </div>
                  )}
                  <div className="bg-blue-600/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-tighter">
                    {formatLanguageCount(movie.language)}
                  </div>
                  {movie.content_type === "tv" && (
                    <div className="bg-purple-600/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-tighter">
                      SERIES
                    </div>
                  )}
                </div>

                {/* Hover gradient + play */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent flex flex-col justify-end p-3 z-20">
                  {movie.title_logo ? (
                    <img src={movie.title_logo} className="h-7 w-auto object-contain mb-1.5 self-start drop-shadow-2xl" alt="" />
                  ) : (
                    <div className="text-[11px] font-black text-white mb-1 truncate uppercase italic drop-shadow-md">
                      {movie.title || movie.slug}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Play className="w-3 h-3 text-white fill-current" />
                    <span className="text-[9px] font-black text-white uppercase tracking-tighter">
                      {movie.content_type === "tv" ? "Stream Series" : "Watch Now"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Hotstar Number Overlay ── positioned bottom-left, overlapping below the card */}
              {/* ── Hotstar Number Overlay ── */}
<img
  src={HOTSTAR_NUMBER_OVERLAYS[index]}
  alt={String(index + 1)}
  draggable={false}
  className="absolute pointer-events-none select-none transition-all duration-500"
  style={{
    bottom: "-22px",
    left: "-18px",
    width: "clamp(230px, 8vw, 450px)",
    height: "auto",
    zIndex: hoveredId === movie.id ? -1 : 0,  // ← slides BEHIND the card on hover
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.9))",
    opacity: hoveredId === movie.id ? 0.3 : 1, // ← fades out slightly when hidden behind
    transform: hoveredId === movie.id ? "scale(0.95) translateX(10px)" : "scale(1) translateX(0px)", // ← subtle slide-back effect
  }}
/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ====== Dynamic Genre Row Component ====== */
const GenreRow = ({ title, movies, onSelect }) => {
  const rowRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const timerRef = useRef(null);

  const handleMouseEnter = (id) => {
    if (window.innerWidth < 640) return;
    setHoveredId(id);
    timerRef.current = setTimeout(() => setShowTrailer(true), 2000);
  };
  const handleMouseLeave = () => {
    setHoveredId(null); setShowTrailer(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir === "left" ? -350 : 350, behavior: "smooth" });

  useEffect(() => {
    checkScroll();
    const el = rowRef.current;
    el?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => { el?.removeEventListener("scroll", checkScroll); window.removeEventListener("resize", checkScroll); };
  }, [movies]);

  return (
    <div className="mb-12 w-full max-w-7xl px-4 mx-auto overflow-visible">
      <h2 className="text-xl font-bold text-gray-200 mb-4 px-2 border-l-4 border-blue-600 pl-3 uppercase tracking-widest flex items-center gap-2">
        {title} <span className="text-[10px] text-gray-500 font-normal">({movies?.length || 0})</span>
      </h2>
      <div className="relative group/row">
        {showLeft && (
          <button onClick={() => scroll("left")} className="absolute left-[-10px] top-0 bottom-0 z-[60] flex items-center justify-center w-12 text-white bg-black/60 backdrop-blur-sm hover:bg-blue-600 transition-all rounded-r-xl opacity-0 group-hover/row:opacity-100">◀</button>
        )}
        <div ref={rowRef} className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-14 pt-4 px-2">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="group relative flex-none w-36 sm:w-52 h-52 sm:h-72 border border-white/5 rounded-xl cursor-pointer transition-all duration-500 ease-out hover:z-[70] sm:hover:scale-110 sm:hover:w-80 sm:hover:shadow-[0_20px_50px_rgba(0,0,0,1)] bg-gray-900"
              onMouseEnter={() => handleMouseEnter(movie.id)}
              onMouseLeave={handleMouseLeave}
              onClick={() => onSelect(movie)}
            >
              <img src={movie.poster || "/default-poster.jpg"} alt={movie.title}
                className={`absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity duration-300 ${hoveredId === movie.id ? "opacity-0" : "opacity-100"}`} />
              <img src={movie.cover_poster || movie.poster} alt={movie.title}
                className={`hidden sm:block absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity duration-500 ${hoveredId === movie.id && !showTrailer ? "opacity-100" : "opacity-0"}`} />
              {hoveredId === movie.id && showTrailer && movie.trailer_key && window.innerWidth >= 640 && (
                <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden rounded-xl">
                  <div className="w-full h-full scale-[1.6] pointer-events-none">
                    <iframe src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${movie.trailer_key}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                      className="w-full h-full" frameBorder="0" />
                  </div>
                  <div className="absolute top-3 left-3 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm">
                    <span className="text-[7px] font-black text-white/90 uppercase tracking-[0.2em]">Trailer</span>
                  </div>
                </div>
              )}
              {/* TV series badge on card */}
              {movie.content_type === "tv" && (
                <div className="absolute top-2 left-2 z-30 px-1.5 py-0.5 bg-purple-600/90 backdrop-blur-md rounded text-[7px] font-black uppercase text-white tracking-tighter">
                  SERIES
                </div>
              )}
              <div className="hidden sm:flex absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent flex-col justify-end p-5 rounded-xl pointer-events-none group-hover:pointer-events-auto z-40">
                {movie.title_logo ? (
                  <img src={movie.title_logo} className="h-10 w-auto object-contain mb-2 self-start" alt="" />
                ) : (
                  <div className="text-sm font-black text-white mb-2 truncate uppercase">{movie.title || movie.slug}</div>
                )}
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 mb-2">
                  <span className="text-blue-400 uppercase font-black">{formatLanguageCount(movie.language)}</span>
                  {movie.content_type === "tv" && (
                    <span className="px-1.5 border border-purple-500/60 rounded text-purple-300 bg-purple-900/40 uppercase text-[8px] font-black">Series</span>
                  )}
                  {movie.certification && <span className="px-1.5 border border-white/40 rounded text-white bg-black/40">{movie.certification}</span>}
                </div>
                <p className="text-[9px] text-gray-300 line-clamp-2 mb-4 leading-relaxed italic">{movie.description}</p>
                <button className="w-full py-2 bg-white text-black text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {movie.content_type === "tv" ? "STREAM SERIES" : "WATCH NOW"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {showRight && (
          <button onClick={() => scroll("right")} className="absolute right-[-10px] top-0 bottom-0 z-[60] flex items-center justify-center w-12 text-white bg-black/60 backdrop-blur-sm hover:bg-blue-600 transition-all rounded-l-xl opacity-0 group-hover/row:opacity-100">▶</button>
        )}
      </div>
    </div>
  );
};

/* ====== Main Page Component ====== */
const WatchListPage = () => {
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  const [movies, setMovies] = useState([]);
  const [allMovies, setAllMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [userLangs, setUserLangs] = useState([]);
  // Committed language choices that drive TMDB fetching (only updated on save,
  // not while the user is still toggling options in the popup)
  const [fetchLangs, setFetchLangs] = useState([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [showLangPopup, setShowLangPopup] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroMovies, setHeroMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [langTrending, setLangTrending] = useState({}); // { "Tamil": [top 5 movies], ... }
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [resumeRefresh, setResumeRefresh] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [heroTrailerActive, setHeroTrailerActive] = useState(false);
  const [infoVisible, setInfoVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const langAssets = [
    { name: "Hindi", img: "/Hindi.webp" },
    { name: "English", img: "/English.webp" },
    { name: "Kannada", img: "/Kannada.webp" },
    { name: "Malayalam", img: "/Malayalam.webp" },
    { name: "Telugu", img: "/Telugu.webp" },
    { name: "Tamil", img: "/Tamil.webp" },
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      const langs = s?.user?.user_metadata?.languages || [];
      setUserLangs(langs);
      setFetchLangs(langs);
      if (s?.user && !s.user.user_metadata?.hasSelectedLanguage) setShowLangPopup(true);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLangSelect = (name) =>
    setUserLangs(prev => prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]);

  const saveLanguages = async () => {
    if (userLangs.length === 0) return;
    try {
      const { error } = await supabase.auth.updateUser({ data: { languages: userLangs, hasSelectedLanguage: true } });
      if (error) throw error;
      setShowLangPopup(false);
      setFetchLangs(userLangs); // triggers a TMDB refetch scoped to the chosen languages
    } catch (e) { console.error(e); }
  };

  /* ─── Fetch TMDB regional movies ── */
  // selectedLangNames: user's profile languages (e.g. ["Kannada"]). If set, only
  // those languages are fetched from TMDB; otherwise all supported languages.
  const fetchTmdbMovies = async (localMovies, selectedLangNames = []) => {
    if (!backendUrl) return [];

    const localTitles = new Set(localMovies.map(m => m.title?.toLowerCase().trim()).filter(Boolean));
    const localSlugs  = new Set(localMovies.map(m => m.slug?.toLowerCase()).filter(Boolean));

    const codes = resolveLangCodes(selectedLangNames);

    // Fewer selected languages → dig deeper into TMDB pages so the genre rows
    // still get as many titles as possible. Page 1 is enriched (logos/trailers);
    // deeper pages skip enrichment so they load fast. min_votes=10 surfaces far
    // more titles for smaller languages (Kannada, Malayalam, ...).
    const moviePages = codes.length === 1 ? [1, 2, 3, 4, 5] : codes.length <= 3 ? [1, 2, 3, 4] : [1, 2, 3];
    const tvPages    = codes.length <= 3 ? [1, 2, 3] : [1, 2];

    // Each entry: [url, isTv] — we tag TV endpoints so buildTmdbMovie can detect type.
    const endpoints = [];
    codes.forEach(code => {
      moviePages.forEach(p => endpoints.push([
        `${backendUrl}/api/tmdb-regional?lang=${code}&type=movie&page=${p}&min_votes=10${p === 1 ? "" : "&enrich=0"}`, false
      ]));
      tvPages.forEach(p => endpoints.push([
        `${backendUrl}/api/tmdb-regional?lang=${code}&type=tv&page=${p}&min_votes=10${p === 1 ? "" : "&enrich=0"}`, true
      ]));
    });
    endpoints.push([`${backendUrl}/api/tmdb-trending`, false]);  // has mixed; content_type field from backend

    const results = [];
    const responses = await Promise.allSettled(
      endpoints.map(([url]) => axios.get(url))
    );
    responses.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        const isTv = endpoints[idx][1];
        const list = r.value.data?.results || r.value.data?.data || [];
        list.forEach(t => results.push({ ...t, _isTv: isTv || t.content_type === "tv" }));
      }
    });

    // De-duplicate by tmdb id, filter already-local content
    const seen = new Set();
    const unique = [];
    for (const t of results) {
      const key = String(t.id || t.tmdb_id);
      if (seen.has(key)) continue;
      seen.add(key);

      const title = (t.title || t.name || "").toLowerCase().trim();
      const slug = generateSlug(title);
      if (localTitles.has(title) || localSlugs.has(slug)) continue;

      unique.push(buildTmdbMovie(t));
    }
    return unique;
  };

  /* ─── Background-enrich TMDB movies that came from bulk (enrich=0) pages ──
     Fetches title logos + trailer keys in chunks and patches them into state,
     so genre-row hovers and the detail overlay show logos instead of bare text. */
  const enrichTmdbBatch = async (items) => {
    if (!backendUrl || items.length === 0) return;
    const CHUNK = 25;
    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK);
      try {
        const res = await axios.post(`${backendUrl}/api/tmdb-enrich`,
          chunk.map(m => ({ tmdb_id: m.tmdb_id, content_type: m.content_type })));
        const byId = new Map((res.data?.results || []).map(e => [String(e.tmdb_id), e]));
        if (byId.size === 0) continue;
        const patch = (m) => {
          if (m.source !== "tmdb" || !m.tmdb_id) return m;
          const e = byId.get(String(m.tmdb_id));
          if (!e || (!e.title_logo && !e.trailer_key)) return m;
          const upd = {
            title_logo:  m.title_logo  || e.title_logo  || null,
            trailer_key: m.trailer_key || e.trailer_key || null,
          };
          return { ...m, ...upd, tmdbPayload: m.tmdbPayload ? { ...m.tmdbPayload, ...upd } : m.tmdbPayload };
        };
        setAllMovies(prev => prev.map(patch));
        setTrendingMovies(prev => prev.map(patch));
        setHeroMovies(prev => prev.map(patch));
        setSelectedMovie(prev => (prev ? patch(prev) : prev));
      } catch (_) { /* enrichment is best-effort */ }
    }
  };

  /* ─── Fetch Top 5 trending per language from TMDB ── */
  // Only fetches the user's chosen languages (all languages when none chosen).
  const fetchLangTrending = async (selectedLangNames = []) => {
    if (!backendUrl) return {};
    const codes = resolveLangCodes(selectedLangNames);
    const responses = await Promise.allSettled(
      codes.map(code =>
        axios.get(`${backendUrl}/api/tmdb-trending-language?lang=${code}&type=movie&limit=5`)
      )
    );
    const map = {};
    responses.forEach((r, idx) => {
      if (r.status !== "fulfilled") return;
      const list = r.value.data?.results || [];
      if (list.length === 0) return;
      const langName = LANG_DISPLAY[codes[idx]] || codes[idx].toUpperCase();
      map[langName] = list.map(t => buildTmdbMovie(t));
    });
    return map;
  };

  /* ─── Main data fetch ── */
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const [watchRes, moviesRes] = await Promise.all([
          supabase.from("watch_html").select("*").order("created_at", { ascending: false }).limit(400),
          supabase.from("movies").select("slug, title, language, categories, subCategory, description"),
        ]);

        const merged = (watchRes.data || []).map((item) => {
          const match = (moviesRes.data || []).find((m) => m.slug === item.slug) ||
                        (moviesRes.data || []).find((m) => m.title?.toLowerCase() === item.title?.toLowerCase());
          const movieLangs = match?.language?.length
            ? (Array.isArray(match.language) ? match.language : [match.language])
            : ["Unknown"];
          const raw = {
            ...item,
            source: "local",
            poster: item.poster || "/default-poster.jpg",
            cover_poster: item.cover_poster || item.poster || "/default-cover.jpg",
            language: movieLangs,
            categories: match?.categories || [],
            subCategory: match?.subCategory || null,
            description: match?.description || item.description || "",
            show_on_hero: item.show_on_hero || false,
            is_trending: item.is_trending || false,
            genres: item.genres || match?.categories || [],
            trailer_key: item.trailer_codes || null,
          };
          return normalizeMeta(raw);
        });

        setMovies(merged);

        const [tmdb, langTrendingMap] = await Promise.all([
          fetchTmdbMovies(merged, fetchLangs),
          fetchLangTrending(fetchLangs),
        ]);
        setLangTrending(langTrendingMap);
        const combined = [...merged, ...tmdb];
        setAllMovies(combined);

        // When the user picked languages, keep hero/trending fills within them
        const inChosenLangs = (m) =>
          fetchLangs.length === 0 ||
          (Array.isArray(m.language) ? m.language : [m.language]).some(l => fetchLangs.includes(l));

        const adminHero = merged.filter(m => m.show_on_hero === true).slice(0, 3);
        const tmdbWithAssets = tmdb.filter(m => (m.title_logo || m.trailer_key) && inChosenLangs(m));
        const tmdbHero = tmdbWithAssets.sort(() => 0.5 - Math.random()).slice(0, 4);
        const localOthers = merged.filter(m => !adminHero.some(a => a.id === m.id));
        const localExtra = localOthers.sort(() => 0.5 - Math.random()).slice(0, 2);
        setHeroMovies([...adminHero, ...localExtra, ...tmdbHero].slice(0, 7));

        const manualTrending = merged.filter(m => m.is_trending === true).slice(0, 10);
        const autoFill = combined
          .filter(m => !manualTrending.some(t => t.id === m.id) && inChosenLangs(m))
          .sort(() => 0.5 - Math.random())
          .slice(0, 10 - manualTrending.length);
        setTrendingMovies([...manualTrending, ...autoFill]);

        // Fire-and-forget: fill in logos/trailers for the bulk-fetched pages
        enrichTmdbBatch(tmdb.filter(m => !m.title_logo && !m.trailer_key && m.tmdb_id));

        syncTodaysUploads(merged);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    // Wait for the auth check so we know the user's saved languages before
    // hitting TMDB; refetch whenever the committed language choice changes.
    if (!authChecked) return;
    fetchMovies();
  }, [backendUrl, authChecked, fetchLangs.join("|")]);

  const syncTodaysUploads = async (list) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todaysNewUploads = list.filter(m => {
      if (!m.created_at || !m.imdb_id) return false;
      return new Date(m.created_at).toISOString().split("T")[0] === todayStr;
    });
    if (todaysNewUploads.length === 0) return;
    const enriched = await Promise.all(todaysNewUploads.map(async (m) => {
      try {
        const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params: { imdbId: m.imdb_id } });
        if (res.data?.success) {
          const tmdb = res.data.data;
          await supabase.from("watch_html").update({
            genres: tmdb.genres || [],
            imdb_rating: tmdb.imdb_rating,
            trailer_codes: tmdb.trailer_key || null,
          }).eq("slug", m.slug);
          return normalizeMeta({
            ...m,
            imdb_rating: tmdb.imdb_rating ?? m.imdb_rating,
            year: tmdb.year || m.year,
            certification: tmdb.certification || "",
            tmdb_genres: tmdb.genres || [],
            runtime: tmdb.runtime,
            trailer_key: tmdb.trailer_key || m.trailer_key,
          });
        }
      } catch (e) { console.warn("Daily Sync failed for", m.title); }
      return m;
    }));
    setMovies(prev => {
      const map = new Map(prev.map(o => [o.slug, o]));
      enriched.forEach(e => map.set(e.slug, e));
      return Array.from(map.values());
    });
    setAllMovies(prev => {
      const map = new Map(prev.map(o => [o.slug, o]));
      enriched.forEach(e => map.set(e.slug, e));
      return Array.from(map.values());
    });
  };

  /* ─── When a movie card is clicked ── */
  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
    // Not-yet-enriched TMDB movie: fetch its logo + trailer right away so the
    // detail overlay shows the title treatment instead of plain text.
    if (movie.source === "tmdb" && movie.tmdb_id && !movie.title_logo && !movie.trailer_key) {
      enrichTmdbBatch([movie]);
    }
  };

  /* ─── Navigate to watch page ── */
  const handleNavigateToWatch = (movie) => {
    saveRecentlyWatched(movie);

    if (movie.source === "tmdb") {
      // Prefer the rich nested payload, but fall back to rebuilding it from
      // the top-level fields if tmdbPayload was dropped somewhere along the
      // way (e.g. a component re-shaping the movie object before calling
      // onNavigate). This is what was causing "Content Not Found" for
      // genre-row / related-movie clicks.
      const payload = movie.tmdbPayload || {
        tmdb_id: movie.tmdb_id
          || (typeof movie.id === "string" ? movie.id.replace("tmdb_", "") : movie.id),
        imdb_id: movie.imdb_id || null,
        title: movie.title,
        slug: movie.slug,
        poster: movie.poster,
        cover_poster: movie.cover_poster,
        description: movie.description,
        year: movie.year,
        imdb_rating: movie.imdbRating,
        content_type: movie.content_type,
        first_air_date: movie.first_air_date || null,
        release_date: movie.release_date || null,
        episodes: movie.episodes || [],
        cast: movie.cast || [],
        genres: movie.genres || [],
        certification: movie.certification || null,
        runtime: movie.runtime || null,
        trailer_key: movie.trailer_key || null,
      };

      if (!payload.tmdb_id && !payload.imdb_id) {
        console.error("[handleNavigateToWatch] No tmdb_id/imdb_id resolvable for", movie);
      }

      navigate(`/watch/${movie.slug}`, {
        state: {
          movie: {
            ...payload,
            content_type: movie.content_type || payload.content_type,
          },
        },
      });
    } else {
      navigate(`/watch/${movie.slug}`, { state: { movie } });
    }

    setSelectedMovie(null);
  };

  const relatedMovies = useMemo(() => {
    if (!selectedMovie) return [];
    const targetGenres = selectedMovie.tmdb_genres || selectedMovie.genres || selectedMovie.categories || [];
    const targetLangs = Array.isArray(selectedMovie.language) ? selectedMovie.language : [selectedMovie.language];
    return allMovies.filter(m => m.slug !== selectedMovie.slug).filter(m => {
      const mGenres = m.tmdb_genres || m.genres || m.categories || [];
      const mLangs = Array.isArray(m.language) ? m.language : [m.language];
      return mGenres.some(g => targetGenres.includes(g)) && mLangs.some(l => targetLangs.includes(l));
    }).slice(0, 12);
  }, [selectedMovie, allMovies]);

  const resumeMap = useMemo(() => {
    const raw = readAllResumeTimes();
    const mapped = {};
    Object.entries(raw).forEach(([id, value]) => {
      const found = movies.find(m => m.slug === id || m.video_url === id);
      if (found) mapped[found.slug] = { movie: found, time: value.time, updatedAt: value.updatedAt };
    });
    return mapped;
  }, [movies, resumeRefresh]);

  const continueList = useMemo(() =>
    Object.values(resumeMap).filter(r => (r.time || 0) > 10).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
  [resumeMap]);

  /* ─── Genre rows ── */
  const groupedByBackendGenre = useMemo(() => {
    const query = search.toLowerCase().trim();
    let filteredList = !query
      ? allMovies
      : allMovies.filter(m => [m.title, m.slug, m.description].join(" ").toLowerCase().includes(query));

    if (userLangs.length > 0)
      filteredList = filteredList.filter(movie =>
        (Array.isArray(movie.language) ? movie.language : [movie.language]).some(lang => userLangs.includes(lang))
      );

    const result = filteredList.reduce((acc, movie) => {
      const genres =
        movie.tmdb_genres?.length > 0 ? movie.tmdb_genres :
        movie.genres?.length > 0 ? movie.genres :
        movie.categories?.length > 0 ? movie.categories :
        ["Others"];
      genres.forEach(genre => {
        if (!acc[genre]) acc[genre] = [];
        acc[genre].push(movie);
      });
      return acc;
    }, {});

    Object.keys(result).forEach(key => { result[key] = result[key].sort(() => 0.5 - Math.random()); });
    return result;
  }, [allMovies, search, userLangs]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      setScrolled(scrollPos > 50);
      if (scrollPos > 400) { setHeroTrailerActive(false); setInfoVisible(true); }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (heroMovies.length === 0) return;
    setHeroTrailerActive(false); setInfoVisible(true);
    let slideTimer, trailerTimer, fadeTimer;
    const currentHero = heroMovies[currentSlide];
    if (isMobile) {
      slideTimer = setTimeout(() => setCurrentSlide(prev => (prev + 1) % heroMovies.length), 5000);
    } else {
      if (!currentHero?.trailer_key) {
        slideTimer = setTimeout(() => setCurrentSlide(prev => (prev + 1) % heroMovies.length), 5000);
      } else {
        trailerTimer = setTimeout(() => { if (window.scrollY < 400) setHeroTrailerActive(true); }, 2000);
        fadeTimer = setTimeout(() => { if (window.scrollY < 400) setInfoVisible(false); }, 7000);
        slideTimer = setTimeout(() => setCurrentSlide(prev => (prev + 1) % heroMovies.length), 50000);
      }
    }
    return () => { clearTimeout(slideTimer); clearTimeout(trailerTimer); clearTimeout(fadeTimer); };
  }, [currentSlide, heroMovies, isMobile]);

  const getProfileInitial = () => {
    if (!session?.user) return "";
    const metaName = session.user.user_metadata?.full_name;
    if (metaName?.trim()) return metaName.trim().charAt(0).toUpperCase();
    return session.user.email.charAt(0).toUpperCase();
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
      <p className="text-gray-400 font-mono tracking-widest uppercase text-[10px]">Loading Movies...</p>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden ${selectedMovie && isMobile ? "h-screen overflow-hidden" : ""}`}>
      <Helmet><title>Watchlist | 1Anchormovies</title></Helmet>

      {/* ── Language Popup ── */}
      {showLangPopup && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="w-full max-w-4xl p-8 animate-in zoom-in duration-500">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Choose Your Languages</h2>
              <p className="text-gray-400 text-sm font-bold tracking-widest">PERSONALIZING YOUR CINEMATIC EXPERIENCE</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
              {langAssets.map(lang => {
                const isSelected = userLangs.includes(lang.name);
                return (
                  <div key={lang.name} onClick={() => handleLangSelect(lang.name)}
                    className={`relative aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 transform active:scale-95 group shadow-2xl ${isSelected ? "ring-4 ring-blue-600 scale-105" : "grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:scale-105"}`}>
                    <img src={lang.img} className="w-full h-full object-cover" alt={lang.name} />
                    <div className={`absolute inset-0 transition-opacity duration-300 ${isSelected ? "bg-blue-600/20" : "bg-black/40"}`} />
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-blue-600 p-1.5 rounded-full shadow-lg animate-in zoom-in">
                        <CheckCircle2 size={18} className="text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4">
                      <span className="text-lg font-black italic uppercase tracking-tighter drop-shadow-xl">{lang.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center">
              <button onClick={saveLanguages} disabled={userLangs.length === 0}
                className="px-16 py-4 bg-white text-black hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Header ── */}
      <header className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${scrolled || showSearch ? "bg-black/95 backdrop-blur-md shadow-2xl" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/"><img src="/logo_39.png" alt="Logo" className="h-9 sm:h-10" /></Link>

          <nav className={`hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest transition-opacity duration-1000 ${!infoVisible ? "opacity-40" : "opacity-100"}`}>
            <Link to="/" className="hover:text-blue-400 transition">Home</Link>
            <Link to="/latest" className="hover:text-blue-400 transition">Latest</Link>
            <Link to="/watchlist" className="text-blue-500 border-b-2 border-blue-500 pb-1">My Watchlist</Link>
            <Link to="/search-torrent" className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition border border-red-500/30 px-3 py-0.5 rounded-full hover:border-red-400 hover:bg-red-500/10">
              <span>⚡</span> Torrents
            </Link>
            <Link to="/sports" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition border border-blue-500/30 px-3 py-0.5 rounded-full hover:border-blue-400 hover:bg-blue-500/10">
              <span>📺</span> Sports Live
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearch(""); }} className="p-2 hover:bg-white/10 rounded-full transition">
              {showSearch ? <XMarkIcon className="w-6 h-6" /> : <MagnifyingGlassIcon className="w-6 h-6" />}
            </button>
            <Link to={session ? "/profile" : "/auth"} className={`group relative flex items-center justify-center transition-opacity duration-1000 ${!infoVisible ? "opacity-40" : "opacity-100"}`}>
              {session ? (
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white/20 overflow-hidden shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all group-hover:border-blue-400 group-hover:scale-105">
                  <span className="text-sm font-black text-white">{getProfileInitial()}</span>
                </div>
              ) : (
                <div className="p-2 text-gray-400 hover:text-white transition-all hover:scale-110">
                  <UserCircle className="w-7 h-7" />
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Nav ── */}
      <MobileNav
        session={session}
        onSearchClick={() => { setShowSearch(v => !v); if (showSearch) setSearch(""); }}
        showSearch={showSearch}
      />

      {showSearch ? (
        <div className="pt-20 pb-24 md:pb-0">
          <SearchPage />
        </div>
      ) : (
        <>
          {/* ── Hero ── */}
          {heroMovies.length > 0 && (
            <div className="relative h-[65vh] sm:h-[90vh] w-full overflow-hidden bg-black">
              {heroMovies.map((movie, idx) => {
                const liveMovieData = (movie.source === "local"
                  ? (allMovies.find(m => m.slug === movie.slug) || movie)
                  : movie);
                return (
                  <div key={`${movie.slug}-${idx}`} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
                    <img src={liveMovieData.cover_poster}
                      className={`w-full h-full object-cover brightness-[0.5] transition-opacity duration-1000 ${idx === currentSlide && heroTrailerActive && liveMovieData.trailer_key && !isMobile ? "sm:opacity-0" : "opacity-100"}`} alt="" />
                    {idx === currentSlide && heroTrailerActive && liveMovieData.trailer_key && !isMobile && (
                      <div className="absolute inset-0 bg-black overflow-hidden">
                        <div className="relative w-full h-full scale-[1.35] pointer-events-none">
                          <iframe src={`https://www.youtube.com/embed/${liveMovieData.trailer_key}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${liveMovieData.trailer_key}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${window.location.origin}`}
                            title="Hero Trailer" className="w-full h-full" frameBorder="0" allow="autoplay" />
                        </div>
                        <button onClick={e => { e.preventDefault(); setIsMuted(!isMuted); }}
                          className="absolute bottom-32 right-10 z-[40] p-3 bg-black/60 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md border border-white/10 transition-all shadow-2xl active:scale-90">
                          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent flex flex-col justify-end p-6 sm:p-20 z-20 pointer-events-none">
                      <div className="max-w-4xl space-y-4 sm:space-y-6 pointer-events-auto">
                        <div className={`space-y-4 sm:space-y-6 transition-opacity duration-1000 ${!infoVisible ? "opacity-40" : "opacity-100"}`}>
                          <div className="h-16 sm:h-28 md:h-36 w-[280px] sm:w-[450px] flex items-end">
                            {liveMovieData.title_logo ? (
                              <img src={liveMovieData.title_logo} className="max-h-full max-w-full object-contain object-left drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]" alt="" />
                            ) : (
                              <h1 className="text-3xl sm:text-6xl font-black italic uppercase tracking-tighter drop-shadow-2xl leading-none text-white">
                                {liveMovieData.title || liveMovieData.slug}
                              </h1>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-[10px] sm:text-sm font-black text-gray-300">
                            {liveMovieData.imdbRating && (
                              <div className="flex items-center gap-1.5">
                                <div className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[4px] font-black text-[10px] sm:text-[11px] shadow-lg">IMDb</div>
                                <span className="text-white drop-shadow-md">{liveMovieData.imdbRating}</span>
                              </div>
                            )}
                            {liveMovieData.year && (
                              <span className="text-gray-300 drop-shadow-md font-black">{liveMovieData.year}</span>
                            )}
                            <span className="text-blue-400 uppercase tracking-widest drop-shadow-md font-black">{formatLanguageCount(liveMovieData.language)}</span>
                            {/* Hero TV badge */}
                            {liveMovieData.content_type === "tv" && (
                              <span className="px-2 py-0.5 bg-purple-600/80 text-white text-[9px] font-black uppercase tracking-widest rounded">SERIES</span>
                            )}
                            {liveMovieData.genres?.length > 0 && (
                              <span className="text-gray-400 font-bold uppercase tracking-widest border-l border-white/20 pl-4 hidden sm:block">
                                {liveMovieData.genres.slice(0, 2).join(" | ")}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-300 text-xs sm:text-lg line-clamp-2 max-w-2xl font-medium italic drop-shadow-lg leading-relaxed">{liveMovieData.description}</p>
                        </div>
                        <button
                          onClick={() => handleNavigateToWatch(liveMovieData)}
                          className="group w-full sm:w-fit px-8 py-3 sm:px-12 sm:py-4 bg-white text-black hover:bg-blue-600 hover:text-white rounded-xl sm:rounded-2xl font-black flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-lg uppercase tracking-widest">
                          <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-current" />
                          <span className="text-[11px] sm:text-base tracking-widest font-black">
                            {liveMovieData.content_type === "tv" ? "STREAM SERIES" : "PLAY NOW"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="hidden sm:flex absolute bottom-10 left-10 z-20 items-center gap-2">
                {heroMovies.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentSlide(idx)}
                    className={`transition-all duration-500 rounded-full h-1.5 ${idx === currentSlide ? "w-10 bg-blue-500 shadow-[0_0_100px_#3b82f6]" : "w-2 bg-white/30"}`} />
                ))}
              </div>
            </div>
          )}

          {/* ── Main content ── */}
          <main className="relative z-20 pb-32 md:pb-32 mt-4">
            {continueList.length > 0 && (
              <div className="mb-12 max-w-7xl mx-auto px-4 overflow-visible">
                <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2 uppercase tracking-widest px-2 font-black">
                  <Clock3 className="w-5 h-5" /> CONTINUE WATCHING
                </h2>
                <div className="flex gap-6 overflow-x-auto pb-10 pt-4 scrollbar-hide px-2">
                  {continueList.map(({ movie, time }) => {
                    const progressPercent = Math.min(100, (time / (movie.runtime ? movie.runtime * 60 : 7200)) * 100);
                    return (
                      <div key={movie.slug} className="relative flex-none w-[260px] sm:w-[340px] cursor-pointer group/continue transition-all duration-300" onClick={() => navigate(`/watch/${movie.slug}`)}>
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl group-hover:scale-105 transition-all">
                          <img src={movie.cover_poster || movie.poster || "/default-cover.jpg"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={movie.title} />
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                            <div className="h-full bg-blue-600 shadow-[0_0_10px_#2563eb]" style={{ width: `${progressPercent}%` }} />
                          </div>
                        </div>
                        <div className="mt-3 px-1">
                          <h3 className="text-sm font-bold text-gray-200 truncate font-black">{movie.title || movie.slug}</h3>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-900/80 px-2 py-1 rounded-md border border-white/5 mt-1 w-fit">
                            <Clock3 className="w-3 h-3" /> {Math.floor(time / 60)}m watched
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(() => {
              // Genre rows with the Top 10 row after the first, then a per-language
              // "Top 5" trending row woven in after every second genre row.
              const langRows = Object.entries(langTrending).filter(
                ([langName]) => userLangs.length === 0 || userLangs.includes(langName)
              );
              let langIdx = 0;
              const blocks = [];
              const pushLangRow = () => {
                const [langName, langMovies] = langRows[langIdx++];
                blocks.push(
                  <TrendingNumbersRow
                    key={`top5-${langName}`}
                    title={`Top 5 in ${langName}`}
                    limit={5}
                    movies={langMovies}
                    onSelect={handleMovieSelect}
                  />
                );
              };
              Object.entries(groupedByBackendGenre).forEach(([genreName, list], index) => {
                blocks.push(<GenreRow key={genreName} title={genreName} movies={list} onSelect={handleMovieSelect} />);
                if (index === 0) {
                  blocks.push(<TrendingNumbersRow key="top-10-today" movies={trendingMovies} onSelect={handleMovieSelect} />);
                } else if (index % 2 === 0 && langIdx < langRows.length) {
                  pushLangRow();
                }
              });
              while (langIdx < langRows.length) pushLangRow();
              return blocks;
            })()}
          </main>
        </>
      )}

      {/* ── Mobile Movie Detail Sheet ── */}
      {selectedMovie && isMobile && (
        <div className="fixed inset-0 z-[200] bg-gray-950/98 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom duration-500"
          onClick={e => e.target === e.currentTarget && setSelectedMovie(null)}>
          <button onClick={() => setSelectedMovie(null)}
            className="absolute top-6 right-6 z-[210] p-3 bg-black/50 rounded-full text-white backdrop-blur-md active:scale-90 transition-transform">
            <X size={24} />
          </button>
          <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
            <div className="relative aspect-video w-full shadow-2xl bg-black overflow-hidden flex items-center justify-center">
              {selectedMovie.trailer_key ? (
                <>
                  <div className="relative w-full h-full scale-[1.3] pointer-events-none">
                    <iframe
                      src={`https://www.youtube.com/embed/${selectedMovie.trailer_key}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${selectedMovie.trailer_key}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${window.location.origin}`}
                      title="Trailer" className="w-full h-full" frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                  <div className="absolute top-4 left-4 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm shadow-lg pointer-events-none">
                    <span className="text-[8px] font-bold text-white/90 uppercase tracking-[0.2em]">Trailer</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="absolute bottom-10 right-6 z-[220] p-3 bg-black/60 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all border border-white/10 shadow-2xl active:scale-90">
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </>
              ) : (
                <img src={selectedMovie.cover_poster || selectedMovie.poster} className="w-full h-full object-cover opacity-80" alt="" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="px-6 flex flex-col items-center text-center space-y-6 -mt-12 relative z-10">
              {selectedMovie.title_logo ? (
                <img src={selectedMovie.title_logo} className="h-16 w-auto object-contain drop-shadow-2xl mb-2" alt="" />
              ) : (
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl leading-none">{selectedMovie.title || selectedMovie.slug}</h3>
              )}
              <div className="flex items-center gap-4 text-xs font-black text-gray-400">
                {selectedMovie.imdbRating && (
                  <div className="flex items-center gap-1.5">
                    <div className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[3px] font-black text-[9px] shadow-md">IMDb</div>
                    <span className="text-white">{selectedMovie.imdbRating}</span>
                  </div>
                )}
                {selectedMovie.year && <span>{selectedMovie.year}</span>}
                <span className="font-black text-blue-400 uppercase tracking-widest">{formatLanguageCount(selectedMovie.language)}</span>
                {selectedMovie.content_type === "tv" && (
                  <span className="px-2 py-0.5 bg-purple-600/80 text-white text-[9px] font-black uppercase tracking-widest rounded">SERIES</span>
                )}
              </div>
              <button
                onClick={() => handleNavigateToWatch(selectedMovie)}
                className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg uppercase tracking-widest">
                <Play className="w-5 h-5 fill-current" />
                {selectedMovie.content_type === "tv" ? "STREAM SERIES" : "WATCH NOW"}
              </button>
              <div className="flex flex-wrap justify-center gap-2">
                {(selectedMovie.tmdb_genres || selectedMovie.genres || []).map(g => (
                  <span key={g} className="px-3 py-1 bg-gray-900 border border-white/5 rounded-full text-[9px] font-black uppercase text-gray-400 tracking-wider">{g}</span>
                ))}
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm italic opacity-80 font-medium">{selectedMovie.description}</p>
              {relatedMovies.length > 0 && (
                <div className="w-full pt-10 text-left border-t border-white/10 mt-8">
                  <h4 className="text-lg font-black text-white uppercase tracking-widest border-l-4 border-blue-600 pl-3 mb-4">More Like This</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {relatedMovies.map(m => (
                      <div key={m.id || m.slug} className="flex flex-col gap-2 group active:scale-95 transition-transform cursor-pointer"
                        onClick={() => { setSelectedMovie(m); document.querySelector(".overflow-y-auto")?.scrollTo({ top: 0, behavior: "smooth" }); }}>
                        <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/5 bg-gray-900 shadow-lg">
                          <img src={m.poster || "/default-poster.jpg"} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" alt="" />
                        </div>
                        <span className="text-[9px] font-black text-gray-400 truncate uppercase tracking-tighter">{m.title || m.slug}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Detail Overlay ── */}
      {!isMobile && (
        <DesktopDetailOverlay
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onNavigate={handleNavigateToWatch}
          relatedMovies={relatedMovies}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
        />
      )}

      <footer className="py-16 text-center border-t border-white/5 bg-black mt-20 opacity-40 pb-28 md:pb-16">
        <p className="text-[10px] font-mono tracking-[0.5em] uppercase font-black">© 1ANCHORMOVIES 2025</p>
      </footer>
    </div>
  );
};

export default WatchListPage;
