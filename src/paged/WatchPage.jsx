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
  CheckCircle2, Volume2, ChevronDown, Monitor, Cpu, Download, X, Languages 
} from "lucide-react"; 

/* ===== Helper: Safe URI encoding to prevent Vite crash ===== */
const safeURI = (uri) => {
  if (!uri) return "";
  try {
    return encodeURI(decodeURI(uri));
  } catch (e) {
    return uri;
  }
};

/* ===== Safety Helper: Grouping Logic for TV Seasons ===== */
const groupEpisodesBySeason = (episodes) => {
  if (!episodes || !Array.isArray(episodes) || episodes.length === 0) return {};
  return episodes.reduce((acc, episode, globalIndex) => {
    const seasonNumber = episode?.season ? Number(episode.season) : (episode.season_number || 1);
    const seasonKey = `S${seasonNumber}`;
    if (!acc[seasonKey]) {
      acc[seasonKey] = { name: `Season ${seasonNumber}`, episodes: [], counter: 0 };
    }
    acc[seasonKey].counter += 1;
    acc[seasonKey].episodes.push({
      ...episode,
      season: seasonNumber,
      globalIndex,
      episodeNumberInSeason: episode.episodeNumberInSeason || episode.episode || episode.episode_number || acc[seasonKey].counter,
    });
    return acc;
  }, {});
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
  
  // 🚀 OVERLAY STATES
  const [showOverlay, setShowOverlay] = useState(false);
  const [finalSource, setFinalSource] = useState(null);
  const [sourceType, setSourceType] = useState(null);
  const [videoTitle, setVideoTitle] = useState(routeSlug); 
  const [showServerOverlayDropdown, setShowServerOverlayDropdown] = useState(false);
  const [currentOverlayEp, setCurrentOverlayEp] = useState(null);

  const overlayDropdownRef = useRef(null);
  const groupedEpisodes = useMemo(() => groupEpisodesBySeason(episodes), [episodes]);

  // Click Outside logic for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overlayDropdownRef.current && !overlayDropdownRef.current.contains(event.target)) {
        setShowServerOverlayDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTmdbMetadata = useCallback(async (id) => {
    if (!backendUrl || !id) return null;
    try {
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params: { imdbId: id } });
      return res.data?.success ? res.data.data : null;
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
        displayIdentity = `${routeSlug}-s${epContext.season}e${epContext.episodeNumberInSeason}`;
        setCurrentOverlayEp(epContext); 
    }

    if (sourceTypeToUse === 'imdb_reader' && imdb) {
        chosen = `https://kinej395aoo.com/play/${imdb}`;
    }
    else if (sourceTypeToUse === 'vidify' && tmdb) {
        const s = epContext?.season || 1;
        const e = epContext?.episodeNumberInSeason || 1;
        const uiParams = "autoplay=false&poster=true&chromecast=true&servericon=true&setting=true&pip=true&logourl=https%3A%2F%2Fi.postimg.cc%2Fd05hg4kT%2Flogo-39.png&font=Roboto&fontcolor=6f63ff&fontsize=20&opacity=0.5&primarycolor=3b82f6&secondarycolor=1f2937&iconcolor=ffffff";
        chosen = epContext ? `https://player.vidify.top/embed/tv/${tmdb}/${s}/${e}?${uiParams}` : `https://player.vidify.top/embed/movie/${tmdb}?${uiParams}`;
    }
    else if (sourceTypeToUse === 'videasy' && tmdb) {
        const s = epContext?.season || 1;
        const e = epContext?.episodeNumberInSeason || 1;
        const vParams = "nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=3B82F6";
        chosen = epContext ? `https://player.videasy.net/tv/${tmdb}/${s}/${e}?${vParams}` : `https://player.videasy.net/movie/${tmdb}?${vParams}`;
    }
    else if (sourceTypeToUse === 'vidup' && identifier) {
        const s = epContext?.season || 1; const e = epContext?.episodeNumberInSeason || 1;
        chosen = epContext ? `https://vidup.to/tv/${identifier}/${s}/${e}?autoPlay=true` : `https://vidup.to/movie/${identifier}?autoPlay=true`;
    }
    else if (sourceTypeToUse === 'tmdb' && tmdb) {
        const s = epContext?.season || 1; const e = epContext?.episodeNumberInSeason || 1;
        chosen = epContext ? `https://vidlink.pro/tv/${tmdb}/${s}/${e}` : `https://vidlink.pro/movie/${tmdb}`;
    } 
    else if (sourceTypeToUse === '2embed' && identifier) {
        const s = epContext?.season || 1; const e = epContext?.episodeNumberInSeason || 1;
        chosen = epContext ? `https://www.2embed.cc/embedtv/${identifier}&s=${s}&e=${e}` : `https://www.2embed.cc/embed/${identifier}`;
    }
    else if (sourceTypeToUse === 'hls') {
        chosen = epContext ? epContext.direct_url : movieMeta.video_url;
        type = "video";
    }
    else if (sourceTypeToUse === 'embed') {
        chosen = epContext ? (epContext.html || epContext.html_code) : movieMeta.html_code;
        type = "html";
    }

    if (chosen) {
        setFinalSource(chosen);
        setSourceType(type);
        setVideoTitle(displayIdentity); 
        setShowOverlay(true);
        setShowServerOverlayDropdown(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        let finalMeta = null; let finalTmdbData = null; let parsedEp = [];
        
        // 1. Prioritize state data (from search clicks)
        if (location.state?.movie) {
            const m = location.state.movie;
            finalMeta = { ...m, slug: m.slug || routeSlug, title: m.title || m.name, tmdb_id: m.tmdb_id || m.id, poster: safeURI(m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : (m.poster || "/default-poster.jpg")), background: safeURI(m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : (m.background || m.cover_poster)), imdbRating: m.vote_average?.toFixed(1) || m.imdb_rating || "0.0", year: m.release_date?.split("-")[0] || m.first_air_date?.split("-")[0] || m.year, description: m.overview || m.description || "No description available.", download_links: m.download_links || [] };
            
            // Re-fetch full cast/details if state is partial
            if (!m.cast || m.cast.length === 0) {
                finalTmdbData = await fetchTmdbMetadata(m.imdb_id || m.id);
            } else {
                finalTmdbData = m;
            }
            parsedEp = Array.isArray(m.episodes) ? m.episodes : [];
        } 
        
        // 2. Fallback to Supabase
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
            setMovieMeta(finalMeta); 
            setTmdbMeta(finalTmdbData); 
            setEpisodes(parsedEp);
            
            const srv = [];
            if (finalMeta.imdb_id) srv.push({ id: 'imdb_reader', name: "Omega", label: "Direct", icon: <Cpu size={14}/> });
            if (finalMeta.html_code || parsedEp.some(e => e.html)) {
                srv.push({ id: 'embed', name: "Multi Audio", label: "Backup Node", icon: <Languages size={14}/> });
            }
            if (finalMeta.tmdb_id || finalMeta.id) {
                srv.push({ id: 'vidify', name: "Vidify", label: "Premium", icon: <Zap size={14}/> }, { id: 'videasy', name: "VidEasy", label: "Simple", icon: <Globe size={14}/> });
            }
            srv.push({ id: 'vidup', name: "VidUp", label: "HQ", icon: <Monitor size={14}/> }, { id: 'tmdb', name: "Alpha", label: "Auto", icon: <MonitorPlay size={14}/> }, { id: '2embed', name: "Prime", label: "Global", icon: <Globe size={14}/> });
            if (finalMeta.video_url || parsedEp.some(e => e.direct_url)) srv.push({ id: 'hls', name: "Direct", label: "Stream", icon: <Video size={14}/> });
            
            setAvailableServers(srv); setActiveServer(srv[0]);
            if (parsedEp.length > 0) setActiveSeason(`S${parsedEp[0]?.season || 1}`);
        }
      } catch (err) { console.error(err); } finally { if (isMounted) setLoading(false); }
    };
    fetchData(); return () => { isMounted = false; };
  }, [routeSlug, backendUrl, fetchTmdbMetadata, location.state]);

  if (loading) return <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-blue-500 font-black uppercase text-[10px] tracking-widest"><Loader2 className="w-12 h-12 animate-spin mb-4" />Initializing Neural Link</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24 font-sans overflow-x-hidden">
      
      {/* 🚀 OVERLAY PLAYER MODAL */}
      {showOverlay && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/98 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="relative w-full h-full max-w-7xl md:aspect-video md:h-auto bg-black md:rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] border-white/10 flex flex-col">
            
            <div className="absolute top-0 inset-x-0 z-[1050] p-4 sm:p-6 flex flex-row items-center justify-between bg-gradient-to-b from-black/90 to-transparent pointer-events-none md:-translate-y-2">
              <div className="flex-1 pointer-events-auto" />
              <div className="flex-[3] text-center pointer-events-auto pt-2">
                <h2 className="text-white font-black text-xs sm:text-lg md:text-xl uppercase tracking-widest italic truncate drop-shadow-lg">{videoTitle}</h2>
              </div>
              <div className="flex-1 flex items-center justify-end gap-2 pointer-events-auto pt-2">
                <div className="relative" ref={overlayDropdownRef}>
                  <button onClick={() => setShowServerOverlayDropdown(!showServerOverlayDropdown)} className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg backdrop-blur-md transition-all active:scale-95 shadow-xl">
                    <MonitorPlay size={14} className="text-blue-500" />
                    <span className="hidden md:inline text-[10px] font-black uppercase text-white">{activeServer?.name}</span>
                    <ChevronDown size={12} className={`text-gray-500 transition-transform ${showServerOverlayDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showServerOverlayDropdown && (
                    <div className="fixed md:absolute inset-0 md:inset-auto md:right-0 md:top-full mt-0 md:mt-2 w-full md:w-56 h-screen md:h-auto bg-black/95 md:bg-gray-900/95 backdrop-blur-3xl border-white/10 p-6 md:p-2 shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-top-2 duration-300 z-[2000] flex flex-col">
                      <div className="flex md:hidden items-center justify-between mb-10">
                         <div className="flex flex-col"><span className="text-[10px] font-black text-blue-500 tracking-widest uppercase">Encryption active</span><h3 className="text-xl font-black uppercase tracking-tighter text-white">Switch Server</h3></div>
                         <button onClick={() => setShowServerOverlayDropdown(false)} className="p-3 bg-white/5 rounded-full border border-white/10"><X size={28} className="text-white"/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-4 md:space-y-1 pr-2 custom-scrollbar">
                        {availableServers.map((server) => (
                          <button key={server.id} onClick={() => { setActiveServer(server); handlePlayAction(currentOverlayEp, server.id); setShowServerOverlayDropdown(false); }} className={`w-full flex items-center gap-5 md:gap-3 px-6 py-6 md:px-4 md:py-3 rounded-2xl md:rounded-lg transition-all text-left group border border-white/5 md:border-0 ${activeServer?.id === server.id ? 'bg-blue-600' : 'bg-white/5 md:bg-transparent hover:bg-blue-600/20'}`}>
                            <div className={`p-2.5 md:p-1 rounded-lg ${activeServer?.id === server.id ? 'bg-white/20 text-white' : 'bg-white/5 text-blue-400 group-hover:text-white'}`}>{server.icon}</div>
                            <div className="flex flex-col"><span className={`text-base md:text-[10px] font-black uppercase ${activeServer?.id === server.id ? 'text-white' : 'text-white/90'}`}>{server.name}</span><span className={`text-[11px] md:text-[8px] font-bold uppercase ${activeServer?.id === server.id ? 'text-blue-100' : 'text-gray-500'}`}>{server.label}</span></div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => { setShowOverlay(false); setCurrentOverlayEp(null); }} className="p-2 sm:p-3 bg-white/10 border border-white/20 backdrop-blur-md hover:bg-red-600 rounded-xl text-white transition-all active:scale-90 shadow-xl"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 w-full h-full relative z-10">
              {sourceType === "html" ? ( <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: finalSource }} />
              ) : sourceType === "video" ? ( <video src={finalSource} controls autoPlay className="w-full h-full" />
              ) : ( <iframe src={finalSource} className="w-full h-full border-none" allowFullScreen allow="autoplay; encrypted-media" /> )}
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-[110] bg-gray-950/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-4 font-black">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/watch")} className="p-2 hover:bg-white/5 rounded-full transition-colors"><ArrowLeft size={22} /></button>
            <Link to="/"><img src="/logo_39.png" className="h-7" alt="logo" /></Link>
          </div>
          <div className="text-gray-500 text-[10px] tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5 uppercase">Global Source Active</div>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="relative pt-16 w-full bg-gray-950 min-h-[500px]">
        {movieMeta?.background && (
          <div className="absolute inset-0 h-full w-full pointer-events-none z-0 overflow-hidden">
            <img src={movieMeta.background} className="w-full h-full object-cover opacity-30 transition-opacity duration-1000 scale-105" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent" />
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10 z-10 font-black">
          <div className="relative shrink-0 mx-auto lg:mx-0">
            <div className="relative group w-[180px] sm:w-[220px] aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/20">
              <img src={movieMeta?.poster || "/default-poster.jpg"} className="w-full h-full object-cover" alt="" />
            </div>
          </div>
          <div className="flex-1 space-y-6 lg:pt-4 text-center lg:text-left font-black">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter italic text-white drop-shadow-2xl leading-none">{movieMeta?.slug}</h1>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-[10px] uppercase">
                <div className="flex items-center gap-1.5 bg-blue-600 px-2.5 py-1 rounded-md shadow-lg text-white font-black"><ShieldCheck size={12}/> HD</div>
                <span className="text-gray-400 bg-black/40 border border-white/10 px-2 py-1 rounded-md flex items-center gap-1.5"><Clock size={12} className="text-blue-400"/> {tmdbMeta?.runtime || "---"} min</span>
                <span className="text-gray-400 bg-black/40 border border-white/10 px-2 py-1 rounded-md">{movieMeta?.year}</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-3 text-yellow-500 font-black"><Star fill="currentColor" size={14}/> {movieMeta?.imdbRating || "0.0"}</div>
            <p className="text-gray-200 text-xs sm:text-sm md:text-base italic border-l-4 border-blue-600 pl-5 py-3 mx-auto lg:mx-0 text-left bg-gray-950/20 backdrop-blur-sm rounded-r-xl max-h-[150px] sm:max-h-none overflow-y-auto font-medium">{movieMeta?.description}</p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
              <button onClick={() => handlePlayAction(episodes.length > 0 ? episodes[0] : null)} className="px-10 sm:px-12 py-3 sm:py-4 bg-white text-black font-black rounded-xl flex items-center justify-center gap-3 hover:bg-blue-600 hover:text-white transition-all shadow-xl text-[10px] sm:text-xs uppercase tracking-widest active:scale-95"><Play size={18} fill="currentColor"/> {episodes.length > 0 ? "Stream Episodes" : "Play Feature"}</button>
              {movieMeta?.download_links?.length > 0 && (
                <button onClick={() => document.getElementById("download-section")?.scrollIntoView({ behavior: "smooth" })} className="px-8 sm:px-10 py-3 sm:py-4 bg-white/10 text-white border border-white/10 font-black rounded-xl flex items-center justify-center gap-3 hover:bg-green-600 transition-all text-[10px] sm:text-xs uppercase tracking-widest active:scale-95"><Download size={18} /> Download Options</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="relative max-w-7xl mx-auto px-6 py-16 space-y-24 z-10 font-black">
        {/* EPISODES SECTION */}
        {episodes.length > 0 && (
          <div className="space-y-8">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {Object.keys(groupedEpisodes).map((seasonKey) => (
                  <button key={seasonKey} onClick={() => setActiveSeason(seasonKey)} className={`shrink-0 px-8 py-2.5 rounded-full text-[10px] uppercase transition-all border ${activeSeason === seasonKey ? "bg-blue-600 border-blue-500 shadow-lg text-white" : "bg-gray-900/50 text-gray-500 border-white/5 hover:text-gray-300"}`}>{groupedEpisodes[seasonKey].name}</button>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedEpisodes[activeSeason]?.episodes?.map((ep, i) => (
                  <div key={i} className="relative z-10">
                    <div onClick={() => setOpenDropdown(openDropdown === i ? null : i)} className={`group flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 rounded-2xl bg-gray-900/40 border border-white/5 hover:border-blue-500/30 transition-all items-center cursor-pointer ${openDropdown === i ? 'border-blue-600/50 bg-blue-900/10' : ''}`}>
                      <div className="relative shrink-0 w-full md:w-40 aspect-video rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center"><Play size={20} className={openDropdown === i ? 'text-blue-400' : 'text-white'}/></div>
                      <div className="flex-1 text-center sm:text-left"><p className="text-[10px] font-black uppercase text-blue-500 mb-1">S{ep.season} E{ep.episodeNumberInSeason}</p><h4 className="text-base font-bold text-white uppercase truncate max-w-[200px] sm:max-w-full">{ep.title || `Episode ${ep.episodeNumberInSeason}`}</h4></div>
                      <ChevronDown size={20} className={`transition-transform duration-300 ${openDropdown === i ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === i && (
                      <div className="mt-2 p-4 rounded-2xl bg-black/80 border border-white/10 grid grid-cols-2 gap-2 relative z-20">
                         <button onClick={() => handlePlayAction(ep, 'imdb_reader')} className="px-3 py-3 rounded-xl bg-yellow-600/10 text-yellow-500 text-[10px] font-black active:scale-95 uppercase">Omega</button>
                         <button onClick={() => handlePlayAction(ep, 'embed')} className="px-3 py-3 rounded-xl bg-indigo-600/10 text-indigo-500 text-[10px] font-black active:scale-95 uppercase">Multi Audio</button>
                         <button onClick={() => handlePlayAction(ep, 'vidify')} className="px-3 py-3 rounded-xl bg-purple-600/10 text-purple-500 text-[10px] font-black active:scale-95 uppercase">Vidify</button>
                         <button onClick={() => handlePlayAction(ep, 'videasy')} className="px-3 py-3 rounded-xl bg-blue-600/10 text-blue-500 text-[10px] font-black active:scale-95 uppercase">VidEasy</button>
                         <button onClick={() => handlePlayAction(ep, 'vidup')} className="px-3 py-3 rounded-xl bg-cyan-600/10 text-cyan-500 text-[10px] font-black active:scale-95 uppercase">VidUp</button>
                         <button onClick={() => handlePlayAction(ep, 'tmdb')} className="px-3 py-3 rounded-xl bg-blue-600/10 text-blue-500 text-[10px] font-black active:scale-95 uppercase">Alpha</button>
                         <button onClick={() => handlePlayAction(ep, '2embed')} className="px-3 py-3 rounded-xl bg-orange-600/10 text-orange-500 text-[10px] font-black active:scale-95 uppercase">Prime</button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 🎬 STARRING CAST WITH ROBUST IMAGE FALLBACK */}
        <div className="space-y-6 relative z-0">
            <div className="flex items-center gap-4 text-white font-black"><User className="text-blue-500" size={24} /><h2 className="text-xl font-black uppercase tracking-[0.2em]">Starring Cast</h2></div>
            
            {tmdbMeta?.cast && tmdbMeta.cast.length > 0 ? (
              <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4">
                  {tmdbMeta.cast.slice(0, 12).map((actor, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-3 shrink-0 group">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/5 group-hover:border-blue-500 transition-all duration-300 shadow-2xl bg-gray-800">
                        <img 
                          src={actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : "/default-avatar.jpg"} 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                          alt={actor.name} 
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = "/default-avatar.jpg";
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter w-24 text-center leading-tight group-hover:text-blue-400">{actor.name}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-3 shrink-0 animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-white/5 border border-white/5" />
                    <div className="h-2 w-16 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* METADATA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-[11px] uppercase font-black tracking-tight border-t border-white/5 pt-16 relative z-0">
            <div className="flex items-center gap-3 font-black"><Globe size={16} className="text-blue-500/50"/><span className="text-gray-500">Origin:</span><span className="text-gray-200">{tmdbMeta?.origin_country?.[0] || "Global"}</span></div>
            <div className="flex items-center gap-3 font-black"><Tags size={16} className="text-blue-500/50"/><span className="text-gray-500">Genres:</span><div className="flex flex-wrap gap-2 text-blue-400">{(tmdbMeta?.genres?.map(g => g.name) || movieMeta?.genres || ["Action"]).slice(0, 3).map((g, i) => <span key={i}>{g}</span>)}</div></div>
            <div className="flex items-center gap-3 font-black"><Calendar size={16} className="text-blue-500/50"/><span className="text-gray-500 font-black">Released:</span><span className="text-gray-200">{movieMeta?.release_date ? new Date(movieMeta.release_date).toLocaleDateString() : (movieMeta?.year || "Recently")}</span></div>
        </div>

        {/* DOWNLOAD SECTION */}
        {movieMeta?.download_links?.length > 0 && (
          <div id="download-section" className="bg-slate-900/40 rounded-[2.5rem] p-6 sm:p-8 border border-white/5 scroll-mt-24 relative z-0 font-black">
            <div className="flex items-center gap-4 mb-8 text-white border-b border-white/5 pb-4"><Database className="text-green-500" size={24} /><h2 className="text-xl font-black uppercase tracking-[0.2em]">Download Servers</h2></div>
            <div className="space-y-10">
              {movieMeta.download_links.map((block, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-900/60 rounded-xl px-5 py-3 font-black">
                    <span className="text-sm font-black text-green-400 uppercase tracking-widest">{block.quality}</span>
                    {block.size && <span className="text-[11px] font-bold text-gray-400 font-black">{block.size}</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {block.links?.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="p-4 sm:p-5 rounded-2xl bg-gray-800/40 border border-white/5 hover:border-green-400 hover:bg-green-600/20 transition-all flex items-center gap-3 active:scale-95 font-black uppercase">
                        <Video size={18} className="text-green-400 font-black" />
                        <p className="text-xs">{link.label}</p>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEPLOYMENT GRID */}
        {availableServers.length > 0 && (
          <div className="bg-slate-900/40 rounded-[2rem] p-6 sm:p-8 border border-white/5 backdrop-blur-xl shadow-2xl relative z-0">
            <div className="flex items-center gap-4 mb-3 text-white border-b border-white/5 pb-4 font-black"><Server className="text-blue-500" size={24} /><h2 className="text-xl font-black uppercase tracking-[0.2em]">Deployment Grid</h2></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 font-black">
              {availableServers.map((server) => (
                <button key={server.id} type="button" onClick={() => handlePlayAction(null, server.id)} className={`relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col items-center gap-2 transition-all border overflow-hidden ${activeServer?.id === server.id ? "bg-blue-600 border-blue-400 shadow-lg text-white" : "bg-gray-800/30 border-white/5 text-gray-400 hover:border-white/20"}`}>
                  {server.icon || <MonitorPlay size={20} />}<span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-center">{server.name}</span>
                </button>
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