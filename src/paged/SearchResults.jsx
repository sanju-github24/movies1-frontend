// src/pages/SearchResults.jsx
import React, { useEffect, useState, useContext, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import Mp4Trailer from "../components/Mp4Trailer";
import { useMp4Trailer } from "../utils/useMp4Trailer";

// MX Player content worker (Cloudflare) — ?search= returns titles/posters from any IP.
// On click, the item's webUrl is resolved to a real stream by the backend's Playwright
// resolver (GET /api/mx/resolve?url=), which only yields a stream from a residential IP.
const MX_WORKER = "https://silent-scene-b9bb.sanjusanjay0444.workers.dev";
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
  Star,
} from "lucide-react";
import { LANDSCAPE_GRID, POSTER_SHELL } from "../utils/posterGrid";

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
  const [introDone, setIntroDone] = useState(false);
  const [mp4Live, setMp4Live] = useState(false);   // the MP4 is actually playing
  // Whatever the result came from — our library or TMDB — the IMDb trailer is
  // resolved from the ids it carries.
  const { trailerMp4, trailerPending } = useMp4Trailer(movie);

  useEffect(() => { setMp4Live(false); }, [trailerMp4]);

  useEffect(() => {
    setIntroDone(false);
    if (!movie) return;
    const t = setTimeout(() => setIntroDone(true), 1800);
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
  // The MP4 plays with no player chrome at all, so YouTube is only the fallback
  // — held back until the lookup comes back empty rather than starting first.
  const showTrailer = introDone && (!!trailerMp4 || (!trailerPending && !!trailerKey));

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
              showTrailer && (trailerMp4 ? mp4Live : true) ? "opacity-0" : "opacity-100"
            }`}
            alt=""
          />
          {showTrailer && (
            <div className={`absolute inset-0 overflow-hidden ${trailerMp4 && !mp4Live ? "" : "bg-black"}`}>
              <div className="relative w-full h-full scale-[1.25] pointer-events-none">
                {trailerMp4 ? (
                  <Mp4Trailer src={trailerMp4} muted={isMuted} loop onStart={() => setMp4Live(true)} />
                ) : (
                  <iframe
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${
                      isMuted ? 1 : 0
                    }&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="autoplay"
                  />
                )}
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
  const { trailerMp4, trailerPending } = useMp4Trailer(movie);
  if (!movie) return null;
  const trailerKey = movie.trailer_codes || movie.trailer_key;
  const showTrailer = !!trailerMp4 || (!trailerPending && !!trailerKey);

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
          {showTrailer ? (
            <>
              <div className="relative w-full h-full scale-[1.3] pointer-events-none">
                {trailerMp4 ? (
                  <>
                    <img src={movie.cover_poster || movie.poster} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    <Mp4Trailer src={trailerMp4} muted={isMuted} loop />
                  </>
                ) : (
                  <iframe
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${
                      isMuted ? 1 : 0
                    }&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                    title="Trailer"
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                )}
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
    if (item.source === "mxplayer") {
      const mx = item.mxData || {};
      return {
        title: item.title,
        slug: item.slug,
        poster: mx.poster || item.image,                       // portrait poster
        cover_poster: mx.banner || mx.thumb || item.thumb || item.image, // landscape backdrop
        year: item.year,
        meta: item.meta || "MX Player",
        source: "mxplayer",
        mxWebUrl: item.mxWebUrl || null,
        mxId: mx.id || null,
        mxType: mx.type || null,
        title_logo: mx.logo || null,                            // MX title logo
        preview: mx.preview || null,                            // MX hover-preview clip
        language: mx.languages || null,
        genres: mx.genres || null,
        description: mx.description || null,
      };
    }
    if (item.source === "tmdb" && item.movie) {
      return {
        ...item.movie,
        slug: item.slug,
        cover_poster: item.movie.cover_poster || item.image,
        poster: item.movie.poster || item.image,
        source: "tmdb",
        mxWebUrl: item.mxWebUrl || null,
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
      mxWebUrl: item.mxWebUrl || null,
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
        if (item.source === "tmdb" || item.source === "mxplayer") return;
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

      // --- 2.5 MX Player (free/ad-supported) — movie + series results ---
      // Search metadata works from any IP; the real stream is resolved on click
      // by the backend Playwright resolver using the item's webUrl.
      try {
        const mxRes = await axios.get(`${MX_WORKER}/`, { params: { search: query.trim() } });
        const mxItems = (mxRes.data?.sections || []).flatMap((s) => s.items || []);
        mxItems
          .filter((it) => it && it.title && it.webUrl && (it.type === "movie" || it.type === "tvshow"))
          .forEach((it) => {
            const titleKey = it.title.toLowerCase().trim();
            if (!resultsMap.has(titleKey)) {
              const seasonMeta = it.type === "tvshow"
                ? (it.seasons ? `MX Player · ${it.seasons} Season${it.seasons > 1 ? "s" : ""}` : "MX Player · Series")
                : "MX Player";
              resultsMap.set(titleKey, {
                id: `mx-${it.id}`,
                title: it.title,
                slug: `mx-${it.id}`,
                type: "streaming",
                image: it.poster || it.thumb || "/default-cover.jpg", // portrait poster (card)
                thumb: it.thumb || it.banner || it.poster || null,     // landscape thumbnail (backdrop)
                link: null,
                meta: seasonMeta,
                year: it.year || "",
                source: "mxplayer",
                mxWebUrl: it.webUrl,
                mxData: it,
              });
            } else {
              // Same title already found via library/TMDB — attach the MX URL so it
              // shows up as an "MX Player" server on the watch page (nothing missing).
              const ex = resultsMap.get(titleKey);
              if (ex && !ex.mxWebUrl) ex.mxWebUrl = it.webUrl;
            }
          });
      } catch (e) {
        console.warn("MX Player search unavailable");
      }

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
    // MX Player results open the in-SPA MX watch page (movie player or episodes),
    // which resolves the real stream on the backend and plays via the native player.
    if (movie.source === "mxplayer" && (movie.mxWebUrl || movie.mxId)) {
      setSelectedMovie(null);
      navigate("/mx-watch", { state: { webUrl: movie.mxWebUrl, mxId: movie.mxId, mxType: movie.mxType, title: movie.title, image: movie.poster || movie.cover_poster } });
      return;
    }

    if (movie.source === "tmdb") {
      // Pure TMDB pick → pass the TMDB payload. WatchPage's attachLocalHls still
      // surfaces AnchorHD if we've uploaded this title.
      const payload = movie.tmdbPayload || {
        tmdb_id: movie.tmdb_id || (typeof movie.id === "string" ? movie.id.replace(/^tmdb[-_]/, "") : movie.id),
        imdb_id: movie.imdb_id || null,
        title: movie.title,
        slug: movie.slug,
        poster: movie.poster,
        cover_poster: movie.cover_poster,
        description: movie.description,
        year: movie.year,
        imdb_rating: movie.imdb_rating || movie.imdbRating,
        content_type: movie.content_type,
        first_air_date: movie.first_air_date || null,
        release_date: movie.release_date || null,
        episodes: movie.episodes || [],
        cast: movie.cast || [],
        genres: movie.genres || [],
        title_logo: movie.title_logo || null,
        trailer_key: movie.trailer_key || movie.trailer_codes || null,
      };
      navigate(`/watch/${movie.slug}`, { state: { movie: { ...payload, source: "tmdb", mxWebUrl: movie.mxWebUrl || null } } });
    } else {
      // Our DB movie/series → pass ALL our fields (hls_url, direct_url, episodes,
      // title_logo, genres, slug…) so AnchorHD + our metadata show. WatchPage then
      // enriches the episode list from TMDB (posters/thumbnails) like a direct visit.
      navigate(`/watch/${movie.slug}`, { state: { movie } });
    }
    setSelectedMovie(null);
  };

  /* Refining in place. The page had no field of its own: to change a query you
     had to go back to the rail, open the search overlay and start again. */
  const [draft, setDraft] = useState(prettyQuery);
  useEffect(() => { setDraft(prettyQuery); }, [prettyQuery]);
  const submitSearch = (e) => {
    e.preventDefault();
    const q = draft.trim();
    if (q) navigate(`/search?query=${encodeURIComponent(q)}`);
  };

  const chip = (on) =>
    `px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border transition-colors duration-200
     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
      on ? "bg-white text-black border-white"
         : "bg-white/[0.04] text-gray-300 border-white/10 hover:bg-white/[0.1] hover:text-white"}`;

  return (
    <div className="min-h-dvh bg-gray-950 text-white px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-10 pb-24">
      <Helmet>
        <title>{prettyQuery ? `${prettyQuery} — search` : "Search"} | AnchorMovies</title>
      </Helmet>

      <div className={`${POSTER_SHELL} mb-8`}>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tighter italic">
          Search
        </h1>

        {/* The field carries the current query, so refining is editing what is
            already there rather than retyping it. */}
        <form onSubmit={submitSearch} className="mt-5 max-w-2xl">
          <div className="flex items-center gap-3 bg-white/[0.04] ring-1 ring-white/10 rounded-xl px-4 py-3
                          focus-within:ring-blue-500 transition-shadow">
            <Search className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search movies, series, or paste an IMDb / TMDB id"
              aria-label="Search"
              className="bg-transparent outline-none w-full text-sm font-bold placeholder:text-gray-600"
            />
            <button type="submit"
              className="shrink-0 bg-white text-black text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg
                         hover:bg-gray-200 transition-colors">
              Go
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-600">
            An IMDb id (tt1234567) or TMDB id (603) jumps straight to that title.
          </p>
        </form>

        {/* What you are looking at, and how much of it. */}
        {query && (
          <p className="mt-6 text-sm text-gray-400">
            {loading
              ? <>Searching for <span className="text-white font-bold">&ldquo;{prettyQuery}&rdquo;</span>…</>
              : <><span className="text-white font-bold">{results.length}</span>{" "}
                  {results.length === 1 ? "result" : "results"} for{" "}
                  <span className="text-white font-bold">&ldquo;{prettyQuery}&rdquo;</span></>}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-4" role="group" aria-label="Filter results">
          {SEARCH_TYPES.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setSearchType(value)}
              aria-pressed={searchType === value} className={chip(searchType === value)}>
              {label}
            </button>
          ))}
          <span className="w-px h-5 bg-white/10 mx-1" aria-hidden="true" />
          {SEARCH_LANGS.map(({ code, label }) => (
            <button key={code || "all"} type="button" onClick={() => setSearchLang(code)}
              aria-pressed={searchLang === code} className={chip(searchLang === code)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={POSTER_SHELL}>
        {loading ? (
          /* Skeletons in the shape of the cards, rather than a spinner over an
             empty screen — the page keeps its layout while results land. */
          <div className={LANDSCAPE_GRID}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden ring-1 ring-white/[0.06] bg-white/[0.02]">
                <div className="w-full shimmer" style={{ aspectRatio: "16/10" }} />
                <div className="p-3"><div className="h-3 w-2/3 rounded-full shimmer" /></div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className={LANDSCAPE_GRID}>
            {results.map((item) => {
              const movie = item.fullData || item.movie || {};
              const isActive = selectedMovie?.slug === item.slug;

              return (
                <article
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className={`group relative rounded-2xl overflow-hidden bg-white/[0.03] cursor-pointer
                              transition-all duration-300 hover:-translate-y-1 motion-reduce:transform-none
                              hover:shadow-2xl hover:shadow-black/60 ring-1 ${
                    isActive ? "ring-blue-500" : "ring-white/[0.06] hover:ring-white/25"}`}
                >
                  <div className="relative w-full overflow-hidden bg-gray-900" style={{ aspectRatio: "16/10" }}>
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500
                                 group-hover:scale-105 motion-reduce:transform-none"
                    />

                    {/* A scrim carrying the overlay, rather than fading the
                        artwork to a third of its opacity to make room for it. */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {item.source === "tmdb" && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 z-10
                                       bg-black/70 backdrop-blur-md text-gray-200 border border-white/10
                                       px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide">
                        <Globe className="w-2.5 h-2.5" aria-hidden="true" /> Global
                      </span>
                    )}

                    <div className="hidden sm:flex absolute inset-x-0 bottom-0 p-3 items-center gap-2 z-20
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 bg-white text-black
                                       px-3 py-1.5 rounded-lg text-[11px] font-black">
                        <Play className="w-3 h-3 fill-current" aria-hidden="true" /> Details
                      </span>
                      {movie.imdb_rating && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300">
                          <Star className="w-3 h-3 fill-current" aria-hidden="true" />{movie.imdb_rating}
                        </span>
                      )}
                      {movie.content_type === "tv" && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Series</span>
                      )}
                    </div>
                  </div>

                  <CardTitleStrip movie={{ title: item.title, title_logo: movie.title_logo, genres: movie.genres }} />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-24 text-center">
            <Search className="w-10 h-10 text-gray-700 mx-auto mb-4" aria-hidden="true" />
            <p className="text-gray-300 font-black uppercase tracking-widest text-xs">
              {query ? <>Nothing found for &ldquo;{prettyQuery}&rdquo;</> : "Search the catalogue"}
            </p>
            <p className="text-gray-500 text-[12px] mt-2 max-w-sm mx-auto leading-relaxed">
              {query
                ? "Check the spelling, try a shorter phrase, or clear the filters above."
                : "Type a title above. You can also paste an IMDb or TMDB id."}
            </p>
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
