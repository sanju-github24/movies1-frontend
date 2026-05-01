import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Helmet } from "react-helmet";
import { Loader2, Play, X, TrendingUp, Globe, ListVideo, Volume2, VolumeX, ChevronLeft } from "lucide-react";
import { AppContext } from "../context/AppContext";
import axios from "axios";

/* ====== Helpers ====== */
const formatLanguageCount = (langs) => {
  const langArray = Array.isArray(langs) ? langs : [langs];
  if (langArray.length <= 1) return langArray[0] || "Unknown";
  return `${langArray.length} Languages`;
};

const saveRecentlyWatched = (movie) => {
  if (!movie || !movie.slug) return;
  try {
    const existing = JSON.parse(localStorage.getItem("recently_watched") || "[]");
    const filtered = existing.filter((m) => m.slug !== movie.slug);
    localStorage.setItem("recently_watched", JSON.stringify([movie, ...filtered].slice(0, 10)));
  } catch (e) { console.error(e); }
};

/* ====== Title Logo component ====== */
const TitleDisplay = ({ movie, className = "", textClassName = "" }) => {
  const [logoError, setLogoError] = useState(false);
  const logo = movie.title_logo;

  if (logo && !logoError) {
    return (
      <img
        src={logo}
        alt={movie.title}
        onError={() => setLogoError(true)}
        className={className}
      />
    );
  }
  return <span className={textClassName}>{movie.title}</span>;
};

/* ====== Desktop Modal Detail Panel ====== */
const DetailPanel = ({ movie, onClose, onNavigate, isMuted, setIsMuted }) => {
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    if (!movie) { setShowTrailer(false); return; }
    setShowTrailer(false);
    const t = setTimeout(() => setShowTrailer(true), 1800);
    return () => clearTimeout(t);
  }, [movie?.slug]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!movie) return null;
  const trailerKey = movie.trailer_codes || movie.trailer_key;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0d0e14] border border-white/8 shadow-[0_0_100px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-300 scrollbar-hide">

        {/* Hero */}
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          <img
            src={movie.cover_poster || movie.poster || "/default-cover.jpg"}
            className={`w-full h-full object-cover transition-opacity duration-1000 ${showTrailer && trailerKey ? "opacity-0" : "opacity-100"}`}
            alt=""
          />
          {showTrailer && trailerKey && (
            <div className="absolute inset-0 bg-black overflow-hidden">
              <div className="relative w-full h-full scale-[1.25] pointer-events-none">
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${trailerKey}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="autoplay"
                />
              </div>
              <div className="absolute top-4 left-4 z-30 px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-md">
                <span className="text-[8px] font-black text-white/90 uppercase tracking-[0.3em]">Trailer</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute bottom-5 right-5 z-30 p-2.5 bg-black/60 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md border border-white/10 transition-all shadow-2xl"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e14] via-[#0d0e14]/10 to-transparent pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-40 p-2.5 bg-black/70 rounded-full text-white hover:bg-white/20 backdrop-blur-md transition-all border border-white/10 shadow-xl"
          >
            <X size={18} />
          </button>

          {movie.isTmdbOnly && (
            <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 bg-blue-600/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border border-blue-400/30">
              <Globe size={9} /> Global Result
            </div>
          )}

          <div className="absolute bottom-5 left-6 z-20 pointer-events-none">
            <TitleDisplay
              movie={movie}
              className="h-12 sm:h-16 w-auto max-w-[300px] object-contain object-left drop-shadow-2xl"
              textClassName="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-white drop-shadow-2xl leading-none"
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col sm:flex-row gap-6 p-6 sm:p-8">
          <div className="hidden sm:block flex-none w-28 -mt-20 relative z-10 self-start">
            <div className="aspect-[2/3] rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl bg-gray-900">
              <img src={movie.poster || "/default-poster.jpg"} className="w-full h-full object-cover" alt="" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              {movie.imdb_rating && (
                <div className="flex items-center gap-1.5">
                  <div className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[4px] font-black text-[10px] shadow-md">IMDb</div>
                  <span className="text-sm font-black text-white">{movie.imdb_rating}</span>
                </div>
              )}
              {movie.year && (
                <span className="text-xs font-black text-gray-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">{movie.year}</span>
              )}
              <span className="text-xs font-black text-blue-400 uppercase tracking-widest">{formatLanguageCount(movie.language)}</span>
              {movie.content_type === "tv" && (
                <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-black uppercase bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg">
                  <ListVideo size={10} /> {movie.episodes?.length || 0} Episodes
                </div>
              )}
            </div>

            {movie.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {movie.genres.slice(0, 5).map((g) => (
                  <span key={g} className="px-3 py-1 bg-gray-900 border border-white/5 rounded-full text-[9px] font-black uppercase text-gray-400 tracking-wider">{g}</span>
                ))}
              </div>
            )}

            <p className="text-gray-400 text-sm leading-relaxed italic mb-6 max-w-2xl">{movie.description}</p>

            <button
              onClick={() => onNavigate(movie)}
              className="px-10 py-3.5 bg-white text-black hover:bg-blue-600 hover:text-white rounded-xl font-black text-sm flex items-center gap-2.5 transition-all shadow-lg uppercase tracking-widest w-full sm:w-auto justify-center sm:justify-start"
            >
              <Play className="w-4 h-4 fill-current" /> WATCH NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ====== Mobile Sheet ====== */
const SearchMobileSheet = ({ movie, onClose, onNavigate, isMuted, setIsMuted }) => {
  if (!movie) return null;
  const trailerKey = movie.trailer_codes || movie.trailer_key;

  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-950/98 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom duration-500"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button
        onClick={onClose}
        className="absolute top-5 left-5 z-[210] flex items-center gap-2 px-4 py-2.5 bg-black/60 rounded-full text-white backdrop-blur-md active:scale-90 transition-transform border border-white/10"
      >
        <ChevronLeft size={18} />
        <span className="text-[11px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide overscroll-contain">
        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
          {trailerKey ? (
            <>
              <div className="relative w-full h-full scale-[1.3] pointer-events-none">
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${trailerKey}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                  title="Trailer"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full shadow-lg pointer-events-none">
                <span className="text-[8px] font-bold text-white/90 uppercase tracking-[0.25em]">Trailer</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute bottom-4 right-5 z-[220] p-3 bg-black/70 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all border border-white/10 shadow-2xl active:scale-90"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </>
          ) : (
            <img src={movie.cover_poster || movie.poster} className="w-full h-full object-cover" alt="" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent pointer-events-none" />
          {movie.isTmdbOnly && (
            <div className="absolute top-14 right-4 z-30 flex items-center gap-1 bg-blue-600/80 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black uppercase border border-blue-400/30">
              <Globe size={8} /> Global
            </div>
          )}
        </div>

        <div className="px-5 pt-4 flex flex-col space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-none w-20 -mt-10 relative z-10">
              <div className="aspect-[2/3] rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl bg-gray-900">
                <img src={movie.poster || "/default-poster.jpg"} className="w-full h-full object-cover" alt="" />
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="mb-2">
                <TitleDisplay
                  movie={movie}
                  className="h-10 w-auto max-w-full object-contain object-left drop-shadow-2xl"
                  textClassName="text-xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl leading-tight"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black text-gray-400">
                {movie.imdb_rating && (
                  <div className="flex items-center gap-1">
                    <div className="bg-[#f5c518] text-black px-1 py-0.5 rounded-[3px] font-black text-[8px]">IMDb</div>
                    <span className="text-white">{movie.imdb_rating}</span>
                  </div>
                )}
                {movie.year && <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{movie.year}</span>}
                <span className="text-blue-400 uppercase">{formatLanguageCount(movie.language)}</span>
              </div>
            </div>
          </div>

          {movie.genres?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {movie.genres.slice(0, 5).map((g) => (
                <span key={g} className="px-3 py-1 bg-gray-900 border border-white/5 rounded-full text-[9px] font-black uppercase text-gray-400 tracking-wider">{g}</span>
              ))}
            </div>
          )}

          {movie.content_type === "tv" && (
            <div className="bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-xl flex items-center gap-2 self-start">
              <ListVideo size={12} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">{movie.episodes?.length || 0} Episodes</span>
            </div>
          )}

          <p className="text-gray-400 text-sm leading-relaxed italic">{movie.description}</p>

          <button
            onClick={() => onNavigate(movie)}
            className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg uppercase tracking-widest mt-2"
          >
            <Play className="w-5 h-5 fill-current" /> WATCH NOW
          </button>
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
};

/* ====== Card Title Strip ====== */
const CardTitleStrip = ({ movie }) => {
  const [logoError, setLogoError] = useState(false);
  const logo = movie.title_logo;

  return (
    <div className="relative flex items-center justify-between px-3 py-2.5 min-h-[44px] bg-[#16181f]">
      <div className="flex-1 min-w-0 pr-2">
        {logo && !logoError ? (
          <img
            src={logo}
            alt={movie.title}
            onError={() => setLogoError(true)}
            className="h-6 max-w-full object-contain object-left drop-shadow-lg"
          />
        ) : (
          <p className="text-[11px] font-black uppercase italic tracking-tight text-white truncate leading-tight">
            {movie.title}
          </p>
        )}
      </div>
      {movie.genres?.[0] && (
        <span className="flex-none text-[7px] font-black text-blue-400/80 uppercase tracking-widest truncate max-w-[52px] text-right">
          {movie.genres[0]}
        </span>
      )}
    </div>
  );
};

/* ====== Main SearchPage ====== */
const SearchPage = () => {
  const { backendUrl } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentMovies, setRecentMovies] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  // Cache: slug/imdb_id/title -> { title_logo, trailer_codes, language }
  const tmdbCache = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ── Fetch TMDB enrichment (logo + trailer + language) for a single DB movie ── */
  const enrichWithTmdb = useCallback(async (movie) => {
    const cacheKey = movie.slug || movie.imdb_id || movie.title;

    // Already fully enriched
    if (movie.title_logo && movie.trailer_codes && movie.language) return movie;

    // Return from cache if available
    if (tmdbCache.current[cacheKey] !== undefined) {
      const cached = tmdbCache.current[cacheKey];
      return {
        ...movie,
        title_logo: movie.title_logo || cached.title_logo || null,
        trailer_codes: movie.trailer_codes || cached.trailer_codes || null,
        trailer_key: movie.trailer_key || cached.trailer_codes || null,
        language: movie.language || cached.language || null,
      };
    }

    try {
      const params = movie.imdb_id
        ? { imdbId: movie.imdb_id }
        : { title: movie.title };
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params });
      if (res.data?.success) {
        const d = res.data.data;
        const enriched = {
          title_logo: d.title_logo_english || d.title_logo || null,
          trailer_codes: d.trailer_key_original_language || d.trailer_key || null,
          language: d.original_language ? [d.original_language] : null,
        };
        tmdbCache.current[cacheKey] = enriched;
        return {
          ...movie,
          title_logo: movie.title_logo || enriched.title_logo,
          trailer_codes: movie.trailer_codes || enriched.trailer_codes,
          trailer_key: movie.trailer_key || enriched.trailer_codes,
          language: movie.language || enriched.language,
        };
      }
    } catch (_) {}

    tmdbCache.current[cacheKey] = { title_logo: null, trailer_codes: null, language: null };
    return movie;
  }, [backendUrl]);

  /* ── Enrich a list in background, updating state as each resolves ── */
  const enrichListInBackground = useCallback((list, setter) => {
    list.forEach(async (movie) => {
      // Skip TMDB-only results (already fully enriched) and skip if nothing needed
      if (movie.isTmdbOnly) return;
      if (movie.title_logo && movie.trailer_codes && movie.language) return;

      const enriched = await enrichWithTmdb(movie);
      const changed =
        enriched.title_logo !== movie.title_logo ||
        enriched.trailer_codes !== movie.trailer_codes ||
        enriched.language !== movie.language;

      if (!changed) return;

      setter(prev => {
        const next = [...prev];
        const idx = next.findIndex(
          m => (m.slug && m.slug === enriched.slug) || (m.id && m.id === enriched.id)
        );
        if (idx !== -1) next[idx] = { ...next[idx], ...enriched };
        return next;
      });

      // Also patch selectedMovie live if it's the same
      setSelectedMovie(prev => {
        if (!prev) return prev;
        if ((prev.slug && prev.slug === enriched.slug) || (prev.id && prev.id === enriched.id)) {
          return { ...prev, ...enriched };
        }
        return prev;
      });
    });
  }, [enrichWithTmdb]);

  /* ── Initial load: recent movies ── */
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("watch_html")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(12);
        if (error) throw error;
        const list = data || [];
        setRecentMovies(list);
        enrichListInBackground(list, setRecentMovies);
      } catch (err) {
        console.error("Initial fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [enrichListInBackground]);

  /* ── Debounced search ── */
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.trim().length > 2) performUnifiedSearch(searchQuery);
      else setSearchResults([]);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const performUnifiedSearch = async (query) => {
    setIsSearching(true);
    try {
      const dbPromise = supabase
        .from("watch_html")
        .select("*")
        .ilike("title", `%${query}%`)
        .limit(12);

      const tmdbPromise = axios
        .get(`${backendUrl}/api/tmdb-details`, { params: { title: query } })
        .catch(() => null);

      const [dbResponse, tmdbResponse] = await Promise.all([dbPromise, tmdbPromise]);
      let finalResults = [...(dbResponse.data || [])];

      if (tmdbResponse?.data?.success) {
        const tmdb = tmdbResponse.data.data;
        const trailerKey = tmdb.trailer_key_original_language || tmdb.trailer_key || null;
        const titleLogo = tmdb.title_logo_english || tmdb.title_logo || null;

        const tmdbFormatted = {
          id: `tmdb-${tmdb.tmdb_id}`,
          title: tmdb.title,
          slug: tmdb.slug,
          poster: tmdb.poster_url,
          cover_poster: tmdb.cover_poster_url,
          description: tmdb.description,
          imdb_rating: tmdb.imdb_rating,
          year: tmdb.year,
          genres: tmdb.genres,
          language: [tmdb.original_language],
          title_logo: titleLogo,
          imdb_id: tmdb.imdb_id,
          tmdb_id: tmdb.tmdb_id,
          content_type: tmdb.content_type,
          episodes: tmdb.episodes || [],
          trailer_codes: trailerKey,
          trailer_key: trailerKey,
          isTmdbOnly: true,
        };

        // If the movie already exists in DB results, merge TMDB enrichment into it
        const existingIdx = finalResults.findIndex(
          (m) => m.title?.toLowerCase().trim() === tmdbFormatted.title?.toLowerCase().trim()
        );

        if (existingIdx !== -1) {
          // Patch the DB result with TMDB trailer + language + logo if missing
          finalResults[existingIdx] = {
            ...finalResults[existingIdx],
            title_logo: finalResults[existingIdx].title_logo || titleLogo,
            trailer_codes: finalResults[existingIdx].trailer_codes || trailerKey,
            trailer_key: finalResults[existingIdx].trailer_key || trailerKey,
            language: finalResults[existingIdx].language || [tmdb.original_language],
          };
          // Cache this so background enrichment also benefits
          const cacheKey = finalResults[existingIdx].slug || finalResults[existingIdx].imdb_id || finalResults[existingIdx].title;
          tmdbCache.current[cacheKey] = {
            title_logo: titleLogo,
            trailer_codes: trailerKey,
            language: [tmdb.original_language],
          };
        } else {
          finalResults.push(tmdbFormatted);
        }
      }

      setSearchResults(finalResults);

      // Background-enrich any remaining DB results that still lack trailer/language/logo
      enrichListInBackground(
        finalResults.filter(m => !m.isTmdbOnly),
        setSearchResults
      );
    } catch (err) {
      console.error("Unified search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMovieClick = (movie) => {
    if (selectedMovie?.id === movie.id || selectedMovie?.slug === movie.slug) {
      setSelectedMovie(null);
      return;
    }
    setSelectedMovie(movie);
  };

  const handleNavigate = (movie) => {
    saveRecentlyWatched(movie);
    navigate(`/watch/${movie.slug}`, { state: { movie } });
    setSelectedMovie(null);
  };

  const displayList = searchQuery ? searchResults : recentMovies;

  return (
    <div className="min-h-screen bg-[#0f1014] text-white p-4 md:p-8 pt-24">
      <Helmet><title>Cinema Search | 1Anchormovies</title></Helmet>

      {/* Search Input */}
      <div className="max-w-6xl mx-auto mb-10">
        <div className="relative group">
          <MagnifyingGlassIcon
            className={`absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 transition-colors ${
              isSearching ? "text-blue-500 animate-pulse" : "text-gray-500 group-focus-within:text-blue-500"
            }`}
          />
          <input
            autoFocus
            type="text"
            placeholder="Search our database and global library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-20 pl-16 pr-12 bg-[#16181f] border border-white/5 rounded-2xl text-2xl outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-gray-600 shadow-2xl"
          />
          {searchQuery && !isSearching && (
            <button
              onClick={() => { setSearchQuery(""); setSelectedMovie(null); }}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-black mb-8 px-2 border-l-4 border-blue-600 pl-4 uppercase tracking-[0.2em] flex items-center gap-3">
          {searchQuery
            ? <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />
            : <TrendingUp className="w-5 h-5 text-blue-500" />}
          {searchQuery ? "Unified Cinema Results" : "Recent Highlights"}
        </h2>

        {loading && !searchQuery ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-gray-400 font-mono text-[10px] uppercase tracking-[0.4em]">Syncing Engines</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {displayList.map((movie) => {
              const isActive =
                selectedMovie?.id === movie.id ||
                selectedMovie?.slug === movie.slug;

              return (
                <div
                  key={movie.id || movie.tmdb_id}
                  onClick={() => handleMovieClick(movie)}
                  className={`group relative rounded-2xl overflow-hidden bg-[#16181f] cursor-pointer transition-all duration-400 shadow-2xl
                    ${isActive
                      ? "border-2 border-blue-500 scale-[1.03] shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                      : "border border-white/5 hover:scale-[1.03] hover:border-blue-500/50"
                    }`}
                >
                  <div className="relative w-full overflow-hidden bg-gray-900" style={{ aspectRatio: "16/10" }}>
                    <img
                      src={movie.cover_poster || movie.poster || "/default-cover.jpg"}
                      alt={movie.title}
                      className={`w-full h-full object-cover transition-all duration-700 ${isActive ? "opacity-30" : "group-hover:opacity-35"}`}
                    />

                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="p-3 bg-blue-500 rounded-full shadow-2xl animate-pulse">
                          <Play size={18} fill="white" className="text-white" />
                        </div>
                      </div>
                    )}

                    {movie.isTmdbOnly && (
                      <div className="absolute top-2 right-2 bg-blue-600/85 backdrop-blur-md px-2 py-0.5 rounded-md text-[7px] font-black uppercase flex items-center gap-1 border border-blue-400/30 z-10">
                        <Globe size={7} /> Global
                      </div>
                    )}

                    <div className="hidden sm:flex absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent flex-col justify-end p-3 pointer-events-none z-20">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {movie.imdb_rating && (
                          <>
                            <div className="bg-[#f5c518] text-black px-1.5 rounded-[3px] font-black text-[8px]">IMDb</div>
                            <span className="text-[9px] font-black text-white">{movie.imdb_rating}</span>
                          </>
                        )}
                        {movie.content_type === "tv" && (
                          <div className="flex items-center gap-0.5 text-[8px] font-black text-yellow-400 uppercase ml-1">
                            <ListVideo size={9} /> TV
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="p-1.5 bg-white rounded-full text-black shadow-xl">
                          <Play size={9} fill="currentColor" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-tight">View Details</span>
                      </div>
                    </div>
                  </div>

                  <CardTitleStrip movie={movie} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Centered Modal */}
      {selectedMovie && !isMobile && (
        <DetailPanel
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onNavigate={handleNavigate}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
        />
      )}

      {/* Mobile Sheet */}
      {selectedMovie && isMobile && (
        <SearchMobileSheet
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onNavigate={handleNavigate}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
        />
      )}
    </div>
  );
};

export default SearchPage;