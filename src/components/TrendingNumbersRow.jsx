import React, { useRef, useState } from "react";
import { TrendingUp, Play } from "lucide-react";
import { getLiveShow, liveStatus, useLiveClock } from "../utils/liveShow";

/* Top 10 — the big Hotstar-style number overlays behind a landscape card.
   Shared by the home page (Header) and the watchlist page so they can't
   drift apart. The numbers are Hotstar's own overlay PNGs. */
const formatLanguageCount = (langs) => {
  const langArray = Array.isArray(langs) ? langs : [langs];
  if (langArray.length <= 1) return langArray[0] || "Unknown";
  return `${langArray.length} Languages`;
};

const HOTSTAR_NUMBER_OVERLAYS = [
  "https://img10.hotstar.com/image/upload/f_auto,q_90,w_128/discovery/PROD/top-10-overlays/version-1/LTR/overlay-1.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90/discovery/PROD/top-10-overlays/version-1/LTR/overlay-2.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90/discovery/PROD/top-10-overlays/version-1/LTR/overlay-3.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90/discovery/PROD/top-10-overlays/version-1/LTR/overlay-4.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90/discovery/PROD/top-10-overlays/version-1/LTR/overlay-5.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90/discovery/PROD/top-10-overlays/version-1/LTR/overlay-6.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90,w_128/discovery/PROD/top-10-overlays/version-1/LTR/overlay-7.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90,w_128/discovery/PROD/top-10-overlays/version-1/LTR/overlay-8.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90,w_128/discovery/PROD/top-10-overlays/version-1/LTR/overlay-9.png",
  "https://img10.hotstar.com/image/upload/f_auto,q_90,w_128/discovery/PROD/top-10-overlays/version-1/LTR/overlay-10.png",
];

const TrendingNumbersRow = ({ movies, onSelect, title = "Top 10 Today", limit = 10 }) => {
  const rowRef = useRef(null);
  const liveClock = useLiveClock();
  const [hoveredId, setHoveredId] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const timerRef = useRef(null);

  const handleMouseEnter = (id) => {
    if (window.innerWidth < 640) return;
    setHoveredId(id);
    timerRef.current = setTimeout(() => setShowTrailer(true), 2000);
  };
  const handleMouseLeave = () => {
    setHoveredId(null);
    setShowTrailer(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div className="mb-16 w-full overflow-visible">
      <h2 className="text-xl font-bold text-gray-200 mb-10 mx-6 sm:mx-20 border-l-4 border-blue-600 pl-3 uppercase tracking-widest flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-500" /> {title}
      </h2>

      <div className="relative group/row">
        <div
          ref={rowRef}
          className="flex overflow-x-auto scrollbar-hide scroll-smooth pt-2 pb-16 pl-6 sm:pl-20 pr-10"
          style={{ gap: "52px" }}
        >
          {movies.slice(0, limit).map((movie, index) => (
           <div
  key={movie.id}
  className="relative flex-none cursor-pointer group"
  style={{
    width: "clamp(200px, 22vw, 300px)",
    zIndex: hoveredId === movie.id ? 40 : 10,  // ← whole card lifts up on hover
    transition: "z-index 0s",
  }}
  onMouseEnter={() => handleMouseEnter(movie.id)}
  onMouseLeave={handleMouseLeave}
  onClick={() => onSelect(movie)}
>
              {/* ── 16:9 Cover Poster Card ── */}
              <div
                className="relative w-full overflow-hidden rounded-xl bg-gray-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-blue-500 group-hover:scale-105 group-hover:shadow-blue-900/40"
                style={{ aspectRatio: "16/9" }}
              >
                {/* Always use cover_poster for landscape look */}
                <img
                  src={movie.cover_poster || movie.poster || "/default-cover.jpg"}
                  alt={movie.title}
                  className={`w-full h-full object-cover transition-opacity duration-700 ${
                    hoveredId === movie.id && showTrailer && movie.trailer_key
                      ? "opacity-0"
                      : "opacity-100"
                  }`}
                />

                {/* Trailer iframe on hover */}
                {hoveredId === movie.id && showTrailer && movie.trailer_key && window.innerWidth >= 640 && (
                  <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full scale-[1.4] pointer-events-none">
                      <iframe
                        src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay"
                      />
                    </div>
                    <div className="absolute top-2 left-2 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm">
                      <span className="text-[7px] font-black text-white/90 uppercase tracking-[0.2em]">Trailer</span>
                    </div>
                  </div>
                )}

                {/* Nightly telecast — lit only inside its daily window. */}
                {(() => {
                  const show = getLiveShow(movie);
                  if (!show) return null;
                  const st = liveStatus(show, liveClock);
                  return (
                    <div className={`absolute top-2 left-2 z-30 pointer-events-none flex items-center gap-1 px-1.5 py-0.5 rounded backdrop-blur-md border text-[8px] font-black uppercase tracking-tighter
                      ${st.live
                        ? "bg-red-600 text-white border-red-500 shadow-[0_0_18px_rgba(220,38,38,0.7)]"
                        : "bg-black/80 text-red-300 border-red-500/40"}`}>
                      <span className={`w-1 h-1 rounded-full bg-current ${st.live ? "animate-pulse" : ""}`} />
                      {st.badge}
                    </div>
                  );
                })()}

                {/* Badges top-right */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end pointer-events-none z-30">
                  {movie.imdbRating && (
                    <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
                      <div className="bg-[#f5c518] text-black px-1 rounded-[2px] font-black text-[7px] leading-none">IMDb</div>
                      <span className="text-[9px] font-black text-white">{movie.imdbRating}</span>
                    </div>
                  )}
                  {(() => {
                    const lang = formatLanguageCount(movie.language);
                    if (!lang || lang === "Unknown") return null;   // a source-site title carries no language — no badge
                    return (
                      <div className="bg-blue-600/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-tighter">
                        {lang}
                      </div>
                    );
                  })()}
                  {movie.content_type === "tv" && (
                    <div className="bg-purple-600/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-tighter">
                      SERIES
                    </div>
                  )}
                </div>

                {/* Hover gradient + play */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent flex flex-col justify-end p-3 z-20">
                  {movie.title_logo ? (
                    <img src={movie.title_logo} className="h-7 w-auto object-contain mb-1.5 self-start drop-shadow-2xl" alt="" />
                  ) : (
                    <div className="text-[11px] font-black text-white mb-1 truncate uppercase italic drop-shadow-md">
                      {movie.title || movie.slug}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Play className="w-3 h-3 text-white fill-current" />
                    <span className="text-[9px] font-black text-white uppercase tracking-tighter">
                      {movie.content_type === "tv" ? "Stream Series" : "Watch Now"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Hotstar Number Overlay ── positioned bottom-left, overlapping below the card */}
              {/* ── Hotstar Number Overlay ── */}
<img
  src={HOTSTAR_NUMBER_OVERLAYS[index]}
  alt={String(index + 1)}
  draggable={false}
  className="absolute pointer-events-none select-none transition-all duration-500"
  style={{
    bottom: "-22px",
    left: "-18px",
    width: "clamp(230px, 8vw, 450px)",
    height: "auto",
    zIndex: hoveredId === movie.id ? -1 : 0,  // ← slides BEHIND the card on hover
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.9))",
    opacity: hoveredId === movie.id ? 0.3 : 1, // ← fades out slightly when hidden behind
    transform: hoveredId === movie.id ? "scale(0.95) translateX(10px)" : "scale(1) translateX(0px)", // ← subtle slide-back effect
  }}
/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendingNumbersRow;
