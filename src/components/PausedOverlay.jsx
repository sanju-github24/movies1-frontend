import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, PlayCircle, Star, Layers3 } from "lucide-react";

const PausedOverlay = ({ 
  isVisible, 
  title, 
  genres = [], 
  quality = "Full HD", 
  logoUrl, 
  imdbRating, 
  year 
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const timerRef = useRef(null);

  // Function to clear existing timers
  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    const handleAction = () => {
      // If mouse moves, hide the overlay immediately
      setShouldRender(false);
      clearTimers();

      // If still paused, restart the 3-second wait timer
      if (isVisible) {
        timerRef.current = setTimeout(() => {
          setShouldRender(true);
        }, 3000);
      }
    };

    if (isVisible) {
      // Initialize the timer when first paused
      timerRef.current = setTimeout(() => {
        setShouldRender(true);
      }, 3000);

      // Listen for mouse movement to hide overlay
      window.addEventListener("mousemove", handleAction);
    } else {
      setShouldRender(false);
      clearTimers();
    }

    return () => {
      clearTimers();
      window.removeEventListener("mousemove", handleAction);
    };
  }, [isVisible]);

  if (!shouldRender || !isVisible) return null;

  const genreList = Array.isArray(genres) 
    ? genres 
    : (typeof genres === 'string' ? genres.split(',') : []);

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-center px-12 md:px-24 animate-in fade-in duration-1000 pointer-events-none overflow-hidden">
      
      {/* 1. Cinematic Backdrop Layer */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[4px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      
      {/* 2. Ambient High-End Glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-5xl space-y-12 relative z-10">
        
        {/* --- DYNAMIC LOGO ENGINE --- */}
        <div className="w-[450px] h-36 flex items-center justify-start overflow-hidden transition-all duration-1000 ease-out animate-in slide-in-from-left-10">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              className="max-w-full max-h-full object-contain drop-shadow-[0_0_40px_rgba(37,99,235,0.6)] brightness-125" 
              alt="Source Logo" 
            />
          ) : (
            <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-3xl backdrop-blur-xl shadow-2xl">
                 <Layers3 size={54} className="text-blue-500" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-black uppercase tracking-[0.6em] text-blue-500/80 mb-1">Neural Node</span>
                <h1 className="text-white text-5xl md:text-6xl font-black italic uppercase tracking-tighter drop-shadow-2xl leading-none">
                  {title}
                </h1>
              </div>
            </div>
          )}
        </div>

        {/* --- HIGH-END METADATA HUD --- */}
        <div className="space-y-8 animate-in slide-in-from-left-12 duration-700 delay-150">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3 px-6 py-2.5 bg-blue-600 border border-blue-400/40 rounded-xl text-[13px] font-black uppercase tracking-[0.25em] text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]">
              <ShieldCheck size={18} fill="currentColor" className="text-blue-200" />
              {quality || "4K Ultra HD"}
            </div>

            <div className="flex items-center gap-6">
              {genreList.map((genre, index) => (
                <div key={index} className="flex items-center gap-6">
                  <span className="text-gray-100 text-sm font-black uppercase tracking-[0.3em] drop-shadow-md">
                    {genre.trim()}
                  </span>
                  {index < genreList.length - 1 && (
                    <div className="w-[2px] h-5 bg-blue-500/30 rotate-[25deg] shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-8 pl-8 border-l border-white/10">
               {imdbRating && (
                 <div className="flex items-center gap-2.5 bg-white/5 px-4 py-2 rounded-lg border border-white/5 shadow-xl">
                   <Star size={18} fill="#EAB308" className="text-yellow-500"/> 
                   <span className="text-white font-black text-base tracking-tighter">{imdbRating}</span>
                 </div>
               )}
               {year && (
                 <div className="text-gray-400 font-black text-sm tracking-[0.4em] uppercase border-b-2 border-blue-600/50 pb-1">
                   {year}
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE RESUME INTERFACE --- */}
      <div className="absolute right-24 top-1/2 -translate-y-1/2 flex flex-col items-center gap-8 opacity-20 animate-pulse hidden xl:flex group hover:opacity-100 transition-opacity duration-500 pointer-events-none">
         <div className="w-[1px] h-48 bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
         <div className="relative">
            <div className="p-6 rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-xl transition-transform group-hover:scale-110">
               <PlayCircle size={64} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            </div>
         </div>
         <span className="[writing-mode:vertical-lr] text-[12px] font-black uppercase tracking-[0.8em] text-white py-4 translate-x-1">Resume Link</span>
         <div className="w-[1px] h-48 bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
      </div>
    </div>
  );
};

export default PausedOverlay;