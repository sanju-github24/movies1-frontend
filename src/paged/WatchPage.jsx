// src/pages/WatchHtmlPage.jsx
import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { 
  Loader2, Star, User, Play, Info, ShieldCheck, 
  ArrowLeft, Youtube, CheckCircle2, List, MonitorPlay, Server, ChevronRight,
  ExternalLink, Video, Zap, Database, Clock, Globe, Calendar, AlertCircle, Tags, Tv
} from "lucide-react";

/* ===== Safety Helper: Grouping Logic ===== */
const groupEpisodesBySeason = (episodes) => {
  if (!episodes || !Array.isArray(episodes) || episodes.length === 0) return {};
  return episodes.reduce((acc, episode, globalIndex) => {
    const seasonNumber = episode?.season ? Number(episode.season) : 1;
    const seasonKey = `S${seasonNumber}`;
    if (!acc[seasonKey]) {
      acc[seasonKey] = { name: `Season ${seasonNumber}`, episodes: [], counter: 0 };
    }
    acc[seasonKey].counter += 1;
    acc[seasonKey].episodes.push({
      ...episode,
      season: seasonNumber,
      globalIndex,
      episodeNumberInSeason: acc[seasonKey].counter,
    });
    return acc;
  }, {});
};

/* ===== Sub-Component: Cast Section ===== */
const CastSection = React.memo(({ tmdbMeta }) => {
  const CAST_LIMIT = 6;
  if (!tmdbMeta?.cast?.length) return null;
  const displayedCast = tmdbMeta.cast.slice(0, CAST_LIMIT);

  return (
    <div className="mb-10 animate-in fade-in duration-700">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
        <User className="w-5 h-5 text-blue-400" /> Top Cast
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
        {displayedCast.map((actor, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-700 mb-2 shadow-lg">
              {actor.profile_url ? (
                <img src={actor.profile_url} alt={actor.name} className="w-full h-full object-cover" />
              ) : ( <User className="w-full h-full p-4 text-gray-500" /> )}
            </div>
            <p className="text-[10px] font-bold text-center text-gray-200 line-clamp-1 uppercase tracking-tighter">{actor.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

const WatchHtmlPage = () => {
  const { slug: routeSlug } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [movieMeta, setMovieMeta] = useState(null);
  const [tmdbMeta, setTmdbMeta] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [availableServers, setAvailableServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);

  const groupedEpisodes = useMemo(() => groupEpisodesBySeason(episodes), [episodes]);

  const currentEpInfo = useMemo(() => {
    if (episodes.length === 0) return null;
    return {
      s: episodes[0]?.season || 1,
      e: 1,
      data: episodes[0]
    };
  }, [episodes]);

  const fetchTmdbMetadata = useCallback(async (id) => {
    if (!backendUrl || !id) return null;
    try {
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params: { imdbId: id } });
      return res.data?.success ? res.data.data : null;
    } catch (err) { return null; }
  }, [backendUrl]);

  const handlePlayAction = (manualEpisode = null, forceSourceType = null) => {
    if (!movieMeta) return; 

    let finalSrc = null;
    let title = movieMeta?.title;
    const sourceType = forceSourceType || activeServer?.id || availableServers[0]?.id;

    const imdb = movieMeta.imdb_id?.trim();
    const tmdb = movieMeta.tmdb_id;
    const identifier = tmdb || imdb;

    // 1. IMDb Reader (Constant ID logic)
    if (sourceType === 'imdb_reader' && imdb) {
        const embedUrl = `https://kinej395aoo.com/play/${imdb}`;
        finalSrc = {
            src: embedUrl, type: 'html',
            html: `<iframe src="${embedUrl}" frameborder="0" scrolling="no" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;"></iframe>`,
            name: "IMDb Reader (Direct)"
        };
    }
    // 2. Vidlink Logic
    else if (sourceType === 'tmdb' && tmdb) {
        if (manualEpisode) {
            const s = manualEpisode.season || 1;
            const e = manualEpisode.episodeNumberInSeason || 1;
            const embedUrl = `https://vidlink.pro/tv/${tmdb}/${s}/${e}`;
            finalSrc = {
                src: embedUrl, type: 'html',
                html: `<iframe src="${embedUrl}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;"></iframe>`,
                name: `S${s} E${e} (VidLink)`
            };
        } else {
            const embedUrl = `https://vidlink.pro/movie/${tmdb}`;
            finalSrc = {
                src: embedUrl, type: 'html',
                html: `<iframe src="${embedUrl}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;"></iframe>`,
                name: "Movie (VidLink)"
            };
        }
    } 
    // 3. 2Embed Logic
    else if (sourceType === '2embed' && identifier) {
        if (manualEpisode) {
            const s = manualEpisode.season || 1;
            const e = manualEpisode.episodeNumberInSeason || 1;
            const embedUrl = `https://www.2embed.cc/embedtv/${identifier}&s=${s}&e=${e}`;
            finalSrc = {
                src: embedUrl, type: 'html',
                html: `<iframe src="${embedUrl}" frameborder="0" scrolling="no" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;"></iframe>`,
                name: `S${s} E${e} (2Embed)`
            };
        } else {
            const embedUrl = `https://www.2embed.cc/embed/${identifier}`;
            finalSrc = {
                src: embedUrl, type: 'html',
                html: `<iframe src="${embedUrl}" frameborder="0" scrolling="no" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;"></iframe>`,
                name: "Movie (2Embed)"
            };
        }
    }
    // 4. Anime Logic
    else if (sourceType === 'anime') {
        const cleanTitle = movieMeta.title.toLowerCase().trim().replace(/\s+/g, '-');
        const epNum = manualEpisode ? manualEpisode.episodeNumberInSeason : 1;
        const embedUrl = `https://2anime.xyz/embed/${cleanTitle}-episode-${epNum}`;
        finalSrc = {
            src: embedUrl, type: 'html',
            html: `<iframe src="${embedUrl}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;"></iframe>`,
            name: `Ep ${epNum} (Anime)`
        };
    }
    // 5. Direct Video Link (HLS)
    else if (sourceType === 'hls') {
        const url = manualEpisode ? manualEpisode.direct_url : movieMeta.video_url;
        if (url) {
            finalSrc = { src: url, type: 'video', name: manualEpisode ? `S${manualEpisode.season} E${manualEpisode.episodeNumberInSeason}` : "Direct" };
        }
    }
    // 6. Manual Iframe HTML Mirror (Logic for both Movie and Episodes)
    else if (sourceType === 'embed') {
        const code = manualEpisode ? manualEpisode.html : movieMeta.html_code;
        if (code) {
            finalSrc = { src: code, type: 'html', html: code, name: manualEpisode ? `S${manualEpisode.season} E${manualEpisode.episodeNumberInSeason}` : "Mirror" };
        }
    }

    if (finalSrc) {
        navigate(`/player/${movieMeta.slug}`, { state: { src: finalSrc, movieMeta, tmdbMeta, title } });
    } else {
        alert("This server is currently unavailable for this title.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: watchData, error: watchError } = await supabase.from("watch_html").select("*").eq("slug", routeSlug).single();
        if (watchError || !watchData) throw new Error("Watch data not found");
        const { data: movieData } = await supabase.from("movies").select("subCategory").eq("slug", routeSlug).maybeSingle();

        const tmdb = watchData.imdb_id ? await fetchTmdbMetadata(watchData.imdb_id) : null;
        const parsedEp = Array.isArray(watchData.episodes) ? watchData.episodes : [];

        if (isMounted) {
            setTmdbMeta(tmdb);
            const meta = {
  ...watchData,

  // 🔥 FORCE DOWNLOAD LINKS
  download_links: Array.isArray(watchData.download_links)
    ? watchData.download_links
    : [],

  title: watchData.title || watchData.slug,
  subCategory: movieData?.subCategory || "HD",
  poster: tmdb?.poster_url || watchData.poster || "/default-poster.jpg",
  background: tmdb?.cover_poster_url || watchData.cover_poster || watchData.poster,
  imdbRating: tmdb?.imdb_rating
    ? tmdb.imdb_rating.toFixed(1)
    : (watchData.imdb_rating || "N/A"),
  year: tmdb?.year || watchData.year,
  release_date: tmdb?.release_date || null,
  description:
    tmdb?.overview ||
    tmdb?.description ||
    watchData.description ||
    "No description available.",
};

            setMovieMeta(meta);

            const servers = [];
            if (watchData.imdb_id) {
                servers.push({ id: 'imdb_reader', name: "Server Omega", label: "Direct Source" });
            }
            if (watchData.tmdb_id || watchData.imdb_id) {
                servers.push({ id: '2embed', name: "Server Prime", label: "2Embed Global" });
                servers.push({ id: 'tmdb', name: "Server Alpha", label: "VidLink Auto" });
            }
            if (watchData.subCategory?.toLowerCase().includes('anime')) {
                servers.push({ id: 'anime', name: "Anime Hub", label: "2Anime XYZ" });
            }
            if (watchData.video_url || (parsedEp.length > 0 && parsedEp.some(e => e.direct_url))) {
                servers.push({ id: 'hls', name: "Server Direct", label: "Direct HLS" });
            }
            if (watchData.html_code || (parsedEp.length > 0 && parsedEp.some(e => e.html))) {
                servers.push({ id: 'embed', name: "Server Backup", label: "Manual Mirror" });
            }
            
            setAvailableServers(servers);
            if (servers.length > 0) setActiveServer(servers[0]);
            setEpisodes(parsedEp);
        }
      } catch (err) { console.error(err); } finally { if (isMounted) setLoading(false); }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [routeSlug, backendUrl, fetchTmdbMetadata]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
      <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest text-center px-4">Establishing Secure Connection</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24 font-sans">
      <header className="fixed top-0 inset-x-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-4">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/watch")} className="p-2 hover:bg-white/5 rounded-full transition-colors"><ArrowLeft size={22} /></button>
            <Link to="/"><img src="/logo_39.png" className="h-7" alt="logo" /></Link>
          </div>
          <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            <ShieldCheck size={12} /> SECURE GATEWAY
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative pt-16 w-full overflow-hidden">
        {movieMeta?.background && (
          <div className="absolute inset-0 h-[85vh]">
            <img src={movieMeta.background} className="w-full h-full object-cover opacity-20 blur-3xl scale-110" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
          <div className="relative group max-w-[280px] aspect-[2/3] w-full rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10 bg-gray-900 mx-auto lg:mx-0">
            <img src={movieMeta?.poster || "/default-poster.jpg"} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-all duration-500">
               <button onClick={() => handlePlayAction(currentEpInfo?.data)} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform">
                 <Play size={32} fill="currentColor" />
               </button>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter italic leading-tight">
                    {movieMeta?.slug}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-black tracking-widest uppercase">
                    <span className="bg-blue-600 px-2 py-0.5 rounded text-white shadow-lg">{movieMeta?.subCategory || "HD"}</span>
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock size={12}/> 
                      {tmdbMeta?.runtime ? `${tmdbMeta.runtime} min` : "144 min"}
                    </span>
                    <span className="text-gray-400">{movieMeta?.year}</span>
                    <span className="text-blue-400">Published {movieMeta?.created_at ? new Date(movieMeta.created_at).toLocaleDateString() : "Recently"}</span>
                </div>
            </div>

            <div className="flex items-center gap-6 py-2">
                <div className="flex items-center gap-2 bg-gray-900 border border-white/5 rounded-xl px-4 py-2">
                    <Star className="text-yellow-500 fill-yellow-500" size={16} />
                    <span className="text-lg font-black">{movieMeta?.imdbRating || "0.0"}</span>
                </div>
            </div>

            <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-3xl font-medium italic opacity-90 border-l-2 border-blue-600 pl-4 bg-blue-600/5 py-2">
                {movieMeta?.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12 text-sm pt-4 border-t border-white/5">
                <div className="flex gap-4"><span className="text-gray-500 font-black uppercase w-20 tracking-tighter flex items-center gap-1.5"><Globe size={14}/> Country</span><span className="text-gray-200 font-bold">{tmdbMeta?.origin_country?.[0] || "India"}</span></div>
                <div className="flex gap-4"><span className="text-gray-500 font-black uppercase w-20 tracking-tighter flex items-center gap-1.5"><Tags size={14}/> Genre</span><div className="flex flex-wrap gap-2 text-blue-400 font-bold">{(tmdbMeta?.genres || movieMeta?.categories || ["Action", "Romance"]).map(g => <span key={g}>{g}</span>)}</div></div>
                <div className="flex gap-4">
                  <span className="text-gray-500 font-black uppercase w-20 tracking-tighter flex items-center gap-1.5"><Calendar size={14} /> Released</span>
                  <span className="text-gray-200 font-bold">{movieMeta?.release_date ? new Date(movieMeta.release_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : movieMeta?.year || "Coming Soon"}</span>
                </div>
                <div className="flex gap-4"><span className="text-gray-500 font-black uppercase w-20 tracking-tighter flex items-center gap-1.5"><User size={14}/> Cast</span><div className="flex flex-wrap gap-2 text-gray-300 font-bold">{(tmdbMeta?.cast?.slice(0, 3).map(c => c.name) || ["N/A"]).map(name => <span key={name} className="hover:text-blue-400 transition-colors cursor-default">{name}</span>)}</div></div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
  {/* STREAM BUTTON */}
  <button 
    onClick={() => handlePlayAction(currentEpInfo?.data)} 
    className="px-8 py-4 bg-white text-black font-black rounded-2xl flex items-center gap-3 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-xl text-xs uppercase tracking-widest"
  >
    <Play size={18} fill="currentColor" /> 
    {episodes.length > 0 
      ? `Stream on ${activeServer?.name} S${currentEpInfo.s}E${currentEpInfo.e}` 
      : `Stream on ${activeServer?.name || "Server"}`
    }
  </button>

  {/* DOWNLOAD BUTTON */}
  {movieMeta?.download_links?.length > 0 && (
    <button
      onClick={() => document.getElementById("download-section")?.scrollIntoView({ behavior: "smooth" })}
      className="px-8 py-4 bg-green-600 text-white font-black rounded-2xl flex items-center gap-3 hover:bg-green-500 transition-all active:scale-95 shadow-xl text-xs uppercase tracking-widest"
    >
      <Database size={18} /> Download
    </button>
  )}
</div>

          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-16 space-y-24">
        {/* ================= SERVER SELECTION ================= */}
{availableServers.length > 0 && (
  <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl shadow-2xl">
    
    {/* HEADER */}
    <div className="flex items-center gap-4 mb-3 text-white border-b border-white/5 pb-4">
      <Server className="text-blue-500" size={24} />
      <h2 className="text-xl font-black uppercase tracking-[0.2em]">
        Deployment Servers
      </h2>
    </div>

    {/* NOTE */}
<div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-200">
  <AlertCircle size={16} className="mt-[2px] shrink-0 text-red-400" />
  <p className="text-xs leading-relaxed">
    If the video shows a <span className="font-bold text-red-300">black screen</span> or
    is <span className="font-bold text-red-300">not playing</span>, please try switching
    to another server.
  </p>
</div>


    {/* SERVERS GRID */}
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {availableServers.map((server) => (
        <button
          key={server.id}
          type="button"
          onClick={() => setActiveServer(server)}
          className={`
            p-6 rounded-3xl flex flex-col items-center gap-2
            transition-all border relative overflow-hidden
            ${
              activeServer?.id === server.id
                ? "bg-blue-600 border-blue-400 shadow-lg scale-[1.03] text-white"
                : "bg-gray-800/30 border-white/5 text-gray-400 hover:border-white/20"
            }
          `}
        >
          <MonitorPlay
            className={`mb-1 ${
              activeServer?.id === server.id
                ? "text-white"
                : "text-gray-500"
            }`}
            size={20}
          />

          <span className="text-sm font-black uppercase tracking-widest text-center">
            {server.name}
          </span>

          <span
            className={`text-[10px] font-bold uppercase text-center ${
              activeServer?.id === server.id
                ? "text-blue-100"
                : "text-gray-600"
            }`}
          >
            {server.label}
          </span>
        </button>
      ))}
    </div>
  </div>
)}

        

        {/* Episode List Section */}
        {episodes.length > 0 && (
          <div className="relative">
            <div className="flex items-center gap-4 mb-12 text-white">
                <List className="text-blue-500" size={24} />
                <h2 className="text-2xl font-black uppercase tracking-[0.2em]">Episodes List</h2>
            </div>
            <div className="space-y-16 relative">
              {Object.entries(groupedEpisodes).map(([key, season]) => (
                <div key={key} className="relative">
                  <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.4em] mb-8 bg-gray-900 w-fit px-4 py-1.5 rounded-full border border-blue-500/20 ml-10">{season.name}</h3>
                  <div className="absolute left-[31px] top-16 bottom-0 w-[2px] bg-gradient-to-b from-blue-600 via-blue-600/20 to-transparent"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ml-10">
                    {season.episodes.map((ep, i) => (
                      <div key={i} className="p-6 rounded-[2rem] bg-gray-900/50 border border-white/5 backdrop-blur-sm shadow-xl hover:border-white/20 transition-all">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-gray-950 flex items-center justify-center shrink-0"><Video size={20} className="text-gray-600" /></div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Episode {ep.episodeNumberInSeason}</p>
                                    <p className="text-sm font-bold truncate text-white">{ep.title || `Segment ${ep.episodeNumberInSeason}`}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {/* IMDb Reader - Oneshot */}
                                {movieMeta?.imdb_id && (
                                    <button onClick={() => handlePlayAction(ep, 'imdb_reader')} className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-yellow-600/10 border border-yellow-600/30 hover:bg-yellow-600 text-[8px] font-black uppercase text-yellow-400 hover:text-white transition-all tracking-tighter"><Zap size={12}/> Oneshot</button>
                                )}
                                {/* Global */}
                                {(movieMeta?.imdb_id || movieMeta?.tmdb_id) && (
                                    <button onClick={() => handlePlayAction(ep, '2embed')} className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-orange-600/10 border border-orange-600/30 hover:bg-orange-600 text-[8px] font-black uppercase text-orange-400 hover:text-white transition-all tracking-tighter">Global S{ep.season}E{ep.episodeNumberInSeason}</button>
                                )}
                                {/* Vidlink */}
                                {movieMeta?.tmdb_id && (
                                    <button onClick={() => handlePlayAction(ep, 'tmdb')} className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-600/10 border border-blue-600/30 hover:bg-blue-600 text-[8px] font-black uppercase text-blue-400 hover:text-white transition-all tracking-tighter">Vidlink S{ep.season}E{ep.episodeNumberInSeason}</button>
                                )}
                                {/* Direct Video */}
                                {ep.direct_url && (
                                    <button onClick={() => handlePlayAction(ep, 'hls')} className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-green-600/10 border border-green-600/30 hover:bg-green-600 text-[8px] font-black uppercase text-green-400 hover:text-white transition-all tracking-tighter">Direct</button>
                                )}
                                {/* Manual Mirror HTML - ONLY SHOWS IF ep.html EXISTS */}
                                {ep.html && (
                                    <button onClick={() => handlePlayAction(ep, 'embed')} className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-purple-600/10 border border-purple-600/30 hover:bg-purple-600 text-[8px] font-black uppercase text-purple-400 hover:text-white transition-all tracking-tighter"><MonitorPlay size={12}/> Mirror</button>
                                )}
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= DOWNLOAD SERVERS ================= */}
{movieMeta?.download_links?.length > 0 && (
  <div
    id="download-section"
    className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl shadow-2xl"
  >
    {/* HEADER */}
    <div className="flex items-center gap-4 mb-8 text-white border-b border-white/5 pb-4">
      <Database className="text-green-500" size={24} />
      <h2 className="text-xl font-black uppercase tracking-[0.2em]">
        Download Servers
      </h2>
    </div>

    {/* BLOCKS */}
    <div className="space-y-10">
      {movieMeta.download_links.map((block, idx) => (
        <div key={idx} className="space-y-4">
          {/* QUALITY HEADER */}
          <div className="flex items-center justify-between bg-gray-900/60 border border-white/5 rounded-xl px-5 py-3">
            <span className="text-sm font-black uppercase tracking-widest text-green-400">
              {block.quality}
            </span>

            {block.size && (
              <span className="text-[11px] font-bold text-gray-400">
                {block.size}
              </span>
            )}
          </div>

          {/* LINKS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {block.links?.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  relative z-10 cursor-pointer
                  p-5 rounded-2xl
                  bg-gray-800/40 border border-white/5
                  hover:border-green-400 hover:bg-green-600/20
                  transition-all duration-300
                  flex items-center gap-3
                "
              >
                <Video size={18} className="text-green-400 shrink-0" />

                <div className="text-left">
                  <p className="text-xs font-black uppercase text-white">
                    {link.label}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)}


        <CastSection tmdbMeta={tmdbMeta} />
      </main>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-[60]">
        <Navbar />
      </div>
    </div>
  );
};

export default WatchHtmlPage;