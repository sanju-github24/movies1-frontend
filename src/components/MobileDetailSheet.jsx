import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Play, Info, Volume2, VolumeX } from "lucide-react";

// Full-screen mobile detail sheet — same look as the WatchListPage mobile overlay,
// reused by the homepage grid. Shows Watch Now (if a stream link exists) + More Details.
const langLabel = (l) => {
  if (!l) return "";
  if (Array.isArray(l)) return l.length > 1 ? `${l.length} Languages` : (l[0] || "");
  return String(l);
};

// Turn a raw release name into a clean display title, e.g.
// "MUSAFIR CAFE (2026) S01 EP (01-08) TRUE WEB-DL - [1080P...] - ESUB" → "Musafir Cafe".
const cleanTitle = (t = "") => {
  if (!t) return "";
  // cut everything from the year / season / quality junk onward
  let s = t.split(/\s*[\(\[]?\s*(?:19|20)\d{2}/)[0];
  s = s.split(/\s+(?:S\d{1,2}|Season|EP\d|Complete|WEB[\s-]?DL|HDRip|BluRay|1080p|720p|480p|2160p)/i)[0];
  s = s.replace(/[\s\-_.|]+$/g, "").trim();
  return s || t;
};

export default function MobileDetailSheet({ movie, onClose }) {
  const [isMuted, setIsMuted] = useState(true);   // autoplay requires muted start

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!movie) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [movie]);

  if (!movie) return null;

  const cover = movie.cover_poster || movie.poster || movie.poster_url || "/default-poster.jpg";
  const genres = movie.tmdb_genres || movie.genres || movie.categories || [];
  const rating = movie.imdbRating || movie.imdb;
  const lang = langLabel(movie.language);

  return (
    <div className="fixed inset-0 z-[2147483000] bg-gray-950 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom duration-500"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <button onClick={onClose}
        className="absolute top-6 right-6 z-[210] p-3 bg-black/50 rounded-full text-white backdrop-blur-md active:scale-90 transition-transform">
        <X size={24} />
      </button>

      <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
        <div className="relative aspect-video w-full shadow-2xl bg-black overflow-hidden flex items-center justify-center">
          {movie.trailer_key ? (
            <>
              <div className="relative w-full h-full scale-[1.3] pointer-events-none">
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${movie.trailer_key}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${window.location.origin}`}
                  title="Trailer" className="w-full h-full" frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
              <div className="absolute top-4 left-4 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm shadow-lg pointer-events-none">
                <span className="text-[8px] font-bold text-white/90 uppercase tracking-[0.2em]">Trailer</span>
              </div>
              <button onClick={e => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute bottom-10 right-6 z-[220] p-3 bg-black/60 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all border border-white/10 shadow-2xl active:scale-90">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </>
          ) : (
            <img src={cover} className="w-full h-full object-cover opacity-80" alt=""
              onError={e => { e.target.src = "/default-poster.jpg"; }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="px-6 flex flex-col items-center text-center space-y-6 -mt-12 relative z-10">
          {movie.title_logo ? (
            <img src={movie.title_logo} className="h-16 w-auto object-contain drop-shadow-2xl mb-2" alt="" />
          ) : (
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl leading-none line-clamp-2 max-w-xs">{cleanTitle(movie.title) || movie.slug}</h3>
          )}

          <div className="flex items-center gap-4 text-xs font-black text-gray-400">
            {rating && (
              <div className="flex items-center gap-1.5">
                <div className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[3px] font-black text-[9px] shadow-md">IMDb</div>
                <span className="text-white">{rating}</span>
              </div>
            )}
            {movie.year && <span>{movie.year}</span>}
            {lang && <span className="font-black text-blue-400 uppercase tracking-widest">{lang}</span>}
            {movie.content_type === "tv" && (
              <span className="px-2 py-0.5 bg-purple-600/80 text-white text-[9px] font-black uppercase tracking-widest rounded">SERIES</span>
            )}
          </div>

          <div className="w-full space-y-3">
            {movie.watchUrl && (
              <a href={movie.watchUrl}
                className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg uppercase tracking-widest">
                <Play className="w-5 h-5 fill-current" />
                {movie.content_type === "tv" ? "STREAM SERIES" : "WATCH NOW"}
              </a>
            )}
            <Link to={`/movie/${movie.slug}`} onClick={onClose}
              className="w-full bg-white/10 border border-white/15 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest hover:bg-white/15">
              <Info className="w-5 h-5" /> More Details
            </Link>
          </div>

          {genres.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {genres.map(g => (
                <span key={g} className="px-3 py-1 bg-gray-900 border border-white/5 rounded-full text-[9px] font-black uppercase text-gray-400 tracking-wider">{g}</span>
              ))}
            </div>
          )}

          {movie.description && (
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm italic opacity-80 font-medium">{movie.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
