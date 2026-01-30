// src/pages/VideoPlayerPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
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
  RefreshCcw
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

  const passedState = location.state || {};
  const passedSrc = passedState.src || null;
  const passedMovieMeta = passedState.movieMeta || null;

  const availableServers = useMemo(() => [
    { id: 'server1', name: "Server Omega", label: "Auto-Optimized", icon: <MonitorPlay size={14}/> },
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

      if (passedSrc) {
        if (typeof passedSrc === "object") {
          chosen = passedSrc.html || passedSrc.src || passedSrc.direct_url;
          chosenType = (passedSrc.html || passedSrc.type === "html") ? "html" : "video";
          chosenTitle = passedSrc.name || passedSrc.title;
        } else {
          chosen = passedSrc;
          chosenType = "video";
        }
      }

      if (!chosen && slug) {
        const { data, error: dbErr } = await supabase
          .from("watch_html")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (!dbErr && data) {
          if (mounted) setMovieRow(data);
          chosen = data.video_url || data.html_code;
          chosenType = data.video_url ? "video" : "html";
          chosenTitle = data.title;
        }
      }

      if (!mounted) return;

      if (!chosen) {
        setError("Source link invalid or expired.");
      } else {
        setFinalSource(chosen);
        setSourceType(chosenType);
        setVideoTitle(chosenTitle || slug || "Streaming Now");
      }
      setLoading(false);
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

  const handleBack = () => {
    const backSlug = movieRow?.slug || passedMovieMeta?.slug || slug;
    backSlug ? navigate(`/watch/${backSlug}`) : navigate("/");
  };

  const triggerDownload = () => {
    const backSlug = movieRow?.slug || passedMovieMeta?.slug || slug;
    navigate(`/watch/${backSlug}#download-section`);
  };

  const hasDownloadLinks = movieRow?.download_links?.length > 0 || passedMovieMeta?.download_links?.length > 0;

  const playerOverlayData = useMemo(() => ({
    title: videoTitle,
    slug: slug || movieRow?.slug,
    year: movieRow?.year,
    logoUrl: movieRow?.title_logo || passedMovieMeta?.titleLogoUrl
  }), [videoTitle, slug, movieRow, passedMovieMeta]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="text-blue-400 font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">Initializing Secure Stream</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/95 backdrop-blur-3xl flex items-center justify-center p-2 sm:p-4 lg:p-8">
      <div className="relative w-full max-w-7xl aspect-video bg-black rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.9)] border border-white/5 flex flex-col">
        
        {/* --- CINEMATIC HEADER OVERLAY --- */}
        {/* 🚀 FIXED: Added pointer-events-none to the container so video controls are clickable behind it */}
        <div className="absolute top-0 inset-x-0 z-[60] p-4 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-b from-black via-black/40 to-transparent gap-4 pointer-events-none">
          
          {/* 🚀 FIXED: Added pointer-events-auto to inner content so buttons remain clickable */}
          <div className="flex flex-col gap-1.5 pointer-events-auto">
            <h1 className="text-white font-black text-lg sm:text-2xl md:text-3xl uppercase tracking-tighter italic drop-shadow-md">
              {videoTitle}
            </h1>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-blue-400 text-[8px] font-black tracking-widest uppercase bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                <ShieldCheck size={10} /> Secure Node
                </div>
                <button 
                    onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                    className="flex items-center gap-1.5 text-yellow-500/80 hover:text-yellow-400 text-[8px] font-black tracking-widest uppercase transition-colors"
                >
                    <Info size={10} /> Black Screen?
                </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end pointer-events-auto">
            {/* Server Dropdown */}
            <div className="relative flex-1 sm:flex-none" ref={dropdownRef}>
              <button 
                onClick={() => setShowServerDropdown(!showServerDropdown)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                <div className="flex items-center gap-2">
                    <MonitorPlay size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Switch Server</span>
                </div>
                <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${showServerDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showServerDropdown && (
                <div className="absolute right-0 top-full mt-3 w-64 bg-gray-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 z-[70]">
                  {availableServers.map((server) => (
                    <button 
                        key={server.id} 
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-blue-600 transition-all text-left group"
                        onClick={() => window.location.reload()}
                    >
                      <div className="p-2 bg-white/5 rounded-lg text-blue-400 group-hover:bg-white/20 group-hover:text-white transition-colors">{server.icon}</div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">{server.name}</span>
                        <span className="text-[8px] font-bold text-gray-500 group-hover:text-blue-100 uppercase">{server.label}</span>
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
                        className="p-3 bg-blue-600 hover:bg-blue-500 border border-blue-400/30 rounded-xl text-white transition-all shadow-lg"
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

        {/* --- TROUBLESHOOT OVERLAY --- */}
        {showTroubleshoot && (
            <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in">
                <div className="max-w-md w-full bg-gray-900 border border-white/10 p-8 rounded-[2rem] text-center space-y-6">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto text-yellow-500">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-white font-black uppercase tracking-widest text-lg">Playback Issues?</h3>
                    <p className="text-gray-400 text-xs leading-relaxed font-medium">
                        Try switching nodes or refreshing the stream link.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => window.location.reload()} className="flex-1 py-3 bg-white text-black font-black uppercase text-[10px] rounded-xl flex items-center justify-center gap-2">
                            <RefreshCcw size={14} /> Reload Stream
                        </button>
                        <button onClick={() => setShowTroubleshoot(false)} className="flex-1 py-3 bg-white/5 text-white font-black uppercase text-[10px] rounded-xl border border-white/10">
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- VIDEO CONTENT --- */}
        {/* 🚀 FIXED: Video content should have lower z-index than troubleshoot but higher than the branding */}
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
              src={finalSource}
              title={videoTitle}
              onBackClick={handleBack}
              playerOverlayData={playerOverlayData}
              language={movieRow?.language}
            />
          )}
        </div>

        {/* Footer Branding */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-20 hidden sm:block z-0">
          <p className="text-[8px] font-black uppercase text-white tracking-[0.8em]">Ultra-Low Latency Node 049</p>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerPage;