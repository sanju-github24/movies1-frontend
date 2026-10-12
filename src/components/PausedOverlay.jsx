import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, PlayCircle, Star, Layers3 } from "lucide-react";

const PausedOverlay = ({
  isVisible,
  title,
  genres = [],
  quality = "Full HD",
  logoUrl,
  imdbRating,
  year,
  recommendations = [],
  onSelect,
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
      window.addEventListener("touchstart", handleAction, { passive: true });
    } else {
      setShouldRender(false);
      clearTimers();
    }

    return () => {
      clearTimers();
      window.removeEventListener("mousemove", handleAction);
      window.removeEventListener("touchstart", handleAction);
    };
  }, [isVisible]);

  if (!shouldRender || !isVisible) return null;

  const genreList = Array.isArray(genres) 
    ? genres 
    : (typeof genres === 'string' ? genres.split(',') : []);

  const cleanQuality = quality && quality !== "Full HD" ? quality : (quality || null);

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-center px-5 sm:px-8 md:px-16 lg:px-24 animate-in fade-in duration-700 pointer-events-none overflow-hidden">
      {/* Soft cinematic scrim — keeps controls/video readable underneath */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 sm:from-black/90 via-black/40 sm:via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="relative z-10 max-w-[80%] sm:max-w-2xl">
        <p className="text-[9px] sm:text-xs md:text-sm font-medium tracking-[0.2em] sm:tracking-[0.25em] uppercase text-white/50 mb-2 sm:mb-4">You're watching</p>

        {logoUrl ? (
          <img
            src={logoUrl}
            alt={title}
            className="max-w-[50vw] sm:max-w-[70vw] md:max-w-md max-h-14 sm:max-h-24 md:max-h-32 object-contain object-left drop-shadow-2xl mb-3 sm:mb-5"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <h1 className="text-white text-xl sm:text-3xl md:text-6xl font-bold leading-tight tracking-tight drop-shadow-2xl mb-3 sm:mb-5 line-clamp-2">{title}</h1>
        )}

        <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm md:text-base">
          {cleanQuality && (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-white/10 border border-white/15 text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wide">
              <ShieldCheck size={12} className="sm:w-3.5 sm:h-3.5" /> {cleanQuality}
            </span>
          )}
          {imdbRating && imdbRating !== "0.0" && (
            <span className="inline-flex items-center gap-1.5 text-white font-semibold">
              <Star size={13} fill="#EAB308" className="text-yellow-500 sm:w-4 sm:h-4" /> {imdbRating}
            </span>
          )}
          {year && <span className="text-white/60 font-medium">{year}</span>}
          {genreList.length > 0 && (
            <span className="text-white/60 font-medium">{genreList.slice(0, 3).map((g) => g.trim()).join(" · ")}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 mt-4 sm:mt-8 text-white/40 text-[11px] sm:text-sm">
          <PlayCircle size={16} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Tap or press space to resume</span>
          <span className="sm:hidden">Tap to resume</span>
        </div>
      </div>

      {/* More Like This — the OTT move: while paused, a row of what to watch
          next, straight from the overlay. Only this row takes pointer events
          (the rest of the overlay stays click-through so a tap resumes). */}
      {onSelect && recommendations.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-auto px-4 sm:px-8 md:px-16 lg:px-24 pb-5 sm:pb-8">
          <p className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-white/60 mb-2 sm:mb-3">More like this</p>
          <div className="flex gap-2.5 sm:gap-3 overflow-x-auto scrollbar-hide snap-x pb-1"
            onClick={(e) => e.stopPropagation()}>
            {recommendations.slice(0, 12).map((m) => (
              <button key={m.id || m.slug} type="button"
                onClick={() => onSelect(m)}
                title={m.title || m.slug}
                className="group/rec relative shrink-0 w-24 sm:w-32 md:w-36 snap-start rounded-lg overflow-hidden
                           ring-1 ring-white/10 hover:ring-white/50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <span className="block aspect-[2/3] bg-gray-900">
                  <img src={m.poster || m.poster_url || "/default-poster.jpg"} alt=""
                    loading="lazy" decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/rec:scale-105"
                    onError={(e) => { e.currentTarget.src = "/default-poster.jpg"; }} />
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pt-4 pb-1.5">
                  <span className="block text-[10px] sm:text-[11px] font-semibold text-white truncate">{m.title || m.slug}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PausedOverlay;