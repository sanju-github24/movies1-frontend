import React, { useEffect, useState, useRef, useMemo, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Helmet } from "react-helmet";
import { Loader2, Play, Share2, Plus, Heart, X, Clock3, TrendingUp, Star } from "lucide-react";
import axios from "axios";
import { AppContext } from "../context/AppContext";

/* ===== Helper: Save Recently Watched ===== */
const saveRecentlyWatched = (movie) => {
  if (!movie || !movie.slug) return;
  try {
    const existing = JSON.parse(localStorage.getItem("recently_watched") || "[]");
    const filtered = existing.filter((m) => m.slug !== movie.slug);
    const updated = [movie, ...filtered].slice(0, 10);
    localStorage.setItem("recently_watched", JSON.stringify(updated));
  } catch (e) { console.error(e); }
};

/* ===== STORAGE helpers for resume times ===== */
const STORAGE_PREFIX = "video_last_time_v1:";
const readAllResumeTimes = () => {
  const resumeMap = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(raw);
          const id = key.replace(STORAGE_PREFIX, "");
          resumeMap[id] = parsed;
        } catch (e) {}
      }
    }
  } catch (e) { console.warn("Resume read error:", e); }
  return resumeMap;
};

/* ====== Helper: Format Language Display ====== */
const formatLanguageCount = (langs) => {
  const langArray = Array.isArray(langs) ? langs : [langs];
  if (langArray.length <= 1) return langArray[0] || "Unknown";
  return `${langArray.length} Languages`;
};

