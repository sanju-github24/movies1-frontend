// src/pages/WatchHtmlPage.jsx
import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import MbidadmBanner from "../components/MbidadmBanner";
import {
  Loader2, Star, Play, ShieldCheck,
  ArrowLeft, List, MonitorPlay, Server,
  Video, Zap, Database, Clock, Globe, Calendar, AlertCircle, Tags,
  ChevronDown, Monitor, Cpu, Download, X, Languages,
  Settings, Eye, Film, Tv2,
  Shield, Signal
} from "lucide-react";

/* ===== Safe URI ===== */
const safeURI = (uri) => {
  if (!uri) return "";
  try { return encodeURI(decodeURI(uri)); } catch { return uri; }
};

/* ===== Slug ===== */
const generateSlug = (title) =>
  title?.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "";

/* ===== Detect content type robustly from a state/payload object ===== */
// Priority: explicit content_type field → TV-specific TMDB fields → fallback movie
const detectStateContentType = (s) => {
  if (s.content_type === "tv")    return "tv";
  if (s.content_type === "movie") return "movie";
  // TMDB TV items carry first_air_date; movies carry release_date
  if (s.first_air_date)           return "tv";
  // If episodes array is non-empty it must be a series
  if (Array.isArray(s.episodes) && s.episodes.length > 0) return "tv";
  return "movie";
};

/* ===== Group episodes by season ===== */
const groupEpisodesBySeason = (episodes) => {
  if (!Array.isArray(episodes) || episodes.length === 0) return {};
  return episodes.reduce((acc, ep, globalIndex) => {
    const sNum = ep?.season ? Number(ep.season) : (ep.season_number || 1);
    const key  = `S${sNum}`;
    if (!acc[key]) acc[key] = { name: `Season ${sNum}`, episodes: [], counter: 0 };
    acc[key].counter += 1;
    acc[key].episodes.push({
      ...ep,
      season: sNum,
      globalIndex,
      episodeNumberInSeason: ep.episodeNumberInSeason || ep.episode || ep.episode_number || acc[key].counter,
    });
    return acc;
  }, {});
};

/* ===== Toggle ===== */
const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
    className={`relative inline-flex h-7 w-12 sm:h-6 sm:w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 touch-manipulation
      ${checked ? "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" : "bg-gray-800 border border-white/10"}`}
  >
    <span className={`inline-block h-5 w-5 sm:h-4 sm:w-4 transform rounded-full shadow-md transition-all duration-300
      ${checked ? "translate-x-6 bg-white" : "translate-x-1 bg-gray-500"}`} />
  </button>
);

/* ===== Server Badge ===== */
const COLOR = {
  imdb_reader: { glow:"rgba(234,179,8,0.3)",  bg:"from-yellow-500/10 to-yellow-600/5", border:"border-yellow-500/30", text:"text-yellow-400", dot:"bg-yellow-400" },
  embed:       { glow:"rgba(99,102,241,0.3)",  bg:"from-indigo-500/10 to-indigo-600/5", border:"border-indigo-500/30", text:"text-indigo-400", dot:"bg-indigo-400" },
  vidify:      { glow:"rgba(168,85,247,0.3)",  bg:"from-purple-500/10 to-purple-600/5", border:"border-purple-500/30", text:"text-purple-400", dot:"bg-purple-400" },
  videasy:     { glow:"rgba(59,130,246,0.3)",  bg:"from-blue-500/10 to-blue-600/5",   border:"border-blue-500/30",   text:"text-blue-400",   dot:"bg-blue-400"   },
  vidup:       { glow:"rgba(6,182,212,0.3)",   bg:"from-cyan-500/10 to-cyan-600/5",    border:"border-cyan-500/30",   text:"text-cyan-400",   dot:"bg-cyan-400"   },
  tmdb:        { glow:"rgba(59,130,246,0.3)",  bg:"from-blue-500/10 to-blue-600/5",   border:"border-blue-500/30",   text:"text-blue-400",   dot:"bg-blue-400"   },
  "2embed":    { glow:"rgba(249,115,22,0.3)",  bg:"from-orange-500/10 to-orange-600/5",border:"border-orange-500/30",text:"text-orange-400", dot:"bg-orange-400" },
  hls:         { glow:"rgba(34,197,94,0.3)",   bg:"from-green-500/10 to-green-600/5",  border:"border-green-500/30",  text:"text-green-400",  dot:"bg-green-400"  },
};

const ServerBadge = ({ server, isActive, onClick, compact = false }) => {
  const c = COLOR[server.id] || COLOR.videasy;
  if (compact) return (
    <button onClick={onClick}
      className={`relative flex items-center gap-2 px-3.5 py-2.5 sm:px-3 sm:py-2 rounded-lg text-xs font-bold uppercase tracking-wider
        transition-all duration-200 border min-h-[44px] touch-manipulation active:scale-95
        ${isActive ? `bg-gradient-to-br ${c.bg} ${c.border} ${c.text}` : "bg-white/[0.03] border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10"}`}
      style={isActive ? { boxShadow:`0 0 20px ${c.glow}` } : {}}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? c.dot : "bg-gray-600"} ${isActive ? "animate-pulse" : ""}`} />
      {server.name}
      {isActive && <span className="text-[9px] opacity-60 ml-1 hidden sm:inline">{server.label}</span>}
    </button>
  );
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-4 sm:py-3.5 rounded-xl text-left transition-all duration-200 border min-h-[44px] touch-manipulation active:scale-[0.98]
        ${isActive ? `bg-gradient-to-br ${c.bg} ${c.border}` : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"}`}
      style={isActive ? { boxShadow:`0 0 24px ${c.glow}` } : {}}>
      <div className={`shrink-0 p-2 rounded-lg ${isActive ? `bg-gradient-to-br ${c.bg}` : "bg-white/5"}`}>
        <div className={isActive ? c.text : "text-gray-600"}>{server.icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold truncate ${isActive ? "text-white" : "text-gray-400"}`}>{server.name}</div>
        <div className={`text-[10px] truncate ${isActive ? c.text : "text-gray-600"}`}>{server.label}</div>
      </div>
      {isActive && <span className={`shrink-0 w-2 h-2 rounded-full ${c.dot} animate-pulse`} />}
    </button>
  );
};

/* ===== Server color classes for grid ===== */
const SRV_COLOR = {
  imdb_reader: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/50",
  embed:       "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/50",
  vidify:      "text-purple-400 bg-purple-500/10 border-purple-500/20 hover:border-purple-500/50",
  videasy:     "text-blue-400   bg-blue-500/10   border-blue-500/20   hover:border-blue-500/50",
  vidup:       "text-cyan-400   bg-cyan-500/10   border-cyan-500/20   hover:border-cyan-500/50",
  tmdb:        "text-blue-400   bg-blue-500/10   border-blue-500/20   hover:border-blue-500/50",
  "2embed":    "text-orange-400 bg-orange-500/10 border-orange-500/20 hover:border-orange-500/50",
  hls:         "text-green-400  bg-green-500/10  border-green-500/20  hover:border-green-500/50",
};

/* ===================================================================
   buildServers — derives available server list from meta
=================================================================== */
const buildServers = (meta, eps = []) => {
  const srv = [];
  // Always include Omega — at play-time we fall back to tmdb_id if imdb_id is absent
  srv.push({ id:"imdb_reader", name:"Omega", label:"Direct Stream", icon:<Cpu size={14}/> });
  if (meta.html_code || eps.some(e => e.html))
    srv.push({ id:"embed",       name:"Multi Audio", label:"Backup Node",   icon:<Languages size={14}/> });
  if (meta.tmdb_id) {
    srv.push({ id:"vidify",  name:"Vidify",  label:"Premium",     icon:<Zap size={14}/>     });
    srv.push({ id:"videasy", name:"VidEasy", label:"Simple",       icon:<Globe size={14}/>   });
  }
  srv.push(
    { id:"vidup",  name:"VidUp", label:"High Quality", icon:<Monitor size={14}/>    },
    { id:"tmdb",   name:"Alpha", label:"Auto Select",  icon:<MonitorPlay size={14}/> },
    { id:"2embed", name:"Prime", label:"Global CDN",   icon:<Globe size={14}/>       }
  );
  if (meta.video_url || eps.some(e => e.direct_url))
    srv.push({ id:"hls", name:"Direct", label:"HLS Stream", icon:<Video size={14}/> });
  return srv;
};

/* ===================================================================
   WatchHtmlPage
=================================================================== */
const WatchHtmlPage = () => {
  const { slug: routeSlug } = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { backendUrl } = useContext(AppContext);

  const [loading,           setLoading          ] = useState(true);
  const [movieMeta,         setMovieMeta        ] = useState(null);
  const [tmdbMeta,          setTmdbMeta         ] = useState(null);
  const [episodes,          setEpisodes         ] = useState([]);
  const [availableServers,  setAvailableServers ] = useState([]);
  const [activeServer,      setActiveServer     ] = useState(null);
  const [activeSeason,      setActiveSeason     ] = useState("S1");
  const [openDropdown,      setOpenDropdown     ] = useState(null);
  const [imgLoaded,         setImgLoaded        ] = useState(false);

  const [showOverlay,       setShowOverlay      ] = useState(false);
  const [finalSource,       setFinalSource      ] = useState(null);
  const [sourceType,        setSourceType       ] = useState(null);
  const [videoTitle,        setVideoTitle       ] = useState(routeSlug);
  const [currentOverlayEp,  setCurrentOverlayEp ] = useState(null);

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [autoNextEpisode,   setAutoNextEpisode  ] = useState(true);
  const [spoilerProtection, setSpoilerProtection] = useState(true);
  const [activeTab,         setActiveTab        ] = useState("servers");

  const groupedEpisodes = useMemo(() => groupEpisodesBySeason(episodes), [episodes]);

  /* Lock body scroll behind the overlay player on mobile so the iframe
     is the only scrollable/interactive surface and nothing shifts under touch */
  useEffect(() => {
    if (showOverlay) {
      const prevOverflow = document.body.style.overflow;
      const prevTouch = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouch;
      };
    }
  }, [showOverlay]);

  /* ── fetch full TMDB detail (cast + episodes + runtime etc.) ── */
const fetchFullTmdb = useCallback(async (tmdbId, imdbId, contentType) => {
    if (!backendUrl) return null;
    // Build params — always send whatever identifiers we have
    // Backend now handles tmdbId+contentType directly (no search round-trip)
    const params = {};
    if (imdbId)      params.imdbId      = imdbId;
    if (tmdbId)      params.tmdbId      = String(tmdbId);
    if (contentType) params.contentType = contentType;
    if (!imdbId && !tmdbId) return null;
    try {
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params });
      if (!res.data?.success) return null;
      const d    = res.data.data;
      const cast = d?.cast ?? d?.credits?.cast ?? d?.aggregate_credits?.cast ?? [];

      // Normalize episodes: backend returns { season, episode, title, overview, still_path }
      // Frontend needs: { season, episodeNumberInSeason, title, description, thumbnail }
      const episodes = (d?.episodes || []).map(ep => ({
        season:                ep.season        || ep.season_number || 1,
        season_number:         ep.season        || ep.season_number || 1,
        episodeNumberInSeason: ep.episode       || ep.episode_number || 1,
        episode:               ep.episode       || ep.episode_number || 1,
        title:                 ep.title         || ep.name          || `Episode ${ep.episode || 1}`,
        name:                  ep.title         || ep.name          || "",
        description:           ep.overview      || ep.description   || "",
        thumbnail:             ep.still_path
          ? (ep.still_path.startsWith("http")
              ? ep.still_path
              : `https://image.tmdb.org/t/p/w300${ep.still_path}`)
          : null,
        air_date: ep.air_date || null,
      }));

      return { ...d, cast, episodes };
    } catch { return null; }
  }, [backendUrl]);

  /* ── fetch episodes for a TV series via /api/tmdb-episodes ── */
const fetchTmdbEpisodes = useCallback(async (tmdbId, imdbId) => {
  if (!backendUrl) return [];
  const params = {};
  if (tmdbId) params.tmdbId = String(tmdbId);
  else if (imdbId) params.imdbId = imdbId;
  else return [];
  try {
    const res = await axios.get(`${backendUrl}/api/tmdb-episodes`, { params });
    if (!res.data?.success) return [];
    return res.data.episodes || [];
  } catch { return []; }
}, [backendUrl]);
  

  /* ── handlePlayAction ── */
  const handlePlayAction = useCallback((manualEp = null, forceServer = null) => {
    if (!movieMeta) return;

    const serverId = forceServer || activeServer?.id || availableServers[0]?.id;
    const ep       = manualEp || currentOverlayEp;

    const imdb = (movieMeta.imdb_id || "").trim();
    const tmdb = String(movieMeta.tmdb_id || movieMeta.id || "");
    const id   = tmdb || imdb;
    const isTV = movieMeta.content_type === "tv" || episodes.length > 0;

    const s = ep?.season                  || 1;
    const e = ep?.episodeNumberInSeason   || 1;

    let src  = null;
    let type = "url";
    let label = movieMeta.title || routeSlug;
    if (ep) {
      label = `${movieMeta.title || routeSlug} — S${s}E${e}`;
      setCurrentOverlayEp(ep);
    }

    const TV   = isTV || !!ep;
    const p_vidify  = "autoplay=false&poster=true&chromecast=true&servericon=true&setting=true&pip=true&logourl=https%3A%2F%2Fi.postimg.cc%2Fd05hg4kT%2Flogo-39.png&font=Roboto&fontcolor=6f63ff&fontsize=20&opacity=0.5&primarycolor=3b82f6&secondarycolor=1f2937&iconcolor=ffffff";
    const p_videasy = "nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=3B82F6";

    switch (serverId) {
      case "imdb_reader": { const omegaId = imdb || tmdb; if (omegaId) src = `https://piexe411qok.com/play/${omegaId}`; break; }
      case "vidify":  if (tmdb) src = TV ? `https://player.vidify.top/embed/tv/${tmdb}/${s}/${e}?${p_vidify}`   : `https://player.vidify.top/embed/movie/${tmdb}?${p_vidify}`;   break;
      case "videasy": if (tmdb) src = TV ? `https://player.videasy.net/tv/${tmdb}/${s}/${e}?${p_videasy}` : `https://player.videasy.net/movie/${tmdb}?${p_videasy}`; break;
      case "vidup":   if (id)   src = TV ? `https://vidup.to/tv/${id}/${s}/${e}?autoPlay=true`            : `https://vidup.to/movie/${id}?autoPlay=true`;            break;
      case "tmdb":    if (tmdb) src = TV ? `https://vidlink.pro/tv/${tmdb}/${s}/${e}`                     : `https://vidlink.pro/movie/${tmdb}`;                     break;
      case "2embed":  if (id)   src = TV ? `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`            : `https://www.2embed.cc/embed/${id}`;                     break;
      case "hls":
        src  = ep ? ep.direct_url : movieMeta.video_url;
        type = "video"; break;
      case "embed":
        src  = ep ? (ep.html || ep.html_code) : movieMeta.html_code;
        type = src ? "html" : null; break;
      default: break;
    }

    // Ultimate fallback — videasy works for both movies and TV with just tmdb_id
    if (!src && tmdb) {
      src = TV
        ? `https://player.videasy.net/tv/${tmdb}/${s}/${e}?${p_videasy}`
        : `https://player.videasy.net/movie/${tmdb}?${p_videasy}`;
    }

    if (src) {
      setFinalSource(src);
      setSourceType(type);
      setVideoTitle(label);
      setShowOverlay(true);
    }
  }, [movieMeta, activeServer, availableServers, currentOverlayEp, episodes, routeSlug]);

  const handleServerSwitch = (server) => {
    setActiveServer(server);
    handlePlayAction(currentOverlayEp, server.id);
  };

  /* ── Main data fetch ── */
  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      try {
        let meta  = null;
        let tData = null;
        let eps   = [];

        /* ══ BRANCH A: TMDB content passed via router state ══
           Handles both buildTmdbMovie().tmdbPayload objects
           AND raw TMDB search-result objects from SearchResults page.
           content_type is now reliable — set by detectContentType() in WatchListPage.  */
        const stateMovie = location.state?.movie;
        if (stateMovie) {
          const tmdbId      = stateMovie.tmdb_id || stateMovie.id   || null;
          const imdbId      = stateMovie.imdb_id                     || null;

          if (!tmdbId && !imdbId) {
            console.warn("[WatchHtmlPage] stateMovie has no tmdb_id/imdb_id:", stateMovie);
          }

          // Use the robust helper — handles all payload shapes
          const contentType = detectStateContentType(stateMovie);

          meta = {
            source:       "tmdb",
            slug:         stateMovie.slug || generateSlug(stateMovie.title || stateMovie.name || "") || routeSlug,
            title:        stateMovie.title || stateMovie.name || routeSlug,
            tmdb_id:      tmdbId ? String(tmdbId) : null,
            imdb_id:      imdbId,
            content_type: contentType,
            poster:       safeURI(stateMovie.poster
              || (stateMovie.poster_path ? `https://image.tmdb.org/t/p/w500${stateMovie.poster_path}` : "/default-poster.jpg")),
            background:   safeURI(stateMovie.cover_poster
              || (stateMovie.backdrop_path ? `https://image.tmdb.org/t/p/original${stateMovie.backdrop_path}` : null)
              || stateMovie.poster || "/default-cover.jpg"),
            imdbRating:   stateMovie.imdb_rating != null
              ? String(stateMovie.imdb_rating)
              : (stateMovie.vote_average != null ? Number(stateMovie.vote_average).toFixed(1) : "0.0"),
            year:         stateMovie.year
              || stateMovie.release_date?.split("-")[0]
              || stateMovie.first_air_date?.split("-")[0]
              || null,
            description:  stateMovie.description || stateMovie.overview || "No description available.",
            genres:       (stateMovie.genres || []).map(g => typeof g === "object" ? g.name : g),
            certification: stateMovie.certification || null,
            runtime:      stateMovie.runtime || null,
            download_links: stateMovie.download_links || [],
            video_url:    stateMovie.video_url || null,
            html_code:    stateMovie.html_code || null,
          };

          eps = Array.isArray(stateMovie.episodes) ? stateMovie.episodes : [];

          // Enrich with full TMDB detail (cast, episodes, runtime, genres, imdb_id …)
          // Pass the detected contentType so the backend fetches the right endpoint
          if (tmdbId || imdbId) {
            const full = await fetchFullTmdb(tmdbId, imdbId, contentType);
            if (full) {
              tData = full;
              // The full TMDB response may reveal TV status we didn't know before
              const enrichedContentType =
                full.content_type === "tv" ? "tv"
                : full.content_type === "movie" ? "movie"
                : contentType;

              meta = {
                ...meta,
                imdb_id:    meta.imdb_id    || full.imdb_id    || null,
                tmdb_id:    meta.tmdb_id    || String(full.tmdb_id || full.id || ""),
                imdbRating: full.imdb_rating != null
                  ? String(full.imdb_rating)
                  : meta.imdbRating,
                runtime:    full.runtime    || meta.runtime,
                certification: full.certification || meta.certification,
                description: full.overview  || full.description || meta.description,
                genres:     (full.genres || []).map(g => typeof g === "object" ? g.name : g).length > 0
                  ? (full.genres || []).map(g => typeof g === "object" ? g.name : g)
                  : meta.genres,
                // Always trust enriched content_type if available
                content_type: enrichedContentType,
              };
              if (Array.isArray(full.episodes) && full.episodes.length > 0) eps = full.episodes;
            }
          }
        }

        /* ══ BRANCH B: local Supabase lookup (no router state) ══ */
        if (!meta) {
          const [watchRes, movieRes] = await Promise.all([
            supabase.from("watch_html").select("*").eq("slug", routeSlug).maybeSingle(),
            supabase.from("movies").select("*").eq("slug", routeSlug).maybeSingle(),
          ]);
          let watchData = watchRes.data;
          let movieData = movieRes.data;

          if (!movieData?.description && watchData?.title) {
            const { data: tm } = await supabase.from("movies").select("*").eq("title", watchData.title).maybeSingle();
            if (tm) movieData = tm;
          }

          if (watchData) {
            tData = watchData.imdb_id ? await fetchFullTmdb(null, watchData.imdb_id, null) : null;
            eps   = Array.isArray(watchData.episodes) ? watchData.episodes : [];
            if (eps.length === 0 && Array.isArray(tData?.episodes)) eps = tData.episodes;

            meta = {
              source:       "local",
              ...watchData,
              title:        watchData.title || watchData.slug,
              tmdb_id:      watchData.tmdb_id || tData?.tmdb_id || null,
              imdb_id:      watchData.imdb_id || null,
              content_type: watchData.content_type || (eps.length > 0 ? "tv" : "movie"),
              poster:       safeURI(watchData.poster || tData?.poster_url || "/default-poster.jpg"),
              background:   safeURI(watchData.cover_poster || tData?.cover_poster_url || watchData.poster),
              imdbRating:   watchData.imdb_rating || tData?.imdb_rating?.toFixed?.(1) || "0.0",
              year:         watchData.year || tData?.year || null,
              description:  movieData?.description || tData?.overview || watchData?.description || "No description available.",
              genres:       watchData.genres
                || (tData?.genres || []).map(g => typeof g === "object" ? g.name : g) || [],
              download_links: Array.isArray(watchData.download_links) ? watchData.download_links : [],
            };
          }
        }

if (!alive) return;

        if (meta) {
          const isTV = meta.content_type === "tv" || eps.length > 0;

          if (isTV && (meta.tmdb_id || meta.imdb_id)) {
            const tmdbEps = await fetchTmdbEpisodes(meta.tmdb_id, meta.imdb_id);

            if (tmdbEps.length > 0) {
              // ── Figure out exactly which seasons+episode-counts DB has ──
              // e.g. DB has Season 1 × 12 eps → only show S1E1–S1E12 from TMDB
              const dbGrouped = {};
              eps.forEach(dbEp => {
                const s = String(dbEp.season || 1);
                if (!dbGrouped[s]) dbGrouped[s] = [];
                dbGrouped[s].push(dbEp);
              });

              // seasons present in DB (e.g. ["1"])
              const dbSeasons = Object.keys(dbGrouped).map(Number);

              // If DB has NO episodes at all, show all TMDB episodes
              const hasDbEps = eps.length > 0;

              // ── Build position-based lookup: S1E1 → db episode at index 0 ──
              const dbBySeasonEp = {};
              Object.entries(dbGrouped).forEach(([s, list]) => {
                list.forEach((dbEp, idx) => {
                  dbBySeasonEp[`${s}__${idx + 1}`] = dbEp;
                });
              });

              // ── Normalized title lookup as secondary match ──
              const normalize = (str) =>
                (str || "").toLowerCase().trim()
                  .replace(/[^a-z0-9\s]/g, "")
                  .replace(/\s+/g, " ");
              const dbByTitle = {};
              eps.forEach(dbEp => {
                const key = `${dbEp.season || 1}__${normalize(dbEp.title)}`;
                dbByTitle[key] = dbEp;
              });

              // ── Filter TMDB episodes to only seasons DB has uploaded ──
              // AND only up to the episode count DB has for that season
              const filteredTmdbEps = hasDbEps
                ? tmdbEps.filter(tmdbEp => {
                    const s = tmdbEp.season;
                    if (!dbSeasons.includes(s)) return false; // season not uploaded
                    const dbCountForSeason = dbGrouped[String(s)]?.length || 0;
                    return tmdbEp.episodeNumberInSeason <= dbCountForSeason;
                  })
                : tmdbEps; // no DB eps → show everything from TMDB

              // ── Merge: attach DB html/direct_url onto matching TMDB episode ──
              eps = filteredTmdbEps.map(tmdbEp => {
                const posKey   = `${tmdbEp.season}__${tmdbEp.episodeNumberInSeason}`;
                const titleKey = `${tmdbEp.season}__${normalize(tmdbEp.title)}`;
                const dbMatch  = dbBySeasonEp[posKey] || dbByTitle[titleKey] || null;

                return {
                  ...tmdbEp,
                  html:       dbMatch?.html       || null,
                  html_code:  dbMatch?.html       || null,
                  direct_url: dbMatch?.direct_url || null,
                  hasEmbed:   !!(dbMatch?.html),
                  hasDirect:  !!(dbMatch?.direct_url),
                };
              });

              meta = { ...meta, content_type: "tv" };
            }
          }

          if (eps.length > 0 && meta.content_type !== "tv") {
            meta = { ...meta, content_type: "tv" };
          }

          setMovieMeta(meta);
          setTmdbMeta(tData);
          setEpisodes(eps);
          const srv = buildServers(meta, eps);
          setAvailableServers(srv);
          setActiveServer(srv[0] || null);
          if (eps.length > 0) setActiveSeason(`S${eps[0]?.season || 1}`);
        }
      } catch (err) {
        console.error("[WatchHtmlPage]", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => { alive = false; };
  }, [routeSlug, backendUrl, fetchFullTmdb, fetchTmdbEpisodes, location.state]);

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
        </div>
        <div className="absolute -inset-2 rounded-3xl border border-blue-500/10 animate-ping" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-white font-black text-xs uppercase tracking-[0.3em]">Initializing</p>
        <p className="text-gray-600 text-[10px] uppercase tracking-widest">Neural Link Active</p>
      </div>
    </div>
  );

  /* ── Not Found ── */
  if (!movieMeta) return (
    <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center gap-4 text-center px-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <h2 className="text-white font-black text-xl uppercase tracking-widest">Content Not Found</h2>
      <p className="text-gray-500 text-sm">This title is unavailable or was removed.</p>
      <button onClick={() => navigate("/watch")}
        className="mt-4 px-6 py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest">
        Back to Home
      </button>
    </div>
  );

  const isTVShow = movieMeta.content_type === "tv" || episodes.length > 0;

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#070709] text-white pb-24 font-sans overflow-x-hidden">

      {/* ── OVERLAY PLAYER ── */}
      {showOverlay && (
        <div
          className="fixed inset-0 z-[1000] bg-[#070709] flex flex-col"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            height: "100dvh",
          }}
        >

          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-black/60 backdrop-blur-xl border-b border-white/[0.04] shrink-0 z-20">
            <button onClick={() => { setShowOverlay(false); setCurrentOverlayEp(null); setShowSettingsPanel(false); }}
              aria-label="Close player and go back"
              className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] min-w-[44px] justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/5 touch-manipulation">
              <ArrowLeft size={17} />
              <span className="text-xs font-bold hidden sm:inline tracking-wide">Back</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <h2 className="text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.15em] truncate max-w-[40vw] sm:max-w-[35vw]">{videoTitle}</h2>
            </div>
            <button onClick={() => setShowSettingsPanel(v => !v)}
              aria-label="Toggle player settings"
              className={`flex items-center gap-2 px-3 py-2.5 min-h-[44px] min-w-[44px] justify-center rounded-xl border transition-all text-xs font-bold tracking-wide touch-manipulation
                ${showSettingsPanel ? "bg-blue-600/20 border-blue-500/40 text-blue-300" : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:border-white/20"}`}>
              <Settings size={16} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>

          {/* Quick server bar */}
          <div
            className="px-3 sm:px-4 py-2 bg-black/40 backdrop-blur-md border-b border-white/[0.03] shrink-0 z-10 overflow-x-auto"
            style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
          >
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[9px] text-gray-600 uppercase tracking-widest font-black shrink-0 mr-1">Server:</span>
              {availableServers.map(s => (
                <ServerBadge key={s.id} server={s} isActive={activeServer?.id === s.id}
                  onClick={() => handleServerSwitch(s)} compact />
              ))}
            </div>
          </div>

          {/* Player + settings */}
          <div className="flex flex-1 overflow-hidden relative min-h-0">
            <div className={`flex-1 bg-black transition-all duration-300 relative ${showSettingsPanel ? "lg:mr-[320px]" : ""}`}>
              {sourceType === "html"  ? <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: finalSource }} /> :
               sourceType === "video" ? (
                 <video
                   src={finalSource}
                   controls
                   autoPlay
                   playsInline
                   webkit-playsinline="true"
                   preload="metadata"
                   className="w-full h-full bg-black"
                 />
               ) : (
                 <iframe
                   src={finalSource}
                   title={videoTitle}
                   className="w-full h-full border-none"
                   allowFullScreen
                   webkitallowfullscreen="true"
                   mozallowfullscreen="true"
                   allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
                   referrerPolicy="no-referrer-when-downgrade"
                 />
               )}
            </div>

            {/* Settings panel */}
            <div
              className={`absolute lg:relative top-0 right-0 h-full w-full sm:w-[340px] lg:w-[320px]
              bg-[#0a0a0c] border-l border-white/[0.04] flex flex-col overflow-hidden
              transition-transform duration-300 ease-in-out z-20
              ${showSettingsPanel ? "translate-x-0" : "translate-x-full lg:translate-x-full"}`}
              style={{ paddingBottom: showSettingsPanel ? "env(safe-area-inset-bottom)" : undefined }}
            >

              <div className="shrink-0 border-b border-white/[0.04]">
                <div className="flex items-center justify-between px-4 sm:px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.15em]">Player Settings</h3>
                  </div>
                  <button onClick={() => setShowSettingsPanel(false)}
                    aria-label="Close settings panel"
                    className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-white/5 active:bg-white/10 text-gray-600 hover:text-white transition-all touch-manipulation">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex px-3 sm:px-5 gap-1 pb-3">
                  {["servers","cast","settings"].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 min-h-[40px] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all touch-manipulation
                        ${activeTab === tab ? "bg-white/10 text-white border border-white/10" : "text-gray-600 hover:text-gray-400"}`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                {activeTab === "servers" && (
                  <div className="p-4 space-y-2">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-1 mb-3">Available Servers</p>
                    {availableServers.map(sv => (
                      <ServerBadge key={sv.id} server={sv} isActive={activeServer?.id === sv.id} onClick={() => handleServerSwitch(sv)} />
                    ))}
                  </div>
                )}

                {activeTab === "cast" && (
                  <div className="p-4 space-y-4">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Starring Cast</p>
                    {(tmdbMeta?.cast || []).length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {tmdbMeta.cast.slice(0, 18).map((actor, i) => (
                          <div key={i} className="group flex flex-col items-center gap-2 text-center">
                            <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/5 group-hover:border-blue-500/30 transition-all bg-white/5">
                              <img
                                src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : "/default-avatar.jpg"}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                alt={actor.name}
                                onError={e => { e.target.onerror = null; e.target.src = "/default-avatar.jpg"; }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-gray-500 group-hover:text-blue-400 transition-colors leading-tight line-clamp-2 uppercase tracking-tight">{actor.name}</span>
                            {actor.character && <span className="text-[8px] text-gray-700 line-clamp-1 w-full">{actor.character}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {[...Array(9)].map((_,i) => (
                          <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                            <div className="w-full aspect-square rounded-xl bg-white/5 border border-white/5" />
                            <div className="h-1.5 w-3/4 bg-white/5 rounded" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "settings" && (
                  <div className="p-4 space-y-4">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Preferences</p>
                    <div className="p-4 rounded-xl bg-blue-600/5 border border-blue-500/10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-600/10"><Eye size={14} className="text-blue-400" /></div>
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Now Playing</p>
                          <p className="text-xs font-bold text-white truncate max-w-[180px]">{videoTitle}</p>
                        </div>
                      </div>
                    </div>
                    {episodes.length > 0 && (
                      <div className="rounded-xl border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                        <div className="flex items-start justify-between gap-4 px-4 py-4 bg-white/[0.01]">
                          <div>
                            <p className="text-xs font-bold text-white mb-1">Spoiler Protection</p>
                            <p className="text-[10px] text-gray-600 leading-relaxed">Blur upcoming episodes</p>
                          </div>
                          <Toggle checked={spoilerProtection} onChange={setSpoilerProtection} />
                        </div>
                        <div className="flex items-start justify-between gap-4 px-4 py-4 bg-white/[0.01]">
                          <div>
                            <p className="text-xs font-bold text-white mb-1">Auto Next Episode</p>
                            <p className="text-[10px] text-gray-600 leading-relaxed">Play next automatically</p>
                          </div>
                          <Toggle checked={autoNextEpisode} onChange={setAutoNextEpisode} />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Stream Status</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-2">
                          <Signal size={12} className="text-green-400" /><span className="text-[10px] text-gray-400 font-bold">Connected</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-2">
                          <Shield size={12} className="text-blue-400" /><span className="text-[10px] text-gray-400 font-bold">Secured</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showSettingsPanel && (
              <div className="absolute inset-0 bg-black/70 z-10 lg:hidden backdrop-blur-sm touch-manipulation" onClick={() => setShowSettingsPanel(false)} />
            )}
          </div>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 inset-x-0 z-[110] h-16 flex items-center px-4">
        <div className="absolute inset-0 bg-[#070709]/80 backdrop-blur-xl border-b border-white/[0.04]" />
        <div className="relative max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              aria-label="Go back"
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 hover:border-white/10 transition-all group touch-manipulation">
              <ArrowLeft size={18} className="text-gray-400 group-hover:text-white transition-colors" />
            </button>
            <Link to="/"><img src="/logo_39.png" className="h-7" alt="logo" /></Link>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest hidden sm:block">Global Source Active</span>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <div className="relative pt-16 w-full min-h-[560px] overflow-hidden">
        {movieMeta.background && (
          <div className="absolute inset-0 z-0">
            <img src={movieMeta.background} alt=""
              className={`w-full h-full object-cover scale-110 transition-all duration-[2s] ${imgLoaded ? "opacity-25 scale-100" : "opacity-0 scale-110"}`}
              onLoad={() => setImgLoaded(true)} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070709] via-[#070709]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#070709] to-transparent" />
          </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">

          {/* Poster */}
          <div className="shrink-0 mx-auto lg:mx-0">
            <div className="relative">
              <div className="absolute -inset-4 bg-blue-600/10 rounded-[2rem] blur-2xl" />
              <div className="relative w-[160px] sm:w-[200px] aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8)]">
                <img src={movieMeta.poster || "/default-poster.jpg"} className="w-full h-full object-cover" alt={movieMeta.title} />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
              </div>
              <div className="absolute -bottom-3 -right-3 flex items-center gap-1 bg-[#070709] border border-white/10 px-2.5 py-1.5 rounded-xl shadow-xl">
                <Star size={11} className="text-yellow-400" fill="currentColor" />
                <span className="text-white font-black text-xs">{movieMeta.imdbRating || "0.0"}</span>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="flex-1 space-y-5 lg:pt-6 text-center lg:text-left">

            {/* Eyebrow */}
            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
              {isTVShow
                ? <><Tv2 size={12} className="text-blue-400"/><span className="text-blue-400 font-black text-[9px] uppercase tracking-[0.25em]">TV Series</span></>
                : <><Film size={12} className="text-blue-400"/><span className="text-blue-400 font-black text-[9px] uppercase tracking-[0.25em]">Feature Film</span></>
              }
              {movieMeta.source === "tmdb" && (
                <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-400 text-[8px] font-black uppercase tracking-widest">TMDB</span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black uppercase tracking-tighter italic text-white leading-[0.9] drop-shadow-2xl">
              {movieMeta.slug}
            </h1>

            {/* Tags */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="flex items-center gap-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-lg shadow-blue-600/30">
                <ShieldCheck size={10}/> HD
              </span>
              {(movieMeta.runtime || tmdbMeta?.runtime) && (
                <span className="flex items-center gap-1.5 text-gray-400 text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg">
                  <Clock size={10} className="text-blue-400"/> {movieMeta.runtime || tmdbMeta.runtime} min
                </span>
              )}
              {movieMeta.year && (
                <span className="text-gray-400 text-[9px] font-black uppercase bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg">
                  {movieMeta.year}
                </span>
              )}
              {movieMeta.certification && (
                <span className="text-gray-400 text-[9px] font-black uppercase bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg">
                  {movieMeta.certification}
                </span>
              )}
              {movieMeta.genres.slice(0,2).map((g,i) => (
                <span key={i} className="text-gray-400 text-[9px] font-black uppercase bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg">
                  {typeof g === "object" ? g.name : g}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-blue-600 pl-4 mx-auto lg:mx-0 text-left max-w-xl lg:max-w-none max-h-[120px] overflow-y-auto font-normal opacity-90">
              {movieMeta.description}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
              <button
                onClick={() => {
                const firstEp = isTVShow && episodes.length > 0 ? episodes[0] : null;
                const autoServer = firstEp?.hasEmbed ? "embed" : null;
                handlePlayAction(firstEp, autoServer);
              }}
                className="group relative overflow-hidden px-8 py-4 sm:py-3.5 min-h-[48px] bg-blue-600 text-white font-black rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-blue-600/25 hover:shadow-blue-600/50 transition-all text-[10px] uppercase tracking-widest active:scale-[0.98] touch-manipulation">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative p-1.5 bg-white/20 rounded-lg"><Play size={14} fill="currentColor"/></div>
                <span className="relative">{isTVShow ? "Stream Now" : "Play Now"}</span>
              </button>
              {movieMeta.download_links?.length > 0 && (
                <button onClick={() => document.getElementById("download-section")?.scrollIntoView({ behavior:"smooth" })}
                  className="px-8 py-4 sm:py-3.5 min-h-[48px] bg-white/5 text-white border border-white/10 font-black rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 hover:border-white/20 transition-all text-[10px] uppercase tracking-widest active:scale-[0.98] touch-manipulation">
                  <Download size={15}/> Download
                </button>
              )}
            </div>

            {/* Quick server select */}
            {availableServers.length > 0 && (
              <div className="pt-2">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2 text-center lg:text-left">Available Servers</p>
                <div
                  className="flex gap-2 justify-start lg:justify-start overflow-x-auto sm:flex-wrap sm:overflow-visible -mx-1 px-1"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {availableServers.slice(0,5).map(sv => (
                    <button key={sv.id}
                      onClick={() => { setActiveServer(sv); handlePlayAction(null, sv.id); }}
                      className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 min-h-[40px] rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all active:scale-95 touch-manipulation
                        ${activeServer?.id === sv.id ? (SRV_COLOR[sv.id] || "text-blue-400 bg-blue-500/10 border-blue-500/30") : "text-gray-600 bg-white/[0.02] border-white/5 hover:text-gray-400 hover:border-white/10"}`}>
                      <span className={`w-1 h-1 rounded-full ${activeServer?.id === sv.id ? "bg-current" : "bg-gray-700"}`}/>
                      {sv.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Centered high-impression ad banner */}
      <MbidadmBanner />

      {/* ── MAIN CONTENT ── */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-20 z-10">

        {/* Episodes */}
        {episodes.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/10"><List size={18} className="text-blue-400"/></div>
              <div>
                <h2 className="text-base font-black uppercase tracking-[0.15em] text-white">Episodes</h2>
                <p className="text-[10px] text-gray-600 font-bold">{episodes.length} episodes available</p>
              </div>
            </div>

            {/* Season tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
              {Object.keys(groupedEpisodes).map(sk => (
                <button key={sk} onClick={() => setActiveSeason(sk)}
                  className={`shrink-0 px-5 py-2.5 min-h-[40px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border touch-manipulation
                    ${activeSeason === sk ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" : "bg-white/[0.03] text-gray-500 border-white/5 hover:text-gray-300 hover:border-white/10"}`}>
                  {groupedEpisodes[sk].name}
                </button>
              ))}
            </div>

            {/* Episode grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupedEpisodes[activeSeason]?.episodes?.map((ep, i) => (
                <div key={i} className="relative">
                  <div onClick={() => {
                    // If episode has an embed, single-tap plays it directly
                    if (ep.hasEmbed && openDropdown !== i) {
                      handlePlayAction(ep, "embed");
                      return;
                    }
                    setOpenDropdown(openDropdown === i ? null : i);
                  }}
                    className={`group flex gap-4 p-4 rounded-2xl border transition-all cursor-pointer touch-manipulation active:scale-[0.99]
                      ${openDropdown === i ? "bg-blue-600/5 border-blue-500/20" : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/10"}`}>
                    <div className={`relative shrink-0 w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/5 flex items-center justify-center transition-all ${openDropdown === i ? "border-blue-500/30" : ""}`}>
                      {(ep.thumbnail || ep.still_path) && (
                        <img
                          src={ep.thumbnail || (ep.still_path?.startsWith("http") ? ep.still_path : `https://image.tmdb.org/t/p/w300${ep.still_path}`)}
                          alt={ep.title || ep.name || ""}
                          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                          onError={e => { e.target.style.display = "none"; }}
                        />
                      )}
                      <div className={`relative z-10 p-2.5 rounded-xl transition-all
                        ${openDropdown === i
                          ? "bg-blue-600 text-white"
                          : (ep.thumbnail || ep.still_path)
                            ? "bg-black/50 backdrop-blur-sm text-white"
                            : "bg-white/10 text-gray-400 group-hover:bg-white/20"}`}>
                        <Play size={16} fill="currentColor"/>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-[9px] font-black uppercase text-blue-500 tracking-[0.15em] mb-1.5">S{ep.season} · E{ep.episodeNumberInSeason}</p>
                      <h4 className="text-sm font-bold text-white truncate mb-1">{ep.title || ep.name || `Episode ${ep.episodeNumberInSeason}`}</h4>
                      {ep.air_date && (
                        <p className="text-[9px] text-gray-700 font-bold uppercase tracking-wider mb-1">
                          {new Date(ep.air_date).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                        </p>
                      )}
                      {(ep.description || ep.overview) && <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">{ep.description || ep.overview}</p>}
                    </div>
                    <div className="shrink-0 self-center p-2 -m-2">
                      <ChevronDown size={16} className={`text-gray-600 transition-transform ${openDropdown === i ? "rotate-180 text-blue-400" : ""}`}/>
                    </div>
                  </div>

                  {openDropdown === i && (
                    <div className="mt-2 p-3 rounded-2xl bg-[#0a0a0d] border border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2">
                     {[
                        { id:"imdb_reader", label:"Omega",      color:"yellow" },
                        { id:"embed",       label:"Multi Audio", color:"indigo" },
                        { id:"vidify",      label:"Vidify",     color:"purple" },
                        { id:"videasy",     label:"VidEasy",    color:"blue"   },
                        { id:"vidup",       label:"VidUp",      color:"cyan"   },
                        { id:"tmdb",        label:"Alpha",      color:"blue"   },
                        { id:"2embed",      label:"Prime",      color:"orange" },
                      ].filter(srv => {
                        // Hide embed server button if this episode has no html embed
                        if (srv.id === "embed") return !!(ep.html || ep.html_code);
                        return true;
                      }).map(srv => {
                        const cc = {
                          yellow:"bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:border-yellow-500/40 hover:bg-yellow-500/15",
                          indigo:"bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/15",
                          purple:"bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/15",
                          blue:  "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/15",
                          cyan:  "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/15",
                          orange:"bg-orange-500/10 text-orange-400 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/15",
                        };
                        return (
                          <button key={srv.id} onClick={() => handlePlayAction(ep, srv.id)}
                            className={`py-3 px-3 min-h-[44px] rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all active:scale-95 touch-manipulation ${cc[srv.color]}`}>
                            {srv.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-8 border-t border-white/[0.04]">
          {[
            { icon:<Globe size={14} className="text-blue-500/60 shrink-0"/>, label:"Origin",   value: tmdbMeta?.origin_country?.[0] || "Global" },
            { icon:<Tags size={14} className="text-blue-500/60 shrink-0"/>,  label:"Genres",   value: movieMeta.genres.slice(0,3).map(g=>typeof g==="object"?g.name:g).join(" · ") || "—", accent:true },
            { icon:<Calendar size={14} className="text-blue-500/60 shrink-0"/>, label:"Released",
              value: movieMeta.release_date ? new Date(movieMeta.release_date).toLocaleDateString() : (movieMeta.year || "Recently") },
          ].map(({ icon, label, value, accent }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              {icon}
              <div>
                <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black mb-0.5">{label}</p>
                <p className={`text-xs font-bold ${accent ? "text-blue-400" : "text-white"}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Deployment grid */}
        {availableServers.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/10"><Server size={18} className="text-blue-400"/></div>
              <div>
                <h2 className="text-base font-black uppercase tracking-[0.15em] text-white">Deployment Grid</h2>
                <p className="text-[10px] text-gray-600 font-bold">{availableServers.length} servers online</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableServers.map(sv => {
                const isActive = activeServer?.id === sv.id;
                return (
                  <button key={sv.id} onClick={() => handlePlayAction(null, sv.id)}
                    className={`relative group p-5 min-h-[44px] rounded-2xl flex flex-col items-center gap-3 transition-all border overflow-hidden active:scale-[0.97] touch-manipulation
                      ${isActive ? (SRV_COLOR[sv.id] || "text-blue-400 bg-blue-500/10 border-blue-500/20") : "bg-white/[0.02] border-white/[0.04] text-gray-500 hover:bg-white/[0.05] hover:border-white/10 hover:text-gray-300"}`}>
                    {isActive && <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"/>}
                    <div className={`relative p-2.5 rounded-xl ${isActive ? "bg-current/10" : "bg-white/5 group-hover:bg-white/10"} transition-all`}>
                      {sv.icon || <MonitorPlay size={18}/>}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest">{sv.name}</p>
                      <p className={`text-[9px] mt-0.5 ${isActive ? "opacity-70" : "text-gray-700"}`}>{sv.label}</p>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"/>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Downloads */}
        {movieMeta.download_links?.length > 0 && (
          <div id="download-section" className="space-y-5 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-600/10 border border-green-500/10"><Database size={18} className="text-green-400"/></div>
              <div>
                <h2 className="text-base font-black uppercase tracking-[0.15em] text-white">Downloads</h2>
                <p className="text-[10px] text-gray-600 font-bold">{movieMeta.download_links.length} quality options</p>
              </div>
            </div>
            <div className="space-y-6">
              {movieMeta.download_links.map((block, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"/>
                      <span className="text-xs font-black text-green-400 uppercase tracking-widest">{block.quality}</span>
                    </div>
                    {block.size && <span className="text-[10px] font-bold text-gray-600">{block.size}</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {block.links?.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="group p-4 min-h-[44px] rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-green-500/30 hover:bg-green-500/5 transition-all flex items-center gap-3 active:scale-[0.98] touch-manipulation">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-400 group-hover:bg-green-500/20 transition-colors"><Download size={14}/></div>
                        <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors uppercase tracking-wide">{link.label}</p>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-[110]"><Navbar /></div>
    </div>
  );
};

export default WatchHtmlPage;
