// src/pages/WatchHtmlPage.jsx
import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { 
  Loader2, Star, User, Play, Info, ShieldCheck, 
  ArrowLeft, List, MonitorPlay, Server, 
  Video, Zap, Database, Clock, Globe, Calendar, AlertCircle, Tags,
  CheckCircle2
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
  
  // State for active season tab
  const [activeSeason, setActiveSeason] = useState("S1");

  const groupedEpisodes = useMemo(() => groupEpisodesBySeason(episodes), [episodes]);

  const currentEpInfo = useMemo(() => {
    if (!episodes || episodes.length === 0) return null;
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

    if (sourceType === 'imdb_reader' && imdb) {
        const embedUrl = `https://kinej395aoo.com/play/${imdb}`;
        finalSrc = {
            src: embedUrl, type: 'html',
            html: `<iframe src="${embedUrl}" frameborder="0" scrolling="no" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;"></iframe>`,
            name: "IMDb Reader (Direct)"
        };
    }
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
    else if (sourceType === 'hls') {
        const url = manualEpisode ? manualEpisode.direct_url : movieMeta.video_url;
        if (url) {
            finalSrc = { src: url, type: 'video', name: manualEpisode ? `Direct Ep` : "Direct" };
        }
    }
    else if (sourceType === 'embed') {
        const code = manualEpisode ? manualEpisode.html : movieMeta.html_code;
        if (code) {
            finalSrc = { src: code, type: 'html', html: code, name: manualEpisode ? `Mirror Ep` : "Mirror" };
        }
    }

    if (finalSrc) {
        navigate(`/player/${movieMeta.slug}`, { state: { src: finalSrc, movieMeta, tmdbMeta, title } });
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
                download_links: Array.isArray(watchData.download_links) ? watchData.download_links : [],
                title: watchData.title || watchData.slug,
                subCategory: movieData?.subCategory || "HD",
                poster: tmdb?.poster_url || watchData.poster || "/default-poster.jpg",
                background: tmdb?.cover_poster_url || watchData.cover_poster || watchData.poster,
                imdbRating: tmdb?.imdb_rating ? tmdb.imdb_rating.toFixed(1) : (watchData.imdb_rating || "N/A"),
                year: tmdb?.year || watchData.year,
                release_date: tmdb?.release_date || null,
                description: tmdb?.overview || tmdb?.description || watchData.description || "No description available.",
            };
            setMovieMeta(meta);

            const servers = [];
            if (watchData.imdb_id) servers.push({ id: 'imdb_reader', name: "Server Omega", label: "Direct Source" });
            if (watchData.tmdb_id || watchData.imdb_id) {
                servers.push({ id: '2embed', name: "Server Prime", label: "2Embed Global" });
                servers.push({ id: 'tmdb', name: "Server Alpha", label: "VidLink Auto" });
            }
            if (watchData.video_url || (parsedEp.length > 0 && parsedEp.some(e => e.direct_url))) servers.push({ id: 'hls', name: "Server Direct", label: "Direct HLS" });
            if (watchData.html_code || (parsedEp.length > 0 && parsedEp.some(e => e.html))) servers.push({ id: 'embed', name: "Server Backup", label: "Manual Mirror" });
            
            setAvailableServers(servers);
            if (servers.length > 0) setActiveServer(servers[0]);
            setEpisodes(parsedEp);

            if (parsedEp.length > 0) {
              const firstSeason = parsedEp[0]?.season ? `S${parsedEp[0].season}` : "S1";
              setActiveSeason(firstSeason);
            }
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
    <div className="min-h-screen bg-gray-950 text-white pb-24 font-sans overflow-x-hidden">
      <header className="fixed top-0 inset-x-0 z-[110] bg-gray-950/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-4">
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
      <div className="relative pt-16 w-full overflow-hidden bg-gray-950">
        
        {/* 🎬 CINEMATIC BACKDROP LAYER - FILL BACKGROUND */}
        {movieMeta?.background && (
          <div className="absolute inset-0 h-[100vh] w-full pointer-events-none z-0">
            <img 
               src={movieMeta.background} 
               className="w-full h-full object-cover opacity-30 transition-opacity duration-1000 scale-105" 
               alt="" 
            />
            {/* High-End Design Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-transparent to-gray-950/40" />
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-gray-950 to-transparent" />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10 z-10">
          
          {/* POSTER AREA */}
          <div className="relative flex flex-col items-center lg:items-start shrink-0">
            <div className="relative group max-w-[190px] sm:max-w-[220px] aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/20 bg-gray-900 mx-auto lg:mx-0 transition-transform duration-500 hover:scale-[1.02]">
              <img src={movieMeta?.poster || "/default-poster.jpg"} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px]">
                 <button onClick={() => handlePlayAction(currentEpInfo?.data)} className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform">
                   <Play size={24} fill="white" />
                 </button>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6 lg:pt-4">
            <div className="space-y-3 text-center lg:text-left">
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-tight text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
                    {movieMeta?.slug || movieMeta?.title}
                </h1>
                
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-[10px] font-black tracking-widest uppercase">
                    <div className="flex items-center gap-1.5 bg-blue-600 px-2.5 py-1 rounded-md shadow-lg">
                      <ShieldCheck size={12} className="text-white"/>
                      <span className="text-white">{movieMeta?.subCategory || "HD"}</span>
                    </div>
                    <span className="text-gray-400 bg-black/40 border border-white/10 px-2 py-1 rounded-md flex items-center gap-1.5">
                      <Clock size={12} className="text-blue-400"/> {tmdbMeta?.runtime ? `${tmdbMeta.runtime} min` : "--- min"}
                    </span>
                    <span className="text-gray-400 bg-black/40 border border-white/10 px-2 py-1 rounded-md">{movieMeta?.year}</span>
                    <span className="text-blue-500 font-extrabold flex items-center gap-1.5">
                      <CheckCircle2 size={12}/> Published {movieMeta?.created_at ? new Date(movieMeta.created_at).toLocaleDateString() : "Recently"}
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-3">
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5">
                    <Star className="text-yellow-500 fill-yellow-500" size={14} />
                    <span className="text-base font-black tracking-tighter text-yellow-500">{movieMeta?.imdbRating || "0.0"}</span>
                </div>
            </div>

            <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-3xl font-medium italic border-l-4 border-blue-600 pl-5 py-3 text-center lg:text-left mx-auto lg:mx-0">
                {movieMeta?.description}
            </p>

            {/* INTEGRATED CAST LIST SLIDER */}
            {tmdbMeta?.cast?.length > 0 && (
              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center justify-center lg:justify-start gap-2">
                  <User size={12} /> Top Billing Cast
                </p>
                <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 justify-center lg:justify-start">
                  {tmdbMeta.cast.slice(0, 8).map((actor, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 shrink-0 group/actor">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/5 group-hover/actor:border-blue-500 transition-all duration-300 shadow-xl">
                        <img src={actor.profile_url || "/default-avatar.jpg"} className="w-full h-full object-cover grayscale group-hover/actor:grayscale-0 transition-all duration-500" alt={actor.name} />
                      </div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter w-16 text-center truncate group-hover/actor:text-blue-400">{actor.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-[11px] pt-6 border-t border-white/5 uppercase font-black tracking-tight">
                <div className="flex items-center gap-3 justify-center lg:justify-start group"><Globe size={16} className="text-blue-500/50"/><span className="text-gray-500">Origin:</span><span className="text-gray-200">{tmdbMeta?.origin_country?.[0] || "India"}</span></div>
                <div className="flex items-center gap-3 justify-center lg:justify-start group"><Tags size={16} className="text-blue-500/50"/><span className="text-gray-500">Genres:</span><div className="flex flex-wrap gap-2 text-blue-400">{(tmdbMeta?.genres || movieMeta?.categories || ["Action"]).slice(0, 2).map((g, i) => <span key={i}>{g}</span>)}</div></div>
                <div className="flex items-center gap-3 justify-center lg:justify-start group"><Calendar size={16} className="text-blue-500/50"/><span className="text-gray-500">Date:</span><span className="text-gray-200">{movieMeta?.release_date ? new Date(movieMeta.release_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Recently"}</span></div>
            </div>

            {/* ACTION BUTTONS - VERTICAL ON MOBILE */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 max-w-md lg:max-w-none mx-auto lg:mx-0">
              <button 
                  onClick={() => handlePlayAction(currentEpInfo?.data)} 
                  className="w-full sm:w-auto px-10 py-4 bg-white text-black font-black rounded-xl flex items-center justify-center gap-3 hover:bg-blue-600 hover:text-white transition-all transform hover:scale-[1.03] active:scale-95 shadow-xl text-[11px] uppercase tracking-widest"
              >
                  <Play size={18} fill="currentColor" /> 
                  {(episodes && episodes.length > 0 && currentEpInfo) ? `Stream S${currentEpInfo?.s} E${currentEpInfo?.e}` : `Play Now`}
              </button>
              {movieMeta?.download_links?.length > 0 && (
                  <button 
                      onClick={() => document.getElementById("download-section")?.scrollIntoView({ behavior: "smooth" })} 
                      className="w-full sm:w-auto px-10 py-4 bg-white/10 text-white border border-white/10 font-black rounded-xl flex items-center justify-center gap-3 hover:bg-green-600 hover:border-green-600 transition-all transform hover:scale-[1.03] active:scale-95 text-[11px] uppercase tracking-widest"
                  >
                      <Database size={18} /> Download Options
                  </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="relative max-w-7xl mx-auto px-6 py-16 space-y-24 z-10">
        
        {/* 🎬 EPISODE LIST SECTION */}
        {episodes.length > 0 && (
          <div className="relative max-w-5xl mx-auto">
            
            {/* 🚀 STICKY LEVEL 1: Episodes Header */}
            <div className="sticky top-16 z-[105] bg-gray-950/95 backdrop-blur-2xl border-b border-white/5 py-4 -mx-6 px-6">
               <div className="flex items-center gap-4 text-white">
                  <List className="text-blue-500" size={24} />
                  <h2 className="text-2xl font-black uppercase tracking-[0.2em]">Episodes List</h2>
               </div>
            </div>

            {/* 🚀 STICKY LEVEL 2: Season Navigation Selector */}
            <div className="sticky top-[124px] z-[100] bg-gray-950/95 backdrop-blur-2xl py-6 -mx-6 px-6 shadow-2xl border-b border-white/5">
              <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                {Object.keys(groupedEpisodes).map((seasonKey) => (
                  <button
                    key={seasonKey}
                    onClick={() => {
                        setActiveSeason(seasonKey);
                        window.scrollTo({ top: document.getElementById('ep-list-top').offsetTop - 200, behavior: 'smooth' });
                    }}
                    className={`shrink-0 px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                      activeSeason === seasonKey 
                        ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_25px_rgba(37,99,235,0.4)]" 
                        : "bg-gray-900/50 text-gray-500 border-white/5 hover:text-gray-300 hover:border-white/20"
                    }`}
                  >
                    {groupedEpisodes[seasonKey].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Troubleshooting & Episode Content Area */}
            <div id="ep-list-top" className="pt-8">
              <div className="mb-8 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-200">
                <AlertCircle size={16} className="mt-[2px] shrink-0 text-red-400" />
                <p className="text-[11px] font-bold uppercase tracking-tight leading-relaxed">
                  If the video shows a <span className="text-white underline decoration-red-500">black screen</span> or <span className="text-white underline decoration-red-500"> loading issues</span>, please try switching to <span className="text-blue-400">different servers</span> within the row.
                </p>
              </div>
              
              <div className="space-y-4">
                {groupedEpisodes[activeSeason]?.episodes?.map((ep, i) => (
                  <div key={i} className="group relative flex flex-col md:flex-row gap-6 p-3 rounded-2xl bg-gray-900/40 border border-white/5 hover:bg-gray-900/80 hover:border-blue-500/30 transition-all duration-300 items-center shadow-xl">
                    {/* Horizontal Card Thumbnail */}
                    <div className="relative shrink-0 w-full md:w-56 aspect-video rounded-xl overflow-hidden bg-gray-800 border border-white/5">
                      <img src={movieMeta?.poster} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" alt="" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Play size={18} fill="white" className="text-white ml-0.5" /></div>
                      </div>
                    </div>

                    <div className="flex-1 w-full flex flex-col justify-center text-center lg:text-left">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-1">S{ep.season} E{ep.episodeNumberInSeason}</p>
                          <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{ep.title || `Episode ${ep.episodeNumberInSeason}`}</h4>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {movieMeta?.imdb_id && <button onClick={() => handlePlayAction(ep, 'imdb_reader')} className="px-3 py-1.5 rounded-lg bg-yellow-600/10 border border-yellow-600/30 hover:bg-yellow-600 text-[9px] font-black uppercase text-yellow-500 hover:text-white transition-all"><Zap size={10} fill="currentColor" className="inline mr-1"/> Oneshot</button>}
                          {(movieMeta?.imdb_id || movieMeta?.tmdb_id) && <button onClick={() => handlePlayAction(ep, '2embed')} className="px-3 py-1.5 rounded-lg bg-orange-600/10 border border-orange-600/30 hover:bg-orange-600 text-[9px] font-black uppercase text-orange-500 hover:text-white transition-all">Global</button>}
                          {movieMeta?.tmdb_id && <button onClick={() => handlePlayAction(ep, 'tmdb')} className="px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-600/30 hover:bg-blue-600 text-[9px] font-black uppercase text-blue-400 hover:text-white transition-all">Vidlink</button>}
                          {ep.direct_url && <button onClick={() => handlePlayAction(ep, 'hls')} className="px-3 py-1.5 rounded-lg bg-green-600/10 border border-green-600/30 hover:bg-green-600 text-[9px] font-black uppercase text-green-400 hover:text-white transition-all">Direct</button>}
                          {ep.html && <button onClick={() => handlePlayAction(ep, 'embed')} className="px-3 py-1.5 rounded-lg bg-purple-600/10 border border-purple-600/30 hover:bg-purple-600 text-[9px] font-black uppercase text-purple-400 hover:text-white transition-all">Mirror</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Deployment Servers CONDITIONAL (Only if no episodes) */}
        {availableServers.length > 0 && episodes.length === 0 && (
          <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-4 mb-3 text-white border-b border-white/5 pb-4"><Server className="text-blue-500" size={24} /><h2 className="text-xl font-black uppercase tracking-[0.2em]">Deployment Servers</h2></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {availableServers.map((server) => (
                <button key={server.id} type="button" onClick={() => setActiveServer(server)} className={`p-6 rounded-3xl flex flex-col items-center gap-2 transition-all border relative overflow-hidden ${activeServer?.id === server.id ? "bg-blue-600 border-blue-400 shadow-lg scale-[1.03] text-white" : "bg-gray-800/30 border-white/5 text-gray-400 hover:border-white/20"}`}><MonitorPlay size={20} /><span className="text-sm font-black uppercase tracking-widest text-center">{server.name}</span></button>
              ))}
            </div>
          </div>
        )}

        {/* DOWNLOAD SERVERS SECTION */}
        {movieMeta?.download_links?.length > 0 && (
          <div id="download-section" className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl shadow-2xl scroll-mt-24">
            <div className="flex items-center gap-4 mb-8 text-white border-b border-white/5 pb-4"><Database className="text-green-500" size={24} /><h2 className="text-xl font-black uppercase tracking-[0.2em]">Download Servers</h2></div>
            <div className="space-y-10">
              {movieMeta.download_links.map((block, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-900/60 border border-white/5 rounded-xl px-5 py-3"><span className="text-sm font-black uppercase tracking-widest text-green-400">{block.quality}</span>{block.size && <span className="text-[11px] font-bold text-gray-400">{block.size}</span>}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {block.links?.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="relative z-10 cursor-pointer p-5 rounded-2xl bg-gray-800/40 border border-white/5 hover:border-green-400 hover:bg-green-600/20 transition-all duration-300 flex items-center gap-3"><Video size={18} className="text-green-400 shrink-0" /><div className="text-left"><p className="text-xs font-black uppercase text-white">{link.label}</p></div></a>
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