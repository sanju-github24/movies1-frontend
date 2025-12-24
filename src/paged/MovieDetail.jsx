// src/pages/MovieDetail.jsx
import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom"; 
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { 
  Download, Play, Magnet, Loader2, 
  AlertCircle, ArrowLeft, ShieldCheck, Info, Star 
} from "lucide-react"; 

const MovieDetail = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const { userData } = useContext(AppContext);

  useEffect(() => {
    let isMounted = true;
    const fetchMovie = async () => {
      if (!code) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("movies")
          .select("*")
          .eq("slug", code)
          .maybeSingle();
        if (isMounted) {
          if (error) throw error;
          setMovie(data);
        }
      } catch (err) {
        console.error("Fetch error:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMovie();
    return () => { isMounted = false; };
  }, [code]);

  // Helper to split a long title into [Clean Title, Extra Info]
  const processedTitle = useMemo(() => {
    if (!movie?.title) return { main: "Unknown Title", extra: "" };
    
    // Split at common delimiters used in torrent titles
    const parts = movie.title.split(/ - | \[| \(/);
    const mainTitle = parts[0];
    const extraDetails = movie.title.replace(mainTitle, "").trim();
    
    return { main: mainTitle, extra: extraDetails };
  }, [movie?.title]);

  const handleMagnetClick = (e, magnetUrl) => {
    e.preventDefault();
    if (window.confirm("Open Magnet Link in your Torrent Client?")) {
      window.location.href = magnetUrl;
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-4" />
    </div>
  );

  if (!movie) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-6">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold uppercase">Movie Not Found</h2>
      <Link to="/" className="mt-4 text-blue-500 underline text-sm uppercase font-bold">Go Home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center pb-24 md:pb-10">
      {/* Mobile Top Bar */}
      <div className="w-full h-14 bg-gray-900/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-1 text-[10px] font-black text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
           <ShieldCheck className="w-3 h-3" /> SECURE
        </div>
      </div>

      <div className="w-full max-w-4xl px-4 py-6 space-y-6">
        
        {/* Poster & Title Area */}
        <div className="flex flex-col items-center text-center space-y-4">
          <img 
            src={movie.poster || "/placeholder.jpg"} 
            className="w-48 sm:w-56 rounded-2xl shadow-2xl border-2 border-white/5" 
            alt="" 
          />
          
          <div className="space-y-2">
            {/* CLEAN MAIN TITLE: Large and Bold */}
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter leading-tight">
              {processedTitle.main} {movie.year && <span className="text-gray-600">({movie.year})</span>}
            </h1>
            
            {/* TECHNICAL INFO: Smaller and faded so it fits */}
            {processedTitle.extra && (
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed bg-gray-900/50 p-2 rounded-lg border border-white/5 line-clamp-3">
                {processedTitle.extra}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-[10px] font-black border border-yellow-500/20">
              <Star className="w-3 h-3 fill-yellow-500" /> {movie.imdb || 'N/A'}
            </div>
            <div className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">
              {movie.language || 'Telugu'}
            </div>
          </div>
        </div>

        {/* Storyline */}
        <div className="bg-gray-900/50 p-5 rounded-2xl border border-white/5">
           <h3 className="text-blue-500 font-black uppercase text-[10px] tracking-[0.2em] mb-3 flex items-center gap-2">
             <Info className="w-3 h-3" /> Storyline
           </h3>
           <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
             {movie.description || "A son's rebellion against his father's strict moral code leads to a tense adventure."}
           </p>
        </div>

        {/* Download Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 px-1">Download Links</h2>
          <div className="grid gap-3">
            {movie.downloads && Array.isArray(movie.downloads) && movie.downloads.map((d, i) => {
              const isMagnet = d.url?.startsWith('magnet:') || !!d.magnet;
              const finalLink = isMagnet ? (d.url?.startsWith('magnet:') ? d.url : d.magnet) : d.url;

              return (
                <div key={i} className="bg-gray-900 border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-yellow-500 font-black uppercase text-xs">{d.quality || 'HDRip'}</p>
                    <p className="text-gray-500 text-[9px] font-bold uppercase">{d.size || '700MB'} • {d.format || 'HEVC'}</p>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    {isMagnet ? (
                      <button 
                        onClick={(e) => handleMagnetClick(e, finalLink)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-[10px] uppercase tracking-widest transition"
                      >
                        <Magnet size={14} /> MAGNET
                      </button>
                    ) : (
                      <a 
                        href={finalLink} 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg text-[10px] uppercase tracking-widest transition"
                      >
                        <Download size={14} /> DOWNLOAD
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default MovieDetail;