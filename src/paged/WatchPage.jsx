// src/pages/WatchHtmlPage.jsx
import React, { useEffect, useState, useContext, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import {
  Loader2, Star, User, Play, Info, ShieldCheck,
  ArrowLeft, List, MonitorPlay, Server,
  Video, Zap, Database, Clock, Globe, Calendar, AlertCircle, Tags,
  CheckCircle2, Volume2, ChevronDown, Monitor, Cpu, Download, X, Languages,
  Settings, Eye, ChevronRight, Wifi, Film, Tv2, Layers, Radio, ChevronUp,
  SkipForward, Shield, Sparkles, Signal
} from "lucide-react";

/* ===== Helper: Safe URI encoding ===== */
const safeURI = (uri) => {
  if (!uri) return "";
  try { return encodeURI(decodeURI(uri)); } catch (e) { return uri; }
};

/* ===== Safety Helper: Grouping Logic for TV Seasons ===== */
const groupEpisodesBySeason = (episodes) => {
  if (!episodes || !Array.isArray(episodes) || episodes.length === 0) return {};
  return episodes.reduce((acc, episode, globalIndex) => {
    const seasonNumber = episode?.season ? Number(episode.season) : (episode.season_number || 1);
    const seasonKey = `S${seasonNumber}`;
    if (!acc[seasonKey]) acc[seasonKey] = { name: `Season ${seasonNumber}`, episodes: [], counter: 0 };
    acc[seasonKey].counter += 1;
    acc[seasonKey].episodes.push({
      ...episode, season: seasonNumber, globalIndex,
      episodeNumberInSeason: episode.episodeNumberInSeason || episode.episode || episode.episode_number || acc[seasonKey].counter,
    });
    return acc;
  }, {});
};

/* ===== Toggle Switch Component ===== */
const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${checked ? "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" : "bg-gray-800 border border-white/10"}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full shadow-md transition-all duration-300 ${checked ? "translate-x-6 bg-white" : "translate-x-1 bg-gray-500"}`} />
  </button>
);

/* ===== Server Badge Component ===== */
const ServerBadge = ({ server, isActive, onClick, compact = false }) => {
  const colorMap = {
    imdb_reader: { glow: "rgba(234,179,8,0.3)", bg: "from-yellow-500/10 to-yellow-600/5", border: "border-yellow-500/30", text: "text-yellow-400", dot: "bg-yellow-400" },
    embed: { glow: "rgba(99,102,241,0.3)", bg: "from-indigo-500/10 to-indigo-600/5", border: "border-indigo-500/30", text: "text-indigo-400", dot: "bg-indigo-400" },
    vidify: { glow: "rgba(168,85,247,0.3)", bg: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/30", text: "text-purple-400", dot: "bg-purple-400" },
    videasy: { glow: "rgba(59,130,246,0.3)", bg: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-400" },
    vidup: { glow: "rgba(6,182,212,0.3)", bg: "from-cyan-500/10 to-cyan-600/5", border: "border-cyan-500/30", text: "text-cyan-400", dot: "bg-cyan-400" },
    tmdb: { glow: "rgba(59,130,246,0.3)", bg: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-400" },
    "2embed": { glow: "rgba(249,115,22,0.3)", bg: "from-orange-500/10 to-orange-600/5", border: "border-orange-500/30", text: "text-orange-400", dot: "bg-orange-400" },
    hls: { glow: "rgba(34,197,94,0.3)", bg: "from-green-500/10 to-green-600/5", border: "border-green-500/30", text: "text-green-400", dot: "bg-green-400" },
  };
  const c = colorMap[server.id] || colorMap.videasy;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
          isActive
            ? `bg-gradient-to-br ${c.bg} ${c.border} ${c.text}`
            : "bg-white/[0.03] border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10"
        }`}
        style={isActive ? { boxShadow: `0 0 20px ${c.glow}` } : {}}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? c.dot : "bg-gray-600"} ${isActive ? "animate-pulse" : ""}`} />
        {server.name}
        {isActive && <span className={`text-[9px] opacity-60 ml-1`}>{server.label}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 border ${
        isActive
          ? `bg-gradient-to-br ${c.bg} ${c.border}`
          : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
      }`}
      style={isActive ? { boxShadow: `0 0 24px ${c.glow}` } : {}}
    >
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

const WatchHtmlPage = () => {
  const { slug: routeSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [movieMeta, setMovieMeta] = useState(null);
  const [tmdbMeta, setTmdbMeta] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [availableServers, setAvailableServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [activeSeason, setActiveSeason] = useState("S1");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Overlay states
  const [showOverlay, setShowOverlay] = useState(false);
  const [finalSource, setFinalSource] = useState(null);
  const [sourceType, setSourceType] = useState(null);
  const [videoTitle, setVideoTitle] = useState(routeSlug);
  const [currentOverlayEp, setCurrentOverlayEp] = useState(null);

  // Side panel states
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [autoNextEpisode, setAutoNextEpisode] = useState(true);
  const [spoilerProtection, setSpoilerProtection] = useState(true);
  const [activeTab, setActiveTab] = useState("servers");

  const groupedEpisodes = useMemo(() => groupEpisodesBySeason(episodes), [episodes]);

  const fetchTmdbMetadata = useCallback(async (id) => {
    if (!backendUrl || !id) return null;
    try {
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params: { imdbId: id } });
      if (!res.data?.success) return null;
      const data = res.data.data;
      // Normalize cast — backend may return it nested under credits.cast or flat
      const cast =
        data?.cast ??
        data?.credits?.cast ??
        data?.aggregate_credits?.cast ??
        [];
      return { ...data, cast };
    } catch (err) { return null; }
  }, [backendUrl]);

  const handlePlayAction = (manualEpisode = null, forceSourceType = null) => {
    if (!movieMeta) return;
    const sourceTypeToUse = forceSourceType || activeServer?.id || availableServers[0]?.id;
    const epContext = manualEpisode || currentOverlayEp;
    const imdb = movieMeta.imdb_id?.trim();
    const tmdb = movieMeta.tmdb_id || movieMeta.id;
    const identifier = tmdb || imdb;

    let chosen = null;
    let type = "url";
    let displayIdentity = routeSlug;

    if (epContext) {
      displayIdentity = `${routeSlug} — S${epContext.season}E${epContext.episodeNumberInSeason}`;
      setCurrentOverlayEp(epContext);
    }

    if (sourceTypeToUse === "imdb_reader" && imdb)
      chosen = `https://piexe411qok.com/play/${imdb}`;
    else if (sourceTypeToUse === "vidify" && tmdb) {
      const s = epContext?.season || 1; const e = epContext?.episodeNumberInSeason || 1;
      const p = "autoplay=false&poster=true&chromecast=true&servericon=true&setting=true&pip=true&logourl=https%3A%2F%2Fi.postimg.cc%2Fd05hg4kT%2Flogo-39.png&font=Roboto&fontcolor=6f63ff&fontsize=20&opacity=0.5&primarycolor=3b82f6&secondarycolor=1f2937&iconcolor=ffffff";
      chosen = epContext ? `https://player.vidify.top/embed/tv/${tmdb}/${s}/${e}?${p}` : `https://player.vidify.top/embed/movie/${tmdb}?${p}`;
    }
    else if (sourceTypeToUse === "videasy" && tmdb) {
      const s = epContext?.season || 1; const e = epContext?.episodeNumberInSeason || 1;
      const p = "nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=3B82F6";
      chosen = epContext ? `https://player.videasy.net/tv/${tmdb}/${s}/${e}?${p}` : `https://player.videasy.net/movie/${tmdb}?${p}`;
    }
    else if (sourceTypeToUse === "vidup" && identifier) {
      const s = epContext?.season || 1; const e = epContext?.episodeNumberInSeason || 1;
      chosen = epContext ? `https://vidup.to/tv/${identifier}/${s}/${e}?autoPlay=true` : `https://vidup.to/movie/${identifier}?autoPlay=true`;
    }
    else if (sourceTypeToUse === "tmdb" && tmdb) {
      const s = epContext?.season || 1; const e = epContext?.episodeNumberInSeason || 1;
      chosen = epContext ? `https://vidlink.pro/tv/${tmdb}/${s}/${e}` : `https://vidlink.pro/movie/${tmdb}`;
    }
    else if (sourceTypeToUse === "2embed" && identifier) {
      const s = epContext?.season || 1; const e = epContext?.episodeNumberInSeason || 1;
      chosen = epContext ? `https://www.2embed.cc/embedtv/${identifier}&s=${s}&e=${e}` : `https://www.2embed.cc/embed/${identifier}`;
    }
    else if (sourceTypeToUse === "hls") {
      chosen = epContext ? epContext.direct_url : movieMeta.video_url; type = "video";
    }
    else if (sourceTypeToUse === "embed") {
      chosen = epContext ? (epContext.html || epContext.html_code) : movieMeta.html_code; type = "html";
    }

    if (chosen) {
      setFinalSource(chosen); setSourceType(type);
      setVideoTitle(displayIdentity); setShowOverlay(true);
    }
  };

  const handleServerSwitch = (server) => {
    setActiveServer(server);
    handlePlayAction(currentOverlayEp, server.id);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        let finalMeta = null; let finalTmdbData = null; let parsedEp = [];

        if (location.state?.movie) {
          const m = location.state.movie;
          finalMeta = { ...m, slug: m.slug || routeSlug, title: m.title || m.name, tmdb_id: m.tmdb_id || m.id, poster: safeURI(m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : (m.poster || "/default-poster.jpg")), background: safeURI(m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : (m.background || m.cover_poster)), imdbRating: m.vote_average?.toFixed(1) || m.imdb_rating || "0.0", year: m.release_date?.split("-")[0] || m.first_air_date?.split("-")[0] || m.year, description: m.overview || m.description || "No description available.", download_links: m.download_links || [] };
          if (!m.cast || m.cast.length === 0) finalTmdbData = await fetchTmdbMetadata(m.imdb_id || m.id);
          else finalTmdbData = m;
          parsedEp = Array.isArray(m.episodes) ? m.episodes : [];
        }

        if (!finalMeta) {
          const [watchRes, movieRes] = await Promise.all([
            supabase.from("watch_html").select("*").eq("slug", routeSlug).maybeSingle(),
            supabase.from("movies").select("*").eq("slug", routeSlug).maybeSingle()
          ]);
          let watchData = watchRes.data; let movieData = movieRes.data;
          if ((!movieData || !movieData.description) && watchData?.title) {
            const { data: titleMatch } = await supabase.from("movies").select("*").eq("title", watchData.title).maybeSingle();
            if (titleMatch) movieData = titleMatch;
          }
          if (watchData) {
            finalTmdbData = watchData.imdb_id ? await fetchTmdbMetadata(watchData.imdb_id) : null;
            parsedEp = Array.isArray(watchData.episodes) ? watchData.episodes : [];
            finalMeta = { ...watchData, title: watchData.title || watchData.slug, poster: safeURI(watchData.poster || finalTmdbData?.poster_url || "/default-poster.jpg"), background: safeURI(watchData.cover_poster || finalTmdbData?.cover_poster_url || watchData.poster), imdbRating: watchData.imdb_rating || finalTmdbData?.imdb_rating?.toFixed(1) || "0.0", year: watchData.year || finalTmdbData?.year, description: movieData?.description || finalTmdbData?.overview || watchData?.description || "No description available.", download_links: Array.isArray(watchData.download_links) ? watchData.download_links : [] };
          }
        }

        if (isMounted && finalMeta) {
          setMovieMeta(finalMeta); setTmdbMeta(finalTmdbData); setEpisodes(parsedEp);
          const srv = [];
          if (finalMeta.imdb_id) srv.push({ id: "imdb_reader", name: "Omega", label: "Direct Stream", icon: <Cpu size={14} /> });
          if (finalMeta.html_code || parsedEp.some(e => e.html)) srv.push({ id: "embed", name: "Multi Audio", label: "Backup Node", icon: <Languages size={14} /> });
          if (finalMeta.tmdb_id || finalMeta.id) {
            srv.push({ id: "vidify", name: "Vidify", label: "Premium", icon: <Zap size={14} /> });
            srv.push({ id: "videasy", name: "VidEasy", label: "Simple", icon: <Globe size={14} /> });
          }
          srv.push(
            { id: "vidup", name: "VidUp", label: "High Quality", icon: <Monitor size={14} /> },
            { id: "tmdb", name: "Alpha", label: "Auto Select", icon: <MonitorPlay size={14} /> },
            { id: "2embed", name: "Prime", label: "Global CDN", icon: <Globe size={14} /> }
          );
          if (finalMeta.video_url || parsedEp.some(e => e.direct_url)) srv.push({ id: "hls", name: "Direct", label: "HLS Stream", icon: <Video size={14} /> });
          setAvailableServers(srv); setActiveServer(srv[0]);
          if (parsedEp.length > 0) setActiveSeason(`S${parsedEp[0]?.season || 1}`);
        }
      } catch (err) { console.error(err); } finally { if (isMounted) setLoading(false); }
    };
    fetchData(); return () => { isMounted = false; };
  }, [routeSlug, backendUrl, fetchTmdbMetadata, location.state]);

  // ─── Loading Screen ───────────────────────────────────────────────────────
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

  const serverColorMap = {
    imdb_reader: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/50",
    embed: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/50",
    vidify: "text-purple-400 bg-purple-500/10 border-purple-500/20 hover:border-purple-500/50",
    videasy: "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/50",
    vidup: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/50",
    tmdb: "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/50",
    "2embed": "text-orange-400 bg-orange-500/10 border-orange-500/20 hover:border-orange-500/50",
    hls: "text-green-400 bg-green-500/10 border-green-500/20 hover:border-green-500/50",
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white pb-24 font-sans overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════════════
          🎬 FULLSCREEN OVERLAY PLAYER
      ══════════════════════════════════════════════════════════════════ */}
      {showOverlay && (
        <div className="fixed inset-0 z-[1000] bg-[#070709] flex flex-col">

          {/* ── Top control bar ── */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/[0.04] shrink-0 z-20">
            <button
              onClick={() => { setShowOverlay(false); setCurrentOverlayEp(null); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 border border-white/5"
            >
              <ArrowLeft size={15} />
              <span className="text-xs font-bold hidden sm:inline tracking-wide">Back</span>
            </button>

            {/* Title + episode badge */}
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-white font-black text-xs uppercase tracking-[0.15em] truncate max-w-[35vw]">
                {videoTitle}
              </h2>
            </div>

            <button
              onClick={() => setShowSettingsPanel(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 text-xs font-bold tracking-wide ${
                showSettingsPanel
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                  : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>

          {/* ── Quick server switcher bar ── */}
          <div className="px-4 py-2 bg-black/40 backdrop-blur-md border-b border-white/[0.03] shrink-0 z-10 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[9px] text-gray-600 uppercase tracking-widest font-black shrink-0 mr-1">Server:</span>
              {availableServers.map(s => (
                <ServerBadge
                  key={s.id}
                  server={s}
                  isActive={activeServer?.id === s.id}
                  onClick={() => handleServerSwitch(s)}
                  compact
                />
              ))}
            </div>
          </div>

          {/* ── Player + Settings Panel ── */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Player area */}
            <div className={`flex-1 bg-black transition-all duration-300 ${showSettingsPanel ? "lg:mr-[320px]" : ""}`}>
              {sourceType === "html" ? (
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: finalSource }} />
              ) : sourceType === "video" ? (
                <video src={finalSource} controls autoPlay className="w-full h-full" />
              ) : (
                <iframe
                  src={finalSource}
                  className="w-full h-full border-none"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              )}
            </div>

            {/* ── Settings Panel ── */}
            <div className={`
              absolute lg:relative top-0 right-0 h-full
              w-full sm:w-[320px] lg:w-[320px]
              bg-[#0a0a0c] border-l border-white/[0.04]
              flex flex-col overflow-hidden
              transition-transform duration-300 ease-in-out z-20
              ${showSettingsPanel ? "translate-x-0" : "translate-x-full lg:translate-x-full"}
            `}>

              {/* Panel header + tabs */}
              <div className="shrink-0 border-b border-white/[0.04]">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.15em]">Player Settings</h3>
                  </div>
                  <button
                    onClick={() => setShowSettingsPanel(false)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-white transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex px-5 gap-1 pb-3">
                  {["servers", "cast", "settings"].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                        activeTab === tab
                          ? "bg-white/10 text-white border border-white/10"
                          : "text-gray-600 hover:text-gray-400"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === "servers" && (
                  <div className="p-4 space-y-2">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-1 mb-3">Available Servers</p>
                    {availableServers.map(server => (
                      <ServerBadge
                        key={server.id}
                        server={server}
                        isActive={activeServer?.id === server.id}
                        onClick={() => handleServerSwitch(server)}
                      />
                    ))}
                  </div>
                )}

                {activeTab === "cast" && (
                  <div className="p-4 space-y-4">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Starring Cast</p>

                    {tmdbMeta?.cast && tmdbMeta.cast.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {tmdbMeta.cast.slice(0, 18).map((actor, idx) => (
                          <div key={idx} className="group flex flex-col items-center gap-2 text-center">
                            <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/5 group-hover:border-blue-500/30 transition-all duration-300 bg-white/5">
                              <img
                                src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : "/default-avatar.jpg"}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                alt={actor.name}
                                onError={e => { e.target.onerror = null; e.target.src = "/default-avatar.jpg"; }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-gray-500 group-hover:text-blue-400 transition-colors leading-tight line-clamp-2 uppercase tracking-tight">
                              {actor.name}
                            </span>
                            {actor.character && (
                              <span className="text-[8px] text-gray-700 line-clamp-1 w-full">
                                {actor.character}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {[...Array(9)].map((_, i) => (
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

                    {/* Now Playing */}
                    <div className="p-4 rounded-xl bg-blue-600/5 border border-blue-500/10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-600/10">
                          <Eye size={14} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Now Playing</p>
                          <p className="text-xs font-bold text-white truncate max-w-[180px]">{videoTitle}</p>
                        </div>
                      </div>
                    </div>

                    {episodes.length > 0 && (
                      <div className="rounded-xl border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                        {/* Spoiler Protection */}
                        <div className="flex items-start justify-between gap-4 px-4 py-4 bg-white/[0.01]">
                          <div>
                            <p className="text-xs font-bold text-white mb-1">Spoiler Protection</p>
                            <p className="text-[10px] text-gray-600 leading-relaxed">Blur upcoming episodes</p>
                          </div>
                          <Toggle checked={spoilerProtection} onChange={setSpoilerProtection} />
                        </div>
                        {/* Auto Next */}
                        <div className="flex items-start justify-between gap-4 px-4 py-4 bg-white/[0.01]">
                          <div>
                            <p className="text-xs font-bold text-white mb-1">Auto Next Episode</p>
                            <p className="text-[10px] text-gray-600 leading-relaxed">Play next automatically</p>
                          </div>
                          <Toggle checked={autoNextEpisode} onChange={setAutoNextEpisode} />
                        </div>
                      </div>
                    )}

                    {/* Status indicators */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Stream Status</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-2">
                          <Signal size={12} className="text-green-400" />
                          <span className="text-[10px] text-gray-400 font-bold">Connected</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-2">
                          <Shield size={12} className="text-blue-400" />
                          <span className="text-[10px] text-gray-400 font-bold">Secured</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile backdrop */}
            {showSettingsPanel && (
              <div
                className="absolute inset-0 bg-black/70 z-10 lg:hidden backdrop-blur-sm"
                onClick={() => setShowSettingsPanel(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 inset-x-0 z-[110] h-16 flex items-center px-4">
        {/* Frosted glass bar */}
        <div className="absolute inset-0 bg-[#070709]/80 backdrop-blur-xl border-b border-white/[0.04]" />
        <div className="relative max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/watch")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-200 group"
            >
              <ArrowLeft size={18} className="text-gray-400 group-hover:text-white transition-colors" />
            </button>
            <Link to="/">
              <img src="/logo_39.png" className="h-7" alt="logo" />
            </Link>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest hidden sm:block">Global Source Active</span>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          HERO SECTION — Cinematic
      ══════════════════════════════════════════════════════════════════ */}
      <div className="relative pt-16 w-full min-h-[560px] overflow-hidden">

        {/* Background image with cinematic treatment */}
        {movieMeta?.background && (
          <div className="absolute inset-0 z-0">
            <img
              src={movieMeta.background}
              className={`w-full h-full object-cover scale-110 transition-all duration-[2s] ${imgLoaded ? "opacity-25 scale-100" : "opacity-0 scale-110"}`}
              alt=""
              onLoad={() => setImgLoaded(true)}
            />
            {/* Vignette layers */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#070709] via-[#070709]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#070709] to-transparent" />
          </div>
        )}

        {/* Subtle grain texture overlay */}
        <div className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">

          {/* ── Poster ── */}
          <div className="shrink-0 mx-auto lg:mx-0">
            <div className="relative">
              {/* Glow behind poster */}
              <div className="absolute -inset-4 bg-blue-600/10 rounded-[2rem] blur-2xl" />
              <div className="relative w-[160px] sm:w-[200px] aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8)]">
                <img
                  src={movieMeta?.poster || "/default-poster.jpg"}
                  className="w-full h-full object-cover"
                  alt={movieMeta?.title}
                />
                {/* Subtle shine overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Rating badge — floated on poster corner */}
              <div className="absolute -bottom-3 -right-3 flex items-center gap-1 bg-[#070709] border border-white/10 px-2.5 py-1.5 rounded-xl shadow-xl">
                <Star size={11} className="text-yellow-400" fill="currentColor" />
                <span className="text-white font-black text-xs">{movieMeta?.imdbRating || "0.0"}</span>
              </div>
            </div>
          </div>

          {/* ── Meta ── */}
          <div className="flex-1 space-y-5 lg:pt-6 text-center lg:text-left">

            {/* Eyebrow label */}
            <div className="flex items-center justify-center lg:justify-start gap-2">
              {episodes.length > 0
                ? <><Tv2 size={12} className="text-blue-400" /><span className="text-blue-400 font-black text-[9px] uppercase tracking-[0.25em]">TV Series</span></>
                : <><Film size={12} className="text-blue-400" /><span className="text-blue-400 font-black text-[9px] uppercase tracking-[0.25em]">Feature Film</span></>
              }
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black uppercase tracking-tighter italic text-white leading-[0.9] drop-shadow-2xl">
              {movieMeta?.slug}
            </h1>

            {/* Tags row */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="flex items-center gap-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-lg shadow-blue-600/30">
                <ShieldCheck size={10} /> HD
              </span>
              {tmdbMeta?.runtime && (
                <span className="flex items-center gap-1.5 text-gray-400 text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg">
                  <Clock size={10} className="text-blue-400" /> {tmdbMeta.runtime} min
                </span>
              )}
              {movieMeta?.year && (
                <span className="text-gray-400 text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg">
                  {movieMeta.year}
                </span>
              )}
              {(tmdbMeta?.genres || movieMeta?.genres) && (
                (tmdbMeta?.genres?.map(g => g.name) || movieMeta?.genres || []).slice(0, 2).map((g, i) => (
                  <span key={i} className="text-gray-400 text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg">
                    {g}
                  </span>
                ))
              )}
            </div>

            {/* Description */}
            <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-blue-600 pl-4 mx-auto lg:mx-0 text-left max-w-xl lg:max-w-none max-h-[120px] overflow-y-auto font-normal opacity-90">
              {movieMeta?.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
              {/* Primary play button */}
              <button
                onClick={() => handlePlayAction(episodes.length > 0 ? episodes[0] : null)}
                className="group relative overflow-hidden px-8 py-3.5 bg-blue-600 text-white font-black rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-blue-600/25 hover:shadow-blue-600/50 transition-all duration-300 text-[10px] uppercase tracking-widest active:scale-[0.98]"
              >
                {/* Shine sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative p-1.5 bg-white/20 rounded-lg">
                  <Play size={14} fill="currentColor" />
                </div>
                <span className="relative">{episodes.length > 0 ? "Stream Now" : "Play Now"}</span>
              </button>

              {/* Download button */}
              {movieMeta?.download_links?.length > 0 && (
                <button
                  onClick={() => document.getElementById("download-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="px-8 py-3.5 bg-white/5 text-white border border-white/10 font-black rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-[10px] uppercase tracking-widest active:scale-[0.98]"
                >
                  <Download size={15} />
                  <span>Download</span>
                </button>
              )}
            </div>

            {/* Server quick-select under hero */}
            {availableServers.length > 0 && (
              <div className="pt-2">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2 text-center lg:text-left">Available Servers</p>
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                  {availableServers.slice(0, 5).map(server => (
                    <button
                      key={server.id}
                      onClick={() => { setActiveServer(server); handlePlayAction(null, server.id); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all duration-200 active:scale-95 ${
                        activeServer?.id === server.id
                          ? (serverColorMap[server.id] || "text-blue-400 bg-blue-500/10 border-blue-500/30")
                          : "text-gray-600 bg-white/[0.02] border-white/5 hover:text-gray-400 hover:border-white/10"
                      }`}
                    >
                      <span className={`w-1 h-1 rounded-full ${activeServer?.id === server.id ? "bg-current" : "bg-gray-700"}`} />
                      {server.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════ */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-20 z-10">

        {/* ── EPISODES SECTION ── */}
        {episodes.length > 0 && (
          <div className="space-y-6">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/10">
                <List size={18} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-[0.15em] text-white">Episodes</h2>
                <p className="text-[10px] text-gray-600 font-bold">{episodes.length} episodes available</p>
              </div>
            </div>

            {/* Season tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {Object.keys(groupedEpisodes).map((seasonKey) => (
                <button
                  key={seasonKey}
                  onClick={() => setActiveSeason(seasonKey)}
                  className={`shrink-0 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border ${
                    activeSeason === seasonKey
                      ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                      : "bg-white/[0.03] text-gray-500 border-white/5 hover:text-gray-300 hover:border-white/10"
                  }`}
                >
                  {groupedEpisodes[seasonKey].name}
                </button>
              ))}
            </div>

            {/* Episode grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupedEpisodes[activeSeason]?.episodes?.map((ep, i) => (
                <div key={i} className="relative">
                  {/* Episode card */}
                  <div
                    onClick={() => setOpenDropdown(openDropdown === i ? null : i)}
                    className={`group flex gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                      openDropdown === i
                        ? "bg-blue-600/5 border-blue-500/20"
                        : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/10"
                    }`}
                  >
                    {/* Episode thumb */}
                    <div className={`relative shrink-0 w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/5 flex items-center justify-center transition-all duration-300 ${openDropdown === i ? "border-blue-500/30" : ""}`}>
                      <div className={`p-2.5 rounded-xl transition-all duration-300 ${openDropdown === i ? "bg-blue-600 text-white" : "bg-white/10 text-gray-400 group-hover:bg-white/20"}`}>
                        <Play size={16} fill="currentColor" />
                      </div>
                    </div>

                    {/* Episode info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-[9px] font-black uppercase text-blue-500 tracking-[0.15em] mb-1.5">
                        S{ep.season} · E{ep.episodeNumberInSeason}
                      </p>
                      <h4 className="text-sm font-bold text-white truncate mb-1">
                        {ep.title || `Episode ${ep.episodeNumberInSeason}`}
                      </h4>
                      {ep.description && (
                        <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">{ep.description}</p>
                      )}
                    </div>

                    {/* Chevron */}
                    <div className="shrink-0 self-center">
                      <ChevronDown
                        size={16}
                        className={`text-gray-600 transition-transform duration-300 ${openDropdown === i ? "rotate-180 text-blue-400" : ""}`}
                      />
                    </div>
                  </div>

                  {/* ── Dropdown: Server buttons ── */}
                  {openDropdown === i && (
                    <div className="mt-2 p-3 rounded-2xl bg-[#0a0a0d] border border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "imdb_reader", label: "Omega", color: "yellow" },
                        { id: "embed", label: "Multi Audio", color: "indigo" },
                        { id: "vidify", label: "Vidify", color: "purple" },
                        { id: "videasy", label: "VidEasy", color: "blue" },
                        { id: "vidup", label: "VidUp", color: "cyan" },
                        { id: "tmdb", label: "Alpha", color: "blue" },
                        { id: "2embed", label: "Prime", color: "orange" },
                      ].map(srv => {
                        const colorClasses = {
                          yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:border-yellow-500/40 hover:bg-yellow-500/15",
                          indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/15",
                          purple: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/15",
                          blue: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/15",
                          cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/15",
                          orange: "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/15",
                        };
                        return (
                          <button
                            key={srv.id}
                            onClick={() => handlePlayAction(ep, srv.id)}
                            className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all duration-200 active:scale-95 ${colorClasses[srv.color]}`}
                          >
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

        {/* ── METADATA STRIP ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-8 border-t border-white/[0.04]">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <Globe size={14} className="text-blue-500/60 shrink-0" />
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black mb-0.5">Origin</p>
              <p className="text-xs text-white font-bold">{tmdbMeta?.origin_country?.[0] || "Global"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <Tags size={14} className="text-blue-500/60 shrink-0" />
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black mb-0.5">Genres</p>
              <p className="text-xs text-blue-400 font-bold">
                {(tmdbMeta?.genres?.map(g => g.name) || movieMeta?.genres || ["Action"]).slice(0, 3).join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <Calendar size={14} className="text-blue-500/60 shrink-0" />
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black mb-0.5">Released</p>
              <p className="text-xs text-white font-bold">
                {movieMeta?.release_date ? new Date(movieMeta.release_date).toLocaleDateString() : (movieMeta?.year || "Recently")}
              </p>
            </div>
          </div>
        </div>

        {/* ── DEPLOYMENT GRID ── */}
        {availableServers.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/10">
                <Server size={18} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-[0.15em] text-white">Deployment Grid</h2>
                <p className="text-[10px] text-gray-600 font-bold">{availableServers.length} servers online</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableServers.map(server => {
                const isActive = activeServer?.id === server.id;
                const colorClass = serverColorMap[server.id] || "text-blue-400 bg-blue-500/10 border-blue-500/20";
                return (
                  <button
                    key={server.id}
                    onClick={() => handlePlayAction(null, server.id)}
                    className={`relative group p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300 border overflow-hidden active:scale-[0.97] ${
                      isActive
                        ? colorClass
                        : "bg-white/[0.02] border-white/[0.04] text-gray-500 hover:bg-white/[0.05] hover:border-white/10 hover:text-gray-300"
                    }`}
                    style={isActive ? {} : {}}
                  >
                    {/* Glow on active */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                    )}
                    <div className={`relative p-2.5 rounded-xl ${isActive ? "bg-current/10" : "bg-white/5 group-hover:bg-white/10"} transition-all duration-200`}>
                      {server.icon || <MonitorPlay size={18} />}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest">{server.name}</p>
                      <p className={`text-[9px] mt-0.5 ${isActive ? "opacity-70" : "text-gray-700"}`}>{server.label}</p>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DOWNLOAD SECTION ── */}
        {movieMeta?.download_links?.length > 0 && (
          <div id="download-section" className="space-y-5 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-600/10 border border-green-500/10">
                <Database size={18} className="text-green-400" />
              </div>
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
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-xs font-black text-green-400 uppercase tracking-widest">{block.quality}</span>
                    </div>
                    {block.size && <span className="text-[10px] font-bold text-gray-600">{block.size}</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {block.links?.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-green-500/30 hover:bg-green-500/5 transition-all duration-200 flex items-center gap-3 active:scale-[0.98]"
                      >
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-400 group-hover:bg-green-500/20 transition-colors">
                          <Download size={14} />
                        </div>
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

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-[110]"><Navbar /></div>
    </div>
  );
};

export default WatchHtmlPage;