/* ====== Component: Netflix-Style Trending Numbers Row ====== */
const TrendingNumbersRow = ({ movies, onSelect }) => {
  const rowRef = useRef(null);
  const navigate = useNavigate();

  return (
    <div className="mb-16 w-full max-w-7xl px-4 mx-auto overflow-visible">
      <h2 className="text-xl font-bold text-gray-200 mb-8 px-2 border-l-4 border-blue-600 pl-3 uppercase tracking-widest flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-500" /> Top 10 Today
      </h2>
      
      <div className="relative group/row">
        <div ref={rowRef} className="flex gap-24 overflow-x-auto scrollbar-hide scroll-smooth pb-14 pt-4 px-16">
          {movies.slice(0, 10).map((movie, index) => (
            <div
              key={movie.id}
              className="group relative flex-none w-64 sm:w-80 h-40 sm:h-48 cursor-pointer transition-all duration-500 ease-out sm:hover:scale-110 z-10"
              onClick={() => {
                if (window.innerWidth < 640) onSelect(movie);
                else { saveRecentlyWatched(movie); navigate(`/watch/${movie.slug}`); }
              }}
            >
              {/* Large Rank Number */}
              <div className="absolute -left-16 bottom-[-20px] z-0 select-none pointer-events-none">
                <span className="text-[180px] sm:text-[240px] font-black leading-none text-black transition-all duration-500 group-hover:text-blue-600/10" 
                      style={{ WebkitTextStroke: "3px rgba(255,255,255,0.5)", fontFamily: 'sans-serif' }}>
                  {index + 1}
                </span>
              </div>

              {/* Cover Poster Image Container */}
              <div className="relative w-full h-full rounded-xl overflow-hidden bg-gray-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-blue-500">
                <img 
                  src={movie.cover_poster || movie.poster || "/default-cover.jpg"} 
                  alt={movie.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                
                {/* Info Badges - Visible on Mobile, Hover on Desktop */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
                        <div className="bg-[#f5c518] text-black px-1 rounded-[2px] font-black text-[7px] leading-none">IMDb</div>
                        <span className="text-[9px] font-black text-white">{movie.imdbRating || "7.2"}</span>
                    </div>
                    <div className="bg-blue-600/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-tighter">
                        {formatLanguageCount(movie.language)}
                    </div>
                </div>

                {/* Hover UI Overlay */}
                <div className="absolute inset-0 sm:opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent flex flex-col justify-end p-4">
                    {movie.title_logo ? (
                        <img src={movie.title_logo} className="h-8 w-auto object-contain mb-2 self-start drop-shadow-2xl" alt="" />
                    ) : (
                        <div className="text-sm font-black text-white mb-1 truncate uppercase italic drop-shadow-md">{movie.title || movie.slug}</div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                        {(movie.tmdb_genres || movie.categories || []).slice(0, 2).map((g, i) => (
                           <span key={i} className="text-[8px] font-black text-gray-300 uppercase bg-white/10 px-1.5 rounded">{g}</span>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                       <Play className="w-4 h-4 text-white fill-current" />
                       <span className="text-[10px] font-black text-white uppercase tracking-tighter">Watch Now</span>
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ====== Dynamic Genre Row Component ====== */
const GenreRow = ({ title, movies, onSelect }) => {
  const rowRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const navigate = useNavigate();

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (dir) => {
    rowRef.current?.scrollBy({ left: dir === "left" ? -350 : 350, behavior: "smooth" });
  };

  useEffect(() => {
    checkScroll();
    const el = rowRef.current;
    el?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [movies]);

  return (
    <div className="mb-12 w-full max-w-7xl px-4 mx-auto overflow-visible">
      <h2 className="text-xl font-bold text-gray-200 mb-4 px-2 border-l-4 border-blue-600 pl-3 uppercase tracking-widest flex items-center gap-2">
        {title} <span className="text-[10px] text-gray-500 font-normal">({movies?.length || 0})</span>
      </h2>
      <div className="relative group/row">
        {showLeft && (
          <button onClick={() => scroll("left")} className="absolute left-[-10px] top-0 bottom-0 z-[60] flex items-center justify-center w-12 text-white bg-black/60 backdrop-blur-sm hover:bg-blue-600 transition-all rounded-r-xl opacity-0 group-hover/row:opacity-100">◀</button>
        )}
        <div ref={rowRef} className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-14 pt-4 px-2">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="group relative flex-none w-36 sm:w-52 h-52 sm:h-72 border border-white/5 rounded-xl cursor-pointer transition-all duration-500 ease-out hover:z-[70] sm:hover:scale-110 sm:hover:w-80 sm:hover:shadow-[0_20px_50px_rgba(0,0,0,1)] bg-gray-900"
              onClick={() => {
                if (window.innerWidth < 640) onSelect(movie);
                else { saveRecentlyWatched(movie); navigate(`/watch/${movie.slug}`); }
              }}
            >
              <img src={movie.poster || "/default-poster.jpg"} alt={movie.title} className="absolute inset-0 w-full h-full object-cover rounded-xl sm:group-hover:opacity-0 transition-opacity duration-300" />
              <img src={movie.cover_poster || movie.poster} alt={movie.title} className="hidden sm:block absolute inset-0 w-full h-full object-cover rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="hidden sm:flex absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent flex-col justify-end p-5 rounded-xl pointer-events-none group-hover:pointer-events-auto">
                  {movie.title_logo ? (
                    <img src={movie.title_logo} className="h-10 w-auto object-contain mb-2 self-start" alt="" />
                  ) : (
                    <div className="text-sm font-black text-white mb-2 truncate uppercase">{movie.title || movie.slug}</div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 mb-2">
                    <span className="text-blue-400 uppercase">{formatLanguageCount(movie.language)}</span>
                    {movie.certification && <span className="px-1.5 border border-gray-600 rounded text-gray-400">{movie.certification}</span>}
                  </div>
                  <p className="text-[10px] text-gray-400 line-clamp-2 mb-4 leading-relaxed font-medium">{movie.description}</p>
                  <button className="w-full py-2 bg-white text-black text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                    <Play className="w-3.5 h-3.5 fill-current" /> WATCH NOW
                  </button>
              </div>
            </div>
          ))}
        </div>
        {showRight && (
          <button onClick={() => scroll("right")} className="absolute right-[-10px] top-0 bottom-0 z-[60] flex items-center justify-center w-12 text-white bg-black/60 backdrop-blur-sm hover:bg-blue-600 transition-all rounded-l-xl opacity-0 group-hover/row:opacity-100">▶</button>
        )}
      </div>
    </div>
  );
};

/* ====== Main Page Component ====== */
const WatchListPage = () => {
  const { backendUrl } = useContext(AppContext);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroMovies, setHeroMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [resumeRefresh, setResumeRefresh] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const [watchRes, moviesRes] = await Promise.all([
          supabase.from("watch_html").select("*").order("created_at", { ascending: false }).limit(400),
          supabase.from("movies").select("slug, title, language, categories, subCategory, description"),
        ]);
        const merged = (watchRes.data || []).map((item) => {
          const match = (moviesRes.data || []).find((m) => m.slug === item.slug) ||
                        (moviesRes.data || []).find((m) => m.title?.toLowerCase() === item.title?.toLowerCase());
          return {
            ...item,
            poster: item.poster || "/default-poster.jpg",
            cover_poster: item.cover_poster || item.poster || "/default-cover.jpg",
            language: match?.language?.length ? (Array.isArray(match.language) ? match.language : [match.language]) : ["Unknown"],
            categories: match?.categories || [],
            subCategory: match?.subCategory || null,
            description: match?.description || item.description || "",
          };
        });
        setMovies(merged);
        enrichList(merged.slice(0, 100));
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchMovies();
  }, [backendUrl]);

  const enrichList = async (list) => {
    const enriched = await Promise.all(list.map(async (m) => {
      if (!m.imdb_id) return m;
      try {
        const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params: { imdbId: m.imdb_id } });
        if (res.data?.success) {
          const tmdb = res.data.data;
          return { 
            ...m, 
            certification: tmdb.certification || "", 
            year: tmdb.year || "", 
            tmdb_genres: tmdb.genres || null, 
            imdbRating: tmdb.imdb_rating?.toFixed(1) 
          };
        }
      } catch (e) {}
      return m;
    }));
    setMovies(prev => {
      const map = new Map(prev.map(o => [o.slug, o]));
      enriched.forEach(e => map.set(e.slug, e));
      return Array.from(map.values());
    });
  };

  useEffect(() => {
    if (movies.length === 0) return;
    const recent = [...movies].slice(0, 5);
    setHeroMovies(recent);
  }, [movies]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return movies;
    return movies.filter((m) => [m.title, m.slug, m.description].join(" ").toLowerCase().includes(query));
  }, [movies, search]);

  /* Logic to group by Backend Genres (extracted from API/DB) */
  const groupedByBackendGenre = useMemo(() => {
    return filtered.reduce((acc, movie) => {
      // Prioritize API genres, fallback to categories
      const genres = movie.tmdb_genres && movie.tmdb_genres.length > 0 
        ? movie.tmdb_genres 
        : (movie.categories && movie.categories.length > 0 ? movie.categories : ["Others"]);

      genres.forEach((genre) => {
        if (!acc[genre]) acc[genre] = [];
        acc[genre].push(movie);
      });
      return acc;
    }, {});
  }, [filtered]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const resumeMap = useMemo(() => {
    const raw = readAllResumeTimes();
    const mapped = {};
    Object.entries(raw).forEach(([id, value]) => {
      const found = movies.find(m => m.slug === id || m.video_url === id);
      if (found) mapped[found.slug] = { movie: found, time: value.time, updatedAt: value.updatedAt };
    });
    return mapped;
  }, [movies, resumeRefresh]);

  const continueList = useMemo(() =>
    Object.values(resumeMap).filter((r) => (r.time || 0) > 10).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  , [resumeMap]);

  const relatedMovies = useMemo(() => {
    if (!selectedMovie) return [];
    const targetGenres = selectedMovie.tmdb_genres || selectedMovie.categories || [];
    return movies
      .filter(m => m.slug !== selectedMovie.slug)
      .filter(m => {
        const movieGenres = m.tmdb_genres || m.categories || [];
        return movieGenres.some(genre => targetGenres.includes(genre));
      })
      .slice(0, 10);
  }, [selectedMovie, movies]);

  useEffect(() => {
    if (heroMovies.length === 0) return;
    const interval = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroMovies.length), 8000);
    return () => clearInterval(interval);
  }, [heroMovies]);

  if (loading) return <div className="min-h-screen bg-black flex flex-col items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" /><p className="text-gray-400 font-mono tracking-widest uppercase">Initializing</p></div>;

  return (
    <div className={`min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden ${selectedMovie ? 'h-screen overflow-hidden' : ''}`}>
      <Helmet><title>Watchlist | 1Anchormovies</title></Helmet>

      <header className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${scrolled || showSearch ? "bg-black/95 backdrop-blur-md shadow-2xl" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/"><img src="/logo_39.png" alt="Logo" className="h-9 sm:h-10" /></Link>
          <nav className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest">
            <Link to="/" className="hover:text-blue-400 transition">Home</Link>
            <Link to="/latest" className="hover:text-blue-400 transition">Latest</Link>
            <Link to="/watchlist" className="text-blue-500 border-b-2 border-blue-500 pb-1">My Watchlist</Link>
          </nav>
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 hover:bg-white/10 rounded-full transition">
            {showSearch ? <XMarkIcon className="w-6 h-6" /> : <MagnifyingGlassIcon className="w-6 h-6" />}
          </button>
        </div>
        {showSearch && (
          <div className="px-4 pb-4 max-w-4xl mx-auto animate-in slide-in-from-top duration-300">
            <input autoFocus type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full p-4 bg-gray-900 border border-blue-500/30 rounded-xl outline-none focus:border-blue-500" />
          </div>
        )}
      </header>

      {/* Hero Section */}
      {search === "" && heroMovies.length > 0 && (
        <div className="relative h-[65vh] sm:h-[85vh] w-full overflow-hidden bg-black">
          {heroMovies.map((movie, idx) => (
            <div 
              key={movie.slug} 
              className={`absolute inset-0 transition-all duration-[1500ms] ease-in-out transform ${
                idx === currentSlide 
                  ? "opacity-100 scale-100 z-10" 
                  : "opacity-0 scale-110 z-0"
              }`}
            >
              <img src={movie.cover_poster} className="w-full h-full object-cover brightness-[0.5] sm:brightness-[0.4]" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent flex flex-col justify-end p-6 sm:p-20">
                <div className="max-w-4xl space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                  {movie.title_logo ? (
                      <img src={movie.title_logo} className="h-12 sm:h-39 md:h-36 object-contain drop-shadow-2xl" alt="" />
                  ) : (
                      <h1 className="text-3xl sm:text-7xl font-black italic uppercase tracking-tighter drop-shadow-2xl leading-none">
                        {movie.slug || movie.slug}
                      </h1>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-sm font-black">
                    <div className="flex items-center gap-1.5">
                        <div className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[4px] font-black text-[10px] sm:text-[11px] leading-none shadow-lg">IMDb</div>
                        <span className="text-white drop-shadow-md">{movie.imdbRating || "7.5"}</span>
                    </div>
                    <span className="text-gray-300 drop-shadow-md">{movie.year || "2024"}</span>
                    <span className="text-blue-400 uppercase tracking-widest drop-shadow-md">{formatLanguageCount(movie.language)}</span>
                    <span className="hidden xs:inline text-gray-600">|</span>
                    <div className="flex flex-wrap gap-2">
                       {(movie.tmdb_genres || movie.categories || []).slice(0, 3).map((genre, i) => (
                          <span key={i} className="text-gray-200 uppercase tracking-tighter bg-white/5 px-2 py-0.5 rounded border border-white/5">{genre}</span>
                       ))}
                    </div>
                  </div>

                  <p className="text-gray-300 text-xs sm:text-lg line-clamp-2 sm:line-clamp-3 max-w-2xl font-medium italic drop-shadow-lg leading-relaxed">{movie.description}</p>

                  <Link to={`/watch/${movie.slug}`} className="group w-full sm:w-fit px-8 py-3 sm:px-12 sm:py-4 bg-white text-black hover:bg-blue-600 hover:text-white rounded-xl sm:rounded-2xl font-black flex items-center justify-center gap-2 sm:gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-2xl">
                    <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-current transition-colors" /> 
                    <span className="text-[11px] sm:text-base uppercase tracking-widest font-black">PLAY NOW</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
          <div className="hidden sm:flex absolute bottom-10 left-0 right-0 z-20 justify-center items-center gap-2">
            {heroMovies.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentSlide(idx)} className={`transition-all duration-500 rounded-full h-2 ${idx === currentSlide ? "w-12 bg-blue-500 shadow-[0_0_12px_#3b82f6]" : "w-3 bg-white/30 hover:bg-white/50"}`} />
            ))}
          </div>
        </div>
      )}

      <main className={`relative z-20 pb-32 ${search === "" ? "mt-4" : "pt-40"}`}>
        
        {/* ROW 1: Continue Watching */}
        {continueList.length > 0 && search === "" && (
          <div className="mb-12 max-w-7xl mx-auto px-4 overflow-visible">
            <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2 uppercase tracking-widest px-2">
              <Clock3 className="w-5 h-5" /> CONTINUE WATCHING
            </h2>
            <div className="flex gap-6 overflow-x-auto pb-10 pt-4 scrollbar-hide px-2">
              {continueList.map(({ movie, time }) => {
                const progressPercent = Math.min(100, (time / 7200) * 100);
                return (
                  <div key={movie.slug} className="relative flex-none w-[260px] sm:w-[340px] cursor-pointer group/continue transition-all duration-300" onClick={() => navigate(`/watch/${movie.slug}`)}>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl transition-all duration-500 group-hover/continue:border-blue-500 sm:group-hover:scale-105">
                      <img src={movie.cover_poster || movie.poster || "/default-cover.jpg"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={movie.title} />
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                        <div className="h-full bg-blue-600 shadow-[0_0_10px_#2563eb]" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                    <div className="mt-3 px-1">
                      <h3 className="text-sm font-bold text-gray-200 truncate">{movie.title || movie.slug}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-900/80 px-2 py-1 rounded-md border border-white/5 mt-1 w-fit">
                        <Clock3 className="w-3 h-3" /> {Math.floor(time / 60)}m watched
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Row Placement: TMDB Genres from API */}
        {search === "" && Object.entries(groupedByBackendGenre).map(([genreName, list], index) => (
          <React.Fragment key={genreName}>
            <GenreRow title={genreName} movies={list} onSelect={(m) => setSelectedMovie(m)} />
            {index === 0 && <TrendingNumbersRow movies={movies} onSelect={(m) => setSelectedMovie(m)} />}
          </React.Fragment>
        ))}

        {search !== "" && Object.entries(groupedByBackendGenre).map(([genreName, list]) => (
            <GenreRow title={genreName} movies={list} onSelect={(m) => setSelectedMovie(m)} />
        ))}
      </main>

      {/* MOBILE DETAIL OVERLAY */}
      {selectedMovie && (
        <div className="fixed inset-0 z-[200] bg-gray-950/98 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom duration-500" onClick={(e) => e.target === e.currentTarget && setSelectedMovie(null)}>
          <button onClick={() => setSelectedMovie(null)} className="absolute top-6 right-6 z-[210] p-3 bg-black/50 rounded-full text-white backdrop-blur-md active:scale-90 transition-transform"><X size={24} /></button>
          <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
            <div className="relative aspect-video w-full shadow-2xl">
              <img src={selectedMovie.cover_poster || selectedMovie.poster} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
            </div>
            <div className="px-6 flex flex-col items-center text-center space-y-6 -mt-12 relative z-10">
              {selectedMovie.title_logo ? <img src={selectedMovie.title_logo} className="h-20 w-auto object-contain drop-shadow-2xl mb-2" alt="" /> : <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl">{selectedMovie.title || selectedMovie.slug}</h3>}
              
              <div className="flex items-center gap-4 text-xs font-black text-gray-400">
                <div className="flex items-center gap-1.5">
                  <div className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[3px] font-black text-[9px] leading-none shadow-md">IMDb</div>
                  <span className="text-white">{selectedMovie.imdbRating || "7.5"}</span>
                </div>
                <span>{selectedMovie.year || "2024"}</span>
                <span className="px-1.5 py-0.5 border border-gray-600 rounded text-[10px] uppercase font-black text-gray-300">{selectedMovie.certification || "A"}</span>
                <span className="text-blue-400 uppercase tracking-widest">{formatLanguageCount(selectedMovie.language)}</span>
              </div>

              <button onClick={() => { saveRecentlyWatched(selectedMovie); navigate(`/watch/${selectedMovie.slug}`); }} className="w-full bg-white text-black py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] uppercase tracking-widest">
                <Play className="w-5 h-5 fill-current" /> WATCH NOW
              </button>

              <div className="flex flex-wrap justify-center gap-2">
                {(selectedMovie.tmdb_genres || selectedMovie.categories || []).map((g) => (
                  <span key={g} className="px-3 py-1 bg-gray-900 border border-white/5 rounded-full text-[9px] font-black uppercase text-gray-400 tracking-wider">{g}</span>
                ))}
              </div>

              <p className="text-gray-400 text-sm leading-relaxed max-w-sm italic opacity-80">{selectedMovie.description}</p>

              <div className="grid grid-cols-4 gap-6 w-full max-w-sm pt-4 border-b border-white/5 pb-8">
                <div className="flex flex-col items-center gap-2"><Plus className="w-5 h-5 text-gray-300" /><span className="text-[9px] uppercase font-bold text-gray-500">Watchlist</span></div>
                <div className="flex flex-col items-center gap-2"><Share2 className="w-5 h-5 text-gray-300" /><span className="text-[9px] uppercase font-bold text-gray-500">Share</span></div>
                <div className="flex flex-col items-center gap-2"><Loader2 className="w-5 h-5 text-gray-300" /><span className="text-[9px] uppercase font-bold text-gray-500">Download</span></div>
                <div className="flex flex-col items-center gap-2"><Heart className="w-5 h-5 text-gray-300" /><span className="text-[9px] uppercase font-bold text-gray-500">Rate</span></div>
              </div>

              {relatedMovies.length > 0 && (
                <div className="w-full pt-6 text-left">
                  <h4 className="text-lg font-bold text-gray-200 mb-4 px-2 uppercase tracking-widest border-l-4 border-blue-600 pl-3">More Like This</h4>
                  <div className="grid grid-cols-2 gap-4 px-2">
                    {relatedMovies.map(m => (
                      <div key={m.slug} onClick={() => { setSelectedMovie(m); document.querySelector('.overflow-y-auto').scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex flex-col gap-2 group active:scale-95 transition-transform">
                        <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/5 shadow-lg bg-gray-900">
                           <img src={m.poster} className="w-full h-full object-cover" alt="" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-tighter">{m.title || m.slug}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="py-16 text-center border-t border-white/5 bg-black mt-20 opacity-40"><p className="text-[10px] font-mono tracking-[0.5em] uppercase">© 1ANCHORMOVIES 2025</p></footer>
    </div>
  );
};

export default WatchListPage;