import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Play, Volume2, VolumeX, Star, Plus, ChevronDown, CheckCircle2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTitleEpisodes, cleanTitle, epNo, seasonNo, epStill, airDate } from "../utils/titleEpisodes";
import { inMyList, toggleMyList } from "../utils/myList";
import { useRecommendations } from "../utils/recommendations";

const formatLanguage = (langs) => {
  const langArray = Array.isArray(langs) ? langs : [langs];
  if (langArray.length <= 1) return langArray[0] || "Unknown";
  return `${langArray.length} Languages`;
};

/* ── Home-row style animated related titles row ──
   Mirrors the GenreRow cards on the watchlist home: poster → cover crossfade,
   hover expand, trailer preview after 2s, gradient info + Watch Now. */
const RelatedRow = ({ movies, onSelect, onPlay }) => {
  const rowRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const timerRef = useRef(null);

  const handleMouseEnter = (id) => {
    setHoveredId(id);
    timerRef.current = setTimeout(() => setShowTrailer(true), 2000);
  };
  const handleMouseLeave = () => {
    setHoveredId(null);
    setShowTrailer(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });

  useEffect(() => {
    checkScroll();
    const el = rowRef.current;
    el?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => { el?.removeEventListener("scroll", checkScroll); window.removeEventListener("resize", checkScroll); };
  }, [movies]);

  return (
    <div className="relative group/row">
      {showLeft && (
        <button onClick={() => scroll("left")}
          className="absolute left-[-10px] top-0 bottom-0 z-[560] flex items-center justify-center w-10 text-white bg-black/60 backdrop-blur-sm hover:bg-blue-600 transition-all rounded-r-xl opacity-0 group-hover/row:opacity-100">◀</button>
      )}
      <div ref={rowRef} className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-12 pt-4 px-1">
        {movies.map((m) => {
          const cardId = m.id || m.slug;
          const isHovered = hoveredId === cardId;
          return (
            <div
              key={cardId}
              className="group relative flex-none w-36 h-56 border border-white/5 rounded-xl cursor-pointer transition-all duration-500 ease-out hover:z-[555] hover:scale-110 hover:w-72 hover:shadow-[0_20px_50px_rgba(0,0,0,1)] bg-gray-900"
              onMouseEnter={() => handleMouseEnter(cardId)}
              onMouseLeave={handleMouseLeave}
              onClick={() => onSelect(m)}
            >
              <img src={m.poster || m.poster_url || "/default-poster.jpg"} alt={m.title}
                className={`absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity duration-300 ${isHovered ? "opacity-0" : "opacity-100"}`} />
              <img src={m.cover_poster || m.poster || m.poster_url} alt={m.title}
                className={`absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity duration-500 ${isHovered && !showTrailer ? "opacity-100" : "opacity-0"}`} />
              {isHovered && showTrailer && m.trailer_key && (
                <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden rounded-xl">
                  <div className="w-full h-full scale-[1.6] pointer-events-none">
                    <iframe src={`https://www.youtube.com/embed/${m.trailer_key}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                      className="w-full h-full" frameBorder="0" allow="autoplay" />
                  </div>
                  <div className="absolute top-3 left-3 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm">
                    <span className="text-[7px] font-black text-white/90 uppercase tracking-[0.2em]">Trailer</span>
                  </div>
                </div>
              )}
              {m.content_type === "tv" && (
                <div className="absolute top-2 left-2 z-30 px-1.5 py-0.5 bg-purple-600/90 backdrop-blur-md rounded text-[7px] font-black uppercase text-white tracking-tighter">
                  SERIES
                </div>
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent flex flex-col justify-end p-4 rounded-xl pointer-events-none group-hover:pointer-events-auto z-40">
                {m.title_logo ? (
                  <img src={m.title_logo} className="h-8 w-auto object-contain mb-2 self-start" alt="" />
                ) : (
                  <div className="text-xs font-black text-white mb-2 truncate uppercase">{m.title || m.slug}</div>
                )}
                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-300 mb-2">
                  <span className="text-blue-400 uppercase font-black">{formatLanguage(m.language)}</span>
                  {m.imdbRating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" /> {m.imdbRating}
                    </span>
                  )}
                  {m.year && <span>{m.year}</span>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onPlay?.(m); }}
                  className="w-full py-1.5 bg-white text-black text-[9px] font-extrabold rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                  <Play className="w-3 h-3 fill-current" />
                  {m.content_type === "tv" ? "STREAM SERIES" : "WATCH NOW"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {showRight && (
        <button onClick={() => scroll("right")}
          className="absolute right-[-10px] top-0 bottom-0 z-[560] flex items-center justify-center w-10 text-white bg-black/60 backdrop-blur-sm hover:bg-blue-600 transition-all rounded-l-xl opacity-0 group-hover/row:opacity-100">▶</button>
      )}
    </div>
  );
};

const DesktopDetailOverlay = ({ movie, onClose, onNavigate, onSelectMovie, relatedMovies, isMuted, setIsMuted }) => {
  const [showTrailer, setShowTrailer] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [activeSeason, setActiveSeason] = useState(null);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  const { episodes, seasons, tmdbExtra, trailerMp4 } = useTitleEpisodes(movie);
  // Our library first (same genres), then TMDB's own recommendations.
  const recommendations = useRecommendations(movie, relatedMovies || [], tmdbExtra, 18);

  useEffect(() => {
    setIsEntering(true);
    setShowTrailer(false);
    setActiveSeason(null);          // a new title opens on its newest season
    setSaved(inMyList(movie?.slug));

    if (movie?.trailer_key) {
      const timer = setTimeout(() => {
        setShowTrailer(true);
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [movie]);

  // Newest season first, like the mobile sheet.
  const currentSeason = activeSeason ?? (seasons.length ? seasons[seasons.length - 1] : null);
  const seasonEpisodes = useMemo(
    () => episodes.filter((e) => seasonNo(e) === currentSeason).sort((a, b) => epNo(a) - epNo(b)),
    [episodes, currentSeason]
  );
  const latestEpisode = seasonEpisodes[0] || episodes[0] || null;

  if (!movie) return null;

  // Fill the gaps in our row from the TMDB detail the hook resolved.
  const x = tmdbExtra || {};
  const isTV = movie.content_type === "tv" || episodes.length > 0 || x.content_type === "tv";
  const genres = (movie.genres?.length ? movie.genres : (movie.tmdb_genres || x.genres || []));
  const cover = movie.cover_poster || x.cover_poster_url || movie.poster;
  const logo = movie.title_logo || x.title_logo || "";
  const description = movie.description || x.description || "No description available.";
  const ratingImdb = movie.imdbRating || movie.imdb_rating || x.imdb_rating;
  const certification = movie.certification || x.certification;

  const formatLanguageDisplay = (langs) => {
    const langArray = Array.isArray(langs) ? langs : [langs];
    if (langArray.length <= 1) return langArray[0] || "Unknown";
    return `${langArray.length} Languages`; 
  };

  /* Play straight into the player — the watch PAGE is never shown. WatchPage
     resolves the servers and opens its player overlay from `autoPlay`. */
  const play = (ep = null) => {
    const episode = ep ? { season: seasonNo(ep), episode: epNo(ep) } : null;
    if (onNavigate) onNavigate(movie, { autoPlay: true, episode });
    else navigate(`/watch/${movie.slug}`, { state: { autoPlay: true, autoPlayEpisode: episode } });
    onClose();
  };
  const handlePlayClick = () => play(isTV ? latestEpisode : null);

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
              src={cover} 
              className={`w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${showTrailer && (trailerMp4 || movie.trailer_key) ? 'opacity-0' : 'opacity-60'}`} 
              alt="" 
            />

            {!movie.trailer_key && trailerMp4 && showTrailer && (
              <div className="absolute inset-0 animate-in fade-in duration-1000">
                {/* Bare MP4 — no iframe, so no player chrome of any kind. */}
                <video key={trailerMp4} src={trailerMp4} autoPlay muted={isMuted} loop playsInline preload="auto"
                  className="w-full h-full object-cover pointer-events-none" />
              </div>
            )}

            {movie.trailer_key && showTrailer && (
              <div className="absolute inset-0 animate-in fade-in duration-1000">
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`}
                  className="w-full h-full scale-[1.35] pointer-events-none"
                  frameBorder="0"
                  allow="autoplay"
                />
              </div>
            )}
            
            {/* 🚀 FIXED VOLUME BUTTON: Always white icons, clear visibility */}
            {(trailerMp4 || movie.trailer_key) && showTrailer && (
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
                {logo ? (
                  <img 
                    src={logo} 
                    className="h-full max-w-[320px] object-contain object-left drop-shadow-2xl" 
                    alt="Title Logo" 
                  />
                ) : (
                  <h1 className="text-4xl xl:text-5xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl">
                    {cleanTitle(movie.title) || movie.slug}
                  </h1>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-black text-gray-300">
                {ratingImdb && (
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-white">{ratingImdb}</span>
                  </div>
                )}
                {(movie.year || x.year) && <span>{movie.year || x.year}</span>}
                {certification && (
                  <span className="px-1.5 py-0.5 bg-white/10 border border-white/15 rounded text-gray-200">{certification}</span>
                )}
                {seasons.length > 0 && (
                  <span>{seasons.length} Season{seasons.length > 1 ? "s" : ""}</span>
                )}
                <span className="text-blue-500 tracking-widest">{formatLanguageDisplay(movie.language)}</span>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePlayClick}
                  className="px-8 py-3.5 bg-white text-black hover:bg-blue-600 hover:text-white rounded-xl font-black flex items-center gap-2 transition-all transform hover:scale-105 uppercase text-xs tracking-widest shadow-xl"
                >
                  <Play size={18} className="fill-current" />
                  {isTV && latestEpisode
                    ? <>WATCH S{seasonNo(latestEpisode)} E{epNo(latestEpisode)}</>
                    : "PLAY NOW"}
                </button>
                
                <button onClick={() => setSaved(toggleMyList(movie))} aria-label="Watchlist"
                  className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 backdrop-blur-xl transition-all">
                    {saved ? <Check size={20} className="text-blue-400" /> : <Plus size={20} />}
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
                 {description}
               </p>
            </div>

            <div className="space-y-6 pl-8 border-l border-white/5">
               <div className="text-xs">
                 <span className="text-gray-500 font-black uppercase tracking-widest block mb-2">Genres</span>
                 <div className="flex flex-wrap gap-2 text-gray-300 font-bold">
                   {genres.map((g, i) => (
                     <span key={g}>{g}{i !== genres.length - 1 && ","}</span>
                   ))}
                 </div>
               </div>
               
            </div>
          </div>

          {episodes.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center justify-between gap-6 mb-5">
                <h4 className="text-xl font-black text-white uppercase tracking-tighter italic border-l-4 border-blue-600 pl-3">
                  Episodes
                </h4>
                {seasons.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {seasons.map((sn) => (
                      <button key={sn} onClick={() => setActiveSeason(sn)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                          sn === currentSeason ? "bg-white text-black" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}>
                        Season {sn}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="max-h-[26rem] overflow-y-auto scrollbar-hide divide-y divide-white/5 pr-1">
                {seasonEpisodes.map((ep) => (
                  <button key={`${seasonNo(ep)}-${epNo(ep)}`} onClick={() => play(ep)}
                    className="w-full flex items-center gap-5 py-3 text-left group/ep hover:bg-white/[0.04] rounded-xl px-3 transition-colors">
                    <div className="relative w-40 shrink-0 aspect-video rounded-lg overflow-hidden bg-gray-900">
                      <img src={epStill(ep) || cover} alt="" loading="lazy"
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover/ep:scale-105 ${epStill(ep) ? "" : "opacity-60"}`}
                        onError={(e) => { e.currentTarget.src = cover; }} />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/ep:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-7 h-7 text-white fill-white drop-shadow" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold truncate">
                        {ep.title || ep.name || `Episode ${epNo(ep)}`}
                      </p>
                      <p className="text-gray-500 text-xs font-bold mt-1 flex items-center gap-2">
                        {ep.hasStream && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 text-[9px] font-black uppercase tracking-wider">AnchorHD</span>
                        )}
                        {`S${seasonNo(ep)} E${epNo(ep)}`}
                        {airDate(ep.air_date) && ` · ${airDate(ep.air_date)}`}
                        {ep.runtime ? ` · ${ep.runtime}m` : ""}
                      </p>
                      {ep.description && (
                        <p className="text-gray-400 text-sm mt-1.5 line-clamp-2">{ep.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="mt-20">
              <h4 className="text-xl font-black text-white uppercase tracking-tighter italic mb-4 border-l-4 border-blue-600 pl-3">
                Recommended <span className="text-blue-600">Titles</span>
              </h4>
              <RelatedRow
                movies={recommendations}
                onSelect={(m) => (onSelectMovie ? onSelectMovie(m) : onNavigate?.(m))}
                onPlay={(m) => { onNavigate?.(m, { autoPlay: true }); onClose(); }}
              />
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
