// src/pages/SearchResults.jsx
import React, { useEffect, useState, useContext, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import {
  Loader2,
  Search,
  Play,
  X,
  Globe,
  ListVideo,
  Volume2,
  VolumeX,
  ChevronLeft,
} from "lucide-react";

/* ====== Helpers ====== */
const generateSlug = (title) => {
  return title
    ?.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with -
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing dashes
};

const capitalizeWords = (str) =>
  str
    ?.split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "";

const formatLanguageCount = (langs) => {
  const langArray = Array.isArray(langs) ? langs : [langs];
  if (langArray.filter(Boolean).length <= 1) return langArray[0] || "Unknown";
  return `${langArray.length} Languages`;
};

const saveRecentlyWatched = (movie) => {
  if (!movie || !movie.slug) return;
  try {
    const existing = JSON.parse(localStorage.getItem("recently_watched") || "[]");
    const filtered = existing.filter((m) => m.slug !== movie.slug);
    localStorage.setItem("recently_watched", JSON.stringify([movie, ...filtered].slice(0, 10)));
  } catch (e) {
    console.error(e);
  }
};

/* ── Advanced search: filters + ID detection ── */
const SEARCH_LANGS = [
  { code: "", label: "All Languages" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" },
  { code: "hi", label: "Hindi" },
  { code: "en", label: "English" },
];
const SEARCH_TYPES = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "Series" },
];
const LANG_DISPLAY_MAP = { ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", hi: "Hindi", en: "English" };
const IMDB_ID_RE = /^tt\d{5,}$/i;
const TMDB_ID_RE = /^\d{2,}$/;

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
    if (!movie) {
      setShowTrailer(false);
      return;
    }
    setShowTrailer(false);
    const t = setTimeout(() => setShowTrailer(true), 1800);
    return () => clearTimeout(t);
  }, [movie?.slug]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!movie) return null;
  const trailerKey = movie.trailer_codes || movie.trailer_key;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0d0e14] border border-white/8 shadow-[0_0_100px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-300 scrollbar-hide">
        {/* Hero */}
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          <img
            src={movie.cover_poster || movie.poster || "/default-cover.jpg"}
            className={`w-full h-full object-cover transition-opacity duration-1000 ${
              showTrailer && trailerKey ? "opacity-0" : "opacity-100"
            }`}
            alt=""
          />
          {showTrailer && trailerKey && (
            <div className="absolute inset-0 bg-black overflow-hidden">
              <div className="relative w-full h-full scale-[1.25] pointer-events-none">
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${
                    isMuted ? 1 : 0
                  }&controls=0&loop=1&playlist=${trailerKey}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="autoplay"
                />
              </div>
              <div className="absolute top-4 left-4 z-30 px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-md">
                <span className="text-[8px] font-black text-white/90 uppercase tracking-[0.3em]">Trailer</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
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

          {movie.source === "tmdb" && (
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
                  <span key={g} className="px-3 py-1 bg-gray-900 border border-white/5 rounded-full text-[9px] font-black uppercase text-gray-400 tracking-wider">
                    {g}
                  </span>
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
const MobileSheet = ({ movie, onClose, onNavigate, isMuted, setIsMuted }) => {
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
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${
                    isMuted ? 1 : 0
                  }&controls=0&loop=1&playlist=${trailerKey}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="absolute bottom-4 right-5 z-[220] p-3 bg-black/70 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all border border-white/10 shadow-2xl active:scale-90"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </>
          ) : (
            <img src={movie.cover_poster || movie.poster} className="w-full h-full object-cover" alt="" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent pointer-events-none" />
          {movie.source === "tmdb" && (
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
                <span key={g} className="px-3 py-1 bg-gray-900 border border-white/5 rounded-full text-[9px] font-black uppercase text-gray-400 tracking-wider">
                  {g}
                </span>
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
          <p className="text-[11px] font-black uppercase italic tracking-tight text-white truncate leading-tight">{movie.title}</p>
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

/* ====== Main SearchResults Page ====== */
const SearchResults = () => {
  const { backendUrl } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("query")?.toLowerCase() || "";
  const prettyQuery = capitalizeWords(query);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState("all");   // all | movie | tv
  const [searchLang, setSearchLang] = useState("");      // "" = all languages
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const tmdbCache = useRef({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ── Build a "movie" shaped object for the detail panel from a result card ── */
  const toMovieShape = useCallback((item) => {
    if (item.source === "tmdb" && item.movie) {
      return {
        ...item.movie,
        slug: item.slug,
        cover_poster: item.movie.cover_poster || item.image,
        poster: item.movie.poster || item.image,
        source: "tmdb",
      };
    }
    return {
      ...item.fullData,
      title: item.title,
      slug: item.slug,
      poster: item.fullData?.poster || item.image,
      cover_poster: item.fullData?.cover_poster || item.fullData?.poster || item.image,
      year: item.year,
      meta: item.meta,
      source: "local",
    };
  }, []);

  /* ── Background enrichment with TMDB logo/trailer/language for local results ── */
  const enrichWithTmdb = useCallback(
    async (movie) => {
      const cacheKey = movie.slug || movie.imdb_id || movie.title;
      if (movie.title_logo && movie.trailer_codes && movie.language) return movie;

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
        const params = movie.imdb_id ? { imdbId: movie.imdb_id } : { title: movie.title };
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
    },
    [backendUrl]
  );

  const enrichListInBackground = useCallback(
    (list, setter) => {
      list.forEach(async (item) => {
        if (item.source === "tmdb") return;
        const movie = item.fullData || {};
        if (movie.title_logo && movie.trailer_codes && movie.language) return;

        const enriched = await enrichWithTmdb({ ...movie, title: item.title, slug: item.slug });

        setter((prev) =>
          prev.map((p) => {
            if (p.id !== item.id) return p;
            return {
              ...p,
              fullData: { ...p.fullData, ...enriched },
            };
          })
        );

        setSelectedMovie((prev) => {
          if (!prev) return prev;
          if (prev.slug === item.slug) return { ...prev, ...enriched };
          return prev;
        });
      });
    },
    [enrichWithTmdb]
  );

  const fetchResults = async () => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const isImdbId = IMDB_ID_RE.test(query.trim());
      const isTmdbId = TMDB_ID_RE.test(query.trim());

      const [moviesRes, watchRes] = await Promise.all([
        supabase.from("movies").select("*"),
        supabase.from("watch_html").select("*"),
      ]);

      const resultsMap = new Map();

      // Narrow local results by the chosen type/language where those fields exist
      const matchesFilters = (m) => {
        if (searchType !== "all" && m.content_type && m.content_type !== searchType) return false;
        if (searchLang) {
          const langs = (Array.isArray(m.language) ? m.language : [m.language]).filter(Boolean);
          const target = LANG_DISPLAY_MAP[searchLang];
          if (langs.length > 0 && !langs.includes(target) && !langs.includes(searchLang)) return false;
        }
        return true;
      };

      // --- 1. Local Streaming Results (watch_html) ---
      (watchRes.data || [])
        .filter((w) => w.title?.toLowerCase().includes(query) && matchesFilters(w))
        .forEach((w) => {
          const titleKey = w.title.toLowerCase().trim();
          const safeSlug = w.slug || generateSlug(w.title);
          resultsMap.set(titleKey, {
            id: w.id,
            title: w.title,
            slug: safeSlug,
            type: "streaming",
            image: w.cover_poster || w.poster || "/default-cover.jpg",
            link: `/watch/${safeSlug}`,
            meta: "Library Stream",
            year: w.year || "2025",
            source: "local",
            fullData: w,
          });
        });

      // --- 2. Local Download Results (movies) ---
      (moviesRes.data || [])
        .filter((m) => m.title?.toLowerCase().includes(query) && matchesFilters(m))
        .forEach((m) => {
          const titleKey = m.title.toLowerCase().trim();
          if (!resultsMap.has(titleKey)) {
            const safeSlug = m.slug || generateSlug(m.title);
            resultsMap.set(titleKey, {
              id: m.id,
              title: m.title,
              slug: safeSlug,
              type: "download",
              image: m.poster || "/default-poster.jpg",
              link: `/movie/${safeSlug}`,
              meta: m.language?.[0] || "HD Rip",
              source: "local",
              fullData: m,
            });
          }
        });

      // --- 3. TMDB API Fallback & Discovery ---
      try {
        let tmdbList = [];
        if (isImdbId || isTmdbId) {
          // Exact lookup by IMDb ID (tt…) or TMDB ID (numeric)
          const params = isImdbId
            ? { imdbId: query.trim() }
            : { tmdbId: query.trim(), contentType: searchType === "all" ? undefined : searchType };
          const tmdbRes = await axios.get(`${backendUrl}/api/tmdb-details`, { params });
          if (tmdbRes.data.success) {
            tmdbList = Array.isArray(tmdbRes.data.data) ? tmdbRes.data.data : [tmdbRes.data.data];
          }
        } else {
          // Multi-result search, honouring the type + language filters
          const tmdbRes = await axios.get(`${backendUrl}/api/tmdb-search`, {
            params: {
              query: query.trim(),
              type: searchType === "all" ? "multi" : searchType,
              lang: searchLang || undefined,
            },
          });
          if (tmdbRes.data.success) tmdbList = tmdbRes.data.results || [];
        }

        {
          tmdbList.forEach((t) => {
            const movieTitle = t.title || t.name || "";
            const titleKey = movieTitle.toLowerCase().trim();

            if (!resultsMap.has(titleKey) && titleKey !== "") {
              const tmdbSlug = generateSlug(movieTitle) || t.id;

              const mappedMovie = {
                tmdb_id: t.tmdb_id || t.id,
                imdb_id: t.imdb_id || null,
                title: movieTitle,
                slug: tmdbSlug,
                poster: t.poster_url || `https://image.tmdb.org/t/p/w500${t.poster_path}`,
                cover_poster: t.cover_poster_url || `https://image.tmdb.org/t/p/original${t.backdrop_path || t.poster_path}`,
                description: t.description || t.overview,
                year: t.year || t.release_date?.split("-")[0] || t.first_air_date?.split("-")[0],
                imdb_rating: t.imdb_rating || t.vote_average?.toFixed(1),
                content_type: t.content_type || (t.first_air_date ? "tv" : "movie"),
                episodes: t.episodes || [],
                cast: t.cast || [],
                genres: t.genres || [],
                title_logo: t.title_logo_english || t.title_logo || null,
                trailer_codes: t.trailer_key_original_language || t.trailer_key || null,
                trailer_key: t.trailer_key_original_language || t.trailer_key || null,
                language: t.language_display
                  ? [t.language_display]
                  : t.original_language
                    ? [LANG_DISPLAY_MAP[t.original_language] || t.original_language]
                    : null,
              };

              resultsMap.set(titleKey, {
                id: t.id,
                title: movieTitle,
                slug: tmdbSlug,
                type: "streaming",
                image: mappedMovie.cover_poster,
                link: `/watch/${tmdbSlug}`,
                meta: "Global Node",
                year: mappedMovie.year || "Global",
                source: "tmdb",
                movie: mappedMovie,
              });
            }
          });
        }
      } catch (e) {
        console.warn("TMDB Discovery Linkage Failed");
      }

      const finalResults = Array.from(resultsMap.values());
      setResults(finalResults);
      enrichListInBackground(finalResults, setResults);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchType, searchLang]);

  const handleCardClick = (item) => {
    const shaped = toMovieShape(item);
    if (selectedMovie?.slug === shaped.slug) {
      setSelectedMovie(null);
      return;
    }
    setSelectedMovie(shaped);
  };

  const handleNavigate = (movie) => {
    saveRecentlyWatched(movie);
    navigate(`/watch/${movie.slug}`, { state: { movie } });
    setSelectedMovie(null);
  };

  return (
    <div className="min-h-screen bg-[#0f1014] text-white pb-20 pt-24 px-4 md:px-8">
      <Helmet>
        <title>Discovery: {prettyQuery} | AnchorMovies</title>
      </Helmet>

      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex items-center gap-2 text-blue-500 mb-2">
          <Globe className="animate-pulse" size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Discovery active</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter italic">
          Search Results <span className="text-blue-500">"{prettyQuery}"</span>
        </h1>

        {/* ── Type + Language filters ── */}
        <div className="flex flex-wrap items-center gap-2 mt-6">
          {SEARCH_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSearchType(value)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                searchType === value
                  ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  : "bg-[#16181f] border-white/10 text-gray-400 hover:border-blue-500/50 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="w-px h-5 bg-white/10 mx-1" />
          {SEARCH_LANGS.map(({ code, label }) => (
            <button
              key={code || "all"}
              onClick={() => setSearchLang(code)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                searchLang === code
                  ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  : "bg-[#16181f] border-white/10 text-gray-400 hover:border-blue-500/50 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
          Tip: paste an IMDb ID (tt1234567) or TMDB ID (603) for an exact match
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-gray-400 font-mono text-[10px] uppercase tracking-[0.4em]">Syncing Local &amp; Global Streams</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {results.map((item) => {
              const movie = item.fullData || item.movie || {};
              const isActive = selectedMovie?.slug === item.slug;

              return (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className={`group relative rounded-2xl overflow-hidden bg-[#16181f] cursor-pointer transition-all duration-400 shadow-2xl
                    ${
                      isActive
                        ? "border-2 border-blue-500 scale-[1.03] shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                        : "border border-white/5 hover:scale-[1.03] hover:border-blue-500/50"
                    }`}
                >
                  <div className="relative w-full overflow-hidden bg-gray-900" style={{ aspectRatio: "16/10" }}>
                    <img
                      src={item.image}
                      alt={item.title}
                      className={`w-full h-full object-cover transition-all duration-700 ${
                        isActive ? "opacity-30" : "group-hover:opacity-35"
                      }`}
                    />

                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="p-3 bg-blue-500 rounded-full shadow-2xl animate-pulse">
                          <Play size={18} fill="white" className="text-white" />
                        </div>
                      </div>
                    )}

                    {item.source === "tmdb" && (
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

                  <CardTitleStrip movie={{ title: item.title, title_logo: movie.title_logo, genres: movie.genres }} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-24 text-center bg-gray-900/20 rounded-[3rem] border border-dashed border-gray-800 animate-in fade-in duration-700">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-800" />
            <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest italic">Node Not Found</h2>
            <p className="text-gray-600 text-sm mt-2 font-medium">Try searching for keywords like "Tamil", "2025", or a specific TMDB ID.</p>
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
        <MobileSheet
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

export default SearchResults;
