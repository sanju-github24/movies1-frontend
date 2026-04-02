import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { 
  Loader2, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Download, 
  ChevronDown, 
  MonitorPlay,
  Zap,
  Globe,
  Info,
  RefreshCcw,
  Cpu,
  Settings2,
  Maximize2
} from "lucide-react";
import VideoPlayer from "./VideoPlayer";

const VideoPlayerPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [movieRow, setMovieRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [finalSource, setFinalSource] = useState(null);
  const [sourceType, setSourceType] = useState(null);
  const [videoTitle, setVideoTitle] = useState(null);
  
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const dropdownRef = useRef(null);

  // --- NEW FEATURE: Persistence Key ---
  // Using a stable key based on the source URL prevents the player from restarting 
  // during parent re-renders while allowing it to reset if the movie actually changes.
  const playerKey = useMemo(() => finalSource, [finalSource]);

  const passedState = location.state || {};
  const passedSrc = passedState.src || null;
  const passedMovieMeta = passedState.movieMeta || null;

  const availableServers = useMemo(() => [
    { id: 'server1', name: "Server Omega", label: "Neural-Optimized", icon: <Cpu size={14}/> },
    { id: 'server2', name: "Server Prime", label: "Direct HQ", icon: <Zap size={14}/> },
    { id: 'server3', name: "Server Global", label: "Multi-Language", icon: <Globe size={14}/> },
  ], []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setError(null);
      let chosen = null;
      let chosenType = null;
      let chosenTitle = null;

      try {
        if (slug) {
          const { data: watchData } = await supabase
            .from("watch_html")
            .select("*")
            .eq("slug", slug)
            .maybeSingle();

          if (watchData) {
            const { data: movieMatch } = await supabase
              .from("movies")
              .select("quality, genres, imdb_rating, year, title_logo, cover_poster")
              .eq("title", watchData.title)
              .maybeSingle();

            const metadata = {
              ...watchData,
              quality: movieMatch?.quality || "4K Ultra HD",
              genres: movieMatch?.genres || watchData.genres || ["Action"],
              imdbRating: movieMatch?.imdb_rating || watchData.imdb_rating || "0.0",
              year: movieMatch?.year || watchData.year,
              logoUrl: watchData.logo_url || movieMatch?.title_logo || null
            };

            if (mounted) setMovieRow(metadata);
            chosen = watchData.video_url || watchData.html_code;
            chosenType = watchData.video_url ? "video" : "html";
            chosenTitle = watchData.title;
          }
        }

        if (!chosen && passedSrc) {
          if (typeof passedSrc === "object") {
            chosen = passedSrc.html || passedSrc.src || passedSrc.direct_url;
            chosenType = (passedSrc.html || passedSrc.type === "html") ? "html" : "video";
            chosenTitle = passedSrc.name || passedSrc.title;
          } else {
            chosen = passedSrc;
            chosenType = "video";
          }
        }

        if (!mounted) return;

        if (!chosen) {
          setError("Neural link failed. Source unreachable.");
        } else {
          setFinalSource(chosen);
          setSourceType(chosenType);
          setVideoTitle(chosenTitle || slug || "Streaming Now");
          
          // --- NEW FEATURE: Media Session API ---
          if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: chosenTitle || "Streaming Now",
              artist: "Anchor Movies Neural Node",
              artwork: [{ src: movieRow?.cover_poster || '/logo.png', sizes: '512x512', type: 'image/png' }]
            });
          }
        }
      } catch (err) {
        setError("Core Sync Failure.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowServerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { 
      mounted = false; 
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [slug, passedSrc]);

  const handleBack = useCallback(() => {
    const backSlug = movieRow?.slug || passedMovieMeta?.slug || slug;
    backSlug ? navigate(`/watch/${backSlug}`) : navigate("/");
  }, [movieRow, navigate, slug, passedMovieMeta]);

  const triggerDownload = () => {
    const backSlug = movieRow?.slug || passedMovieMeta?.slug || slug;
    navigate(`/watch/${backSlug}#download-section`);
  };

  const hasDownloadLinks = movieRow?.download_links?.length > 0 || passedMovieMeta?.download_links?.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="text-blue-400 font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">Synchronizing Neural Stream</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/95 backdrop-blur-3xl flex items-center justify-center p-2 sm:p-4 lg:p-8 overflow-hidden">
      <div className="relative w-full max-w-7xl aspect-video bg-black rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,1)] border border-white/5 flex flex-col">
        
        {/* --- CINEMATIC HEADER --- */}
        <div className="absolute top-0 inset-x-0 z-[60] p-4 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-b from-black via-black/60 to-transparent gap-4 pointer-events-none">
          
          <div className="flex flex-col gap-1.5 pointer-events-auto">
            <h1 className="text-white font-black text-lg sm:text-2xl md:text-3xl uppercase tracking-tighter italic drop-shadow-2xl">
              {videoTitle}
            </h1>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-blue-400 text-[8px] font-black tracking-widest uppercase bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 shadow-lg shadow-blue-900/20">
                    <ShieldCheck size={10} /> Node: Active
                </div>
                <button 
                    onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                    className="flex items-center gap-1.5 text-white/40 hover:text-yellow-400 text-[8px] font-black tracking-widest uppercase transition-all"
                >
                    <Settings2 size={10} /> Troubleshoot
                </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end pointer-events-auto">
            <div className="relative flex-1 sm:flex-none" ref={dropdownRef}>
              <button 
                onClick={() => setShowServerDropdown(!showServerDropdown)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-2">
                    <MonitorPlay size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Relay Servers</span>
                </div>
                <ChevronDown size={14} className={`text-gray-500 transition-transform duration-500 ${showServerDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showServerDropdown && (
                <div className="absolute right-0 top-full mt-3 w-64 bg-black border border-white/10 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,1)] animate-in slide-in-from-top-2 duration-300 z-[70]">
                  {availableServers.map((server) => (
                    <button 
                        key={server.id} 
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-blue-600 transition-all text-left group"
                        onClick={() => window.location.reload()}
                    >
                      <div className="p-2 bg-white/5 rounded-lg text-blue-400 group-hover:bg-white/20 group-hover:text-white">{server.icon}</div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase">{server.name}</span>
                        <span className="text-[8px] font-bold text-white/40 group-hover:text-white/80 uppercase">{server.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
                {hasDownloadLinks && (
                    <button 
                        onClick={triggerDownload}
                        className="p-3 bg-blue-600 hover:bg-blue-500 border border-blue-400/30 rounded-xl text-white transition-all shadow-xl"
                    >
                        <Download size={18} />
                    </button>
                )}
                <button 
                  onClick={handleBack}
                  className="p-3 bg-white/10 hover:bg-red-600 rounded-xl text-white transition-all border border-white/5"
                >
                  <X size={18} />
                </button>
            </div>
          </div>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="flex-1 w-full h-full relative z-10">
          {sourceType === "html" ? (
            <div 
              className="w-full h-full bg-black"
              dangerouslySetInnerHTML={{ 
                __html: finalSource.includes('<iframe') 
                  ? finalSource.replace('<iframe', '<iframe class="w-full h-full border-0"') 
                  : `<iframe src="${finalSource}" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay" class="w-full h-full"></iframe>` 
              }}
            />
          ) : (
            <VideoPlayer
              key={playerKey} // CRITICAL: Only resets if the URL changes
              src={finalSource}
              title={videoTitle}
              onBackClick={handleBack}
              genres={movieRow?.genres}
              quality={movieRow?.quality}
              logoUrl={movieRow?.logoUrl}
              imdbRating={movieRow?.imdbRating}
              year={movieRow?.year}
              episodes={passedMovieMeta?.episodes}
              currentEpisodeIndex={passedState?.currentEpisodeIndex}
              onEpisodeClick={passedState?.onEpisodeClick}
            />
          )}
        </div>

        {/* --- TROUBLESHOOT OVERLAY --- */}
        {showTroubleshoot && (
            <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in zoom-in-95 duration-300">
                <div className="max-w-md w-full bg-gray-900 border border-white/10 p-10 rounded-[2.5rem] text-center space-y-8 shadow-2xl">
                    <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mx-auto text-yellow-500 border border-yellow-500/20 animate-pulse">
                        <AlertCircle size={40} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-white font-black uppercase tracking-widest text-xl italic">Signal Diagnostic</h3>
                        <p className="text-gray-400 text-[10px] leading-relaxed font-bold uppercase tracking-wider">
                            Playback issue? MKV files require Server Omega for seeking. Switch servers or re-sync the node.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => window.location.reload()} className="w-full py-4 bg-white text-black font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all">
                            <RefreshCcw size={16} /> Re-Sync Connection
                        </button>
                        <button onClick={() => setShowTroubleshoot(false)} className="w-full py-4 bg-white/5 text-white font-black uppercase text-[10px] rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayerPage;