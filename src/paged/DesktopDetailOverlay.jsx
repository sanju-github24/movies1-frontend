import React, { useState, useEffect } from "react";
import { X, Play, Volume2, VolumeX, Star, Info, Plus, ChevronDown, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom"; 

const DesktopDetailOverlay = ({ movie, onClose, onNavigate, relatedMovies, isMuted, setIsMuted }) => {
  const [showTrailer, setShowTrailer] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsEntering(true);
    setShowTrailer(false);
    
    if (movie?.trailer_key) {
      const timer = setTimeout(() => {
        setShowTrailer(true);
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [movie]);

  if (!movie) return null;

  const formatLanguageDisplay = (langs) => {
    const langArray = Array.isArray(langs) ? langs : [langs];
    if (langArray.length <= 1) return langArray[0] || "Unknown";
    return `${langArray.length} Languages`; 
  };

  const handlePlayClick = () => {
    navigate(`/watch/${movie.slug}`);
    onClose(); 
  };

  return (
    <div className="fixed inset-0 z-[500] hidden lg:flex items-center justify-center p-8 xl:p-16">
      {/* Smooth Blur Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-500" 
        onClick={onClose} 
      />

      {/* Main Card */}
      <div className={`relative w-full max-w-5xl h-full max-h-[90vh] bg-[#111111] rounded-[2.5rem] overflow-y-auto shadow-[0_0_80px_rgba(0,0,0,0.9)] scrollbar-hide flex flex-col transform transition-all duration-700 ease-out border border-white/5 ${isEntering ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-10'}`}>
        
        {/* Top Section: Media Engine */}
        <div className="relative min-h-[55vh] w-full shrink-0 overflow-hidden bg-black group">
          
          {/* 🚀 FIXED CLOSE BUTTON: Always white icon, clearly visible background */}
          <button 
            onClick={onClose} 
            className="absolute top-8 right-8 z-[520] p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-xl border border-white/20 transition-all active:scale-95"
            aria-label="Close"
          >
            <X size={24} strokeWidth={2.5} />
          </button>

          <div className="absolute inset-0">
            <img 
              src={movie.cover_poster || movie.poster} 
              className={`w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${showTrailer ? 'opacity-0' : 'opacity-60'}`} 
              alt="" 
            />

            {movie.trailer_key && showTrailer && (
              <div className="absolute inset-0 animate-in fade-in duration-1000">
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${movie.trailer_key}&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`}
                  className="w-full h-full scale-[1.35] pointer-events-none"
                  frameBorder="0"
                  allow="autoplay"
                />
              </div>
            )}
            
            {/* 🚀 FIXED VOLUME BUTTON: Always white icons, clear visibility */}
            {movie.trailer_key && showTrailer && (
               <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute bottom-10 right-10 z-[510] p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 backdrop-blur-xl transition-all shadow-2xl active:scale-95"
              >
                {isMuted ? <VolumeX size={22} strokeWidth={2.5} /> : <Volume2 size={22} strokeWidth={2.5} />}
              </button>
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/10 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111111]/80 via-transparent to-transparent z-10" />

          {/* Hero Content Overlay */}
          <div className="absolute bottom-0 left-0 w-full p-10 xl:p-12 z-20">
            <div className={`max-w-2xl space-y-6 transition-all duration-1000 delay-300 ${isEntering ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
              
              <div className="h-20 md:h-24 w-full flex items-end">
                {movie.title_logo ? (
                  <img 
                    src={movie.title_logo} 
                    className="h-full max-w-[320px] object-contain object-left drop-shadow-2xl" 
                    alt="Title Logo" 
                  />
                ) : (
                  <h1 className="text-4xl xl:text-5xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl">
                    {movie.title || movie.slug}
                  </h1>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-black text-gray-300">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-white">{movie.imdbRating || "7.5"}</span>
                </div>
                <span>{movie.year || "2024"}</span>
              
                <span className="text-blue-500 tracking-widest">{formatLanguageDisplay(movie.language)}</span>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePlayClick}
                  className="px-8 py-3.5 bg-white text-black hover:bg-blue-600 hover:text-white rounded-xl font-black flex items-center gap-2 transition-all transform hover:scale-105 uppercase text-xs tracking-widest shadow-xl"
                >
                  <Play size={18} className="fill-current" /> PLAY NOW
                </button>
                
                <button className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 backdrop-blur-xl transition-all">
                    <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Details and Recommended Section */}
        <div className={`bg-[#111111] p-10 xl:p-12 transition-all duration-1000 delay-500 ${isEntering ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
            <div className="xl:col-span-2 space-y-6">
               <div className="flex items-center gap-3 text-green-500 font-black text-sm uppercase tracking-tighter">
                 <CheckCircle2 size={16} />
                 <span>98% Match</span>
               </div>
               <p className="text-lg text-gray-200 leading-relaxed font-medium italic border-l-2 border-blue-600 pl-6">
                 {movie.description || "No description available."}
               </p>
            </div>

            <div className="space-y-6 pl-8 border-l border-white/5">
               <div className="text-xs">
                 <span className="text-gray-500 font-black uppercase tracking-widest block mb-2">Genres</span>
                 <div className="flex flex-wrap gap-2 text-gray-300 font-bold">
                   {movie.genres?.map((g, i) => (
                     <span key={i}>{g}{i !== movie.genres.length - 1 && ","}</span>
                   ))}
                 </div>
               </div>
               
            </div>
          </div>

          {relatedMovies.length > 0 && (
            <div className="mt-20">
              <h4 className="text-xl font-black text-white uppercase tracking-tighter italic mb-8">
                Recommended <span className="text-blue-600">Titles</span>
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {relatedMovies.map((m) => (
                  <div key={m.id || m.slug} className="group cursor-pointer" onClick={() => onNavigate(m)}>
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/5 bg-gray-900 shadow-xl transition-all duration-500 group-hover:scale-105 group-hover:border-blue-500/30">
                      <img src={m.poster || m.poster_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={m.title} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                         <Play size={24} className="text-white fill-current" />
                      </div>
                    </div>
                    <span className="mt-3 text-[11px] font-black text-gray-500 truncate uppercase block group-hover:text-white transition-colors">
                      {m.title || m.slug}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="h-20 flex items-center justify-center opacity-10">
             <ChevronDown size={30} className="text-white animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopDetailOverlay;