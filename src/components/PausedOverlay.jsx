import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, PlayCircle, Star } from "lucide-react";

const fmt = (t) => {
  const s = Math.max(0, Math.floor(t || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

const PausedOverlay = ({
  isVisible,
  title,
  genres = [],
  quality = "Full HD",
  logoUrl,
  imdbRating,
  year,
  currentTime = 0,
  duration = 0,
  onShowChange,
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

  /* The player hides its own controls while this is up — the screen is the
     details and the progress strip, nothing else — and brings them back the
     moment it goes. */
  const shown = shouldRender && isVisible;
  useEffect(() => { onShowChange?.(shown); }, [shown]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onShowChange?.(false), []);        // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;

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

      {/* How far in, how much is left — the only control-like thing on screen
          while paused, as on JioHotstar. */}
      {duration > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 sm:px-8 md:px-16 lg:px-24 pb-5 sm:pb-8">
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-sm font-medium tabular-nums text-white/85">
            <span>{fmt(currentTime)}</span>
            <span className="relative flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#1f80e0] to-[#2ba4ff]"
                style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }} />
            </span>
            <span className="text-white/60">-{fmt(Math.max(0, duration - currentTime))}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PausedOverlay;