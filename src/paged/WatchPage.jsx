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
  ExternalLink, Video, Zap
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

    if (sourceType === 'tmdb' && movieMeta.tmdb_id) {
        if (manualEpisode) {
            const s = manualEpisode.season || 1;
            const e = manualEpisode.episodeNumberInSeason || 1;
            const embedUrl = `https://vidlink.pro/tv/${movieMeta.tmdb_id}/${s}/${e}`;
            finalSrc = {
                src: embedUrl,
                type: 'html',
                html: `<iframe src="${embedUrl}" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>`,
                name: `S${s} E${e} (Auto)`
            };
        } else {
            const embedUrl = `https://vidlink.pro/movie/${movieMeta.tmdb_id}`;
            finalSrc = {
                src: embedUrl,
                type: 'html',
                html: `<iframe src="${embedUrl}" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>`,
                name: "Full Movie (Auto)"
            };
        }
    } 
    else if (sourceType === 'hls') {
        const url = manualEpisode ? manualEpisode.direct_url : movieMeta.video_url;
        if (url) {
            finalSrc = { src: url, type: 'video', name: manualEpisode ? `Episode ${manualEpisode.episodeNumberInSeason}` : "Direct Link" };
        }
    }
    else if (sourceType === 'embed') {
        const code = manualEpisode ? manualEpisode.html : movieMeta.html_code;
        if (code) {
            finalSrc = { src: code, type: 'html', html: code, name: manualEpisode ? `Episode ${manualEpisode.episodeNumberInSeason}` : "Mirror Link" };
        }
    }

    if (finalSrc) {
        navigate(`/player/${movieMeta.slug}`, { 
          state: { src: finalSrc, movieMeta, tmdbMeta, title } 
        });
    } else {
        alert("Streaming link unavailable.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("watch_html").select("*").eq("slug", routeSlug).single();
        if (error || !data) throw new Error("Data not found");

        const tmdb = data.imdb_id ? await fetchTmdbMetadata(data.imdb_id) : null;
        const parsedEp = Array.isArray(data.episodes) ? data.episodes : [];

        if (isMounted) {
            setTmdbMeta(tmdb);
            const meta = {
                slug: data.slug,
                title: data.title || data.slug,
                poster: tmdb?.poster_url || data.poster || "/poster.png",
                background: tmdb?.cover_poster_url || data.cover_poster || data.poster,
                imdbRating: tmdb?.imdb_rating ? tmdb.imdb_rating.toFixed(1) : (data.imdb_rating || "N/A"),
                year: tmdb?.year || data.year,
                trailer: data.trailer_url || tmdb?.trailer_url,
                tmdb_id: data.tmdb_id,
                video_url: data.video_url,
                html_code: data.html_code,
                // Restoring description from backend/tmdb
                description: tmdb?.overview || tmdb?.description || data.description || "No description available for this title."
            };
            setMovieMeta(meta);

            const servers = [];
            if (data.tmdb_id) servers.push({ id: 'tmdb', name: "Server Alpha", label: "Auto-Stream" });
            if (data.video_url || (parsedEp.length > 0 && parsedEp[0].direct_url)) {
              servers.push({ id: 'hls', name: servers.length > 0 ? "Server Beta" : "Server Alpha", label: "High Speed Direct" });
            }
            if (data.html_code || (parsedEp.length > 0 && parsedEp[0].html)) {
              servers.push({ id: 'embed', name: "Mirror Server", label: "External Cloud" });
            }
            
            setAvailableServers(servers);
            if (servers.length > 0) setActiveServer(servers[0]);
            setEpisodes(parsedEp);
        }
      } catch (err) {
          console.error(err);
      } finally {
          if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [routeSlug, backendUrl, fetchTmdbMetadata]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
      <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">Initialising Stream</p>
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
          <div className="absolute inset-0 h-[80vh]">
            <img src={movieMeta.background} className="w-full h-full object-cover opacity-25 blur-2xl scale-110" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12 items-center md:items-start">
          <div className="relative group max-w-xs aspect-[2/3] w-full rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10">
            <img src={movieMeta?.poster || "/default-poster.jpg"} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-all duration-500">
               <button onClick={() => handlePlayAction()} className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform">
                 <Play size={36} fill="currentColor" />
               </button>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-8">
            <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none italic drop-shadow-2xl">
                {movieMeta?.slug}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
               <div className="flex items-center gap-2 bg-gray-900/80 border border-white/10 rounded-xl px-3 py-1.5">
                  <span className="bg-[#f5c518] text-black font-black text-[10px] px-1.5 py-0.5 rounded-md">IMDb</span>
                  <span className="text-sm font-black">{movieMeta?.imdbRating}</span>
               </div>
               <span className="text-gray-400 font-bold bg-white/5 border border-white/5 px-4 py-1.5 rounded-xl text-sm">{movieMeta?.year}</span>
            </div>

            {/* Synopsis Display */}
            <p className="text-gray-300 text-sm md:text-lg leading-relaxed max-w-2xl font-medium italic drop-shadow-md">
                {movieMeta?.description}
            </p>

            <div className="flex flex-wrap gap-5 justify-center md:justify-start pt-4">
                <button onClick={() => handlePlayAction()} className="px-10 py-5 bg-white text-black font-black rounded-2xl flex items-center gap-3 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-xl text-xs uppercase tracking-widest">
                    <Play size={20} fill="currentColor" /> {activeServer ? `Play on ${activeServer.name}` : "Start Playback"}
                </button>
                {movieMeta?.trailer && (
                    <a href={movieMeta.trailer} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-red-600/10 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white font-black px-10 py-5 rounded-2xl transition-all active:scale-95 text-xs uppercase tracking-widest">
                        <Youtube size={22} /> Watch Trailer
                    </a>
                )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-16 space-y-24">
        {/* Server Selection Area */}
        {availableServers.length > 0 && (
          <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl shadow-2xl">
             <div className="flex items-center gap-4 mb-8 text-white">
                <Server className="text-blue-500" size={24} />
                <h2 className="text-xl font-black uppercase tracking-[0.2em]">Select Deployment Server</h2>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {availableServers.map((server) => (
                  <button 
                    key={server.id} 
                    onClick={() => setActiveServer(server)} 
                    className={`p-6 rounded-3xl flex flex-col items-center gap-2 transition-all border relative overflow-hidden ${activeServer?.id === server.id ? "bg-blue-600 border-blue-400 shadow-lg scale-[1.03] text-white" : "bg-gray-800/30 border-white/5 text-gray-400 hover:border-white/20"}`}
                  >
                    <MonitorPlay className={`mb-1 ${activeServer?.id === server.id ? "text-white" : "text-gray-500"}`} size={20} />
                    <span className={`text-sm font-black uppercase tracking-widest`}>{server.name}</span>
                    <span className={`text-[10px] font-bold uppercase ${activeServer?.id === server.id ? 'text-blue-100' : 'text-gray-600'}`}>{server.label}</span>
                    {activeServer?.id === server.id && <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse" />}
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* Episode List */}
        {episodes.length > 0 && (
          <div className="relative">
            <div className="flex items-center gap-4 mb-12 text-white">
                <List className="text-blue-500" size={24} />
                <h2 className="text-2xl font-black uppercase tracking-[0.2em]">Episodes</h2>
            </div>

            <div className="space-y-16 relative">
              {Object.entries(groupedEpisodes).map(([key, season]) => (
                <div key={key} className="relative">
                  <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.4em] mb-8 bg-gray-900 w-fit px-4 py-1.5 rounded-full border border-blue-500/20 ml-10">{season.name}</h3>
                  <div className="absolute left-[31px] top-16 bottom-0 w-[2px] bg-gradient-to-b from-blue-600 via-blue-600/20 to-transparent group-last:bottom-12"></div>

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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {movieMeta?.tmdb_id && (
                                    <button onClick={() => handlePlayAction(ep, 'tmdb')} className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-600/10 border border-blue-600/30 hover:bg-blue-600 text-[9px] font-black uppercase text-blue-400 hover:text-white transition-all"><Zap size={12} /> Auto</button>
                                )}
                                {ep.direct_url && (
                                    <button onClick={() => handlePlayAction(ep, 'hls')} className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-green-600/10 border border-green-600/30 hover:bg-green-600 text-[9px] font-black uppercase text-green-400 hover:text-white transition-all"><Video size={12} /> Direct</button>
                                )}
                                {ep.html && (
                                    <button onClick={() => handlePlayAction(ep, 'embed')} className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-purple-600/10 border border-purple-600/30 hover:bg-purple-600 text-[9px] font-black uppercase text-purple-400 hover:text-white transition-all"><ExternalLink size={12} /> Mirror</button>
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

        <CastSection tmdbMeta={tmdbMeta} />
      </main>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-[60]">
        <Navbar />
      </div>
    </div>
  );
};

export default WatchHtmlPage;