import React, { useEffect, useState, useRef, useMemo, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon, UserIcon } from "@heroicons/react/24/outline";
import { Helmet } from "react-helmet";
import { Loader2, Play, Share2, Plus, Heart, X, Clock3, TrendingUp, Star, Volume2, VolumeX, UserCircle, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import SearchPage from "./SearchPage";

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
              onMouseEnter={() => handleMouseEnter(movie.id)}
              onMouseLeave={handleMouseLeave}
              onClick={() => {
                if (window.innerWidth < 640) onSelect(movie);
                else { saveRecentlyWatched(movie); navigate(`/watch/${movie.slug}`); }
              }}
            >
              <div className="absolute -left-16 bottom-[-20px] z-0 select-none pointer-events-none">
                <span className="text-[180px] sm:text-[240px] font-black leading-none text-black transition-all duration-500 group-hover:text-blue-600/10" 
                      style={{ WebkitTextStroke: "3px rgba(255,255,255,0.5)", fontFamily: 'sans-serif' }}>
                  {index + 1}
                </span>
              </div>

              <div className="relative w-full h-full rounded-xl overflow-hidden bg-gray-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-blue-500">
                <img 
                  src={movie.cover_poster || movie.poster || "/default-cover.jpg"} 
                  alt={movie.title} 
                  className={`w-full h-full object-cover transition-opacity duration-1000 ${hoveredId === movie.id && showTrailer && movie.trailer_key ? "opacity-0" : "opacity-100"}`} 
                />
                
                {hoveredId === movie.id && showTrailer && movie.trailer_key && window.innerWidth >= 640 && (
                  <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full scale-[1.5] pointer-events-none">
                      <iframe
                        src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${movie.trailer_key}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay"
                      />
                    </div>
                    <div className="absolute top-3 left-3 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm">
                      <span className="text-[7px] font-black text-white/90 uppercase tracking-[0.2em]">Trailer</span>
                    </div>
                  </div>
                )}

                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end transition-opacity duration-300 pointer-events-none z-30">
                    <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
                        <div className="bg-[#f5c518] text-black px-1 rounded-[2px] font-black text-[7px] leading-none">IMDb</div>
                        <span className="text-[9px] font-black text-white">{movie.imdbRating || "7.2"}</span>
                    </div>
                    <div className="bg-blue-600/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-tighter">
                        {formatLanguageCount(movie.language)}
                    </div>
                </div>

                <div className="absolute inset-0 sm:opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent flex flex-col justify-end p-4 z-20">
                    {movie.title_logo ? (
                        <img src={movie.title_logo} className="h-8 w-auto object-contain mb-2 self-start drop-shadow-2xl" alt="" />
                    ) : (
                        <div className="text-sm font-black text-white mb-1 truncate uppercase italic drop-shadow-md">{movie.title || movie.slug}</div>
                    )}
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
  const [hoveredId, setHoveredId] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

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
              onMouseEnter={() => handleMouseEnter(movie.id)}
              onMouseLeave={handleMouseLeave}
              onClick={() => {
                if (window.innerWidth < 640) onSelect(movie);
                else { saveRecentlyWatched(movie); navigate(`/watch/${movie.slug}`); }
              }}
            >
              <img src={movie.poster || "/default-poster.jpg"} alt={movie.title} className={`absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity duration-300 ${hoveredId === movie.id ? 'opacity-0' : 'opacity-100'}`} />
              <img src={movie.cover_poster || movie.poster} alt={movie.title} className={`hidden sm:block absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity duration-500 ${hoveredId === movie.id && !showTrailer ? 'opacity-100' : 'opacity-0'}`} />

              {hoveredId === movie.id && showTrailer && movie.trailer_key && window.innerWidth >= 640 && (
                <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden rounded-xl">
                    <div className="w-full h-full scale-[1.6] pointer-events-none">
                      <iframe
                        src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${movie.trailer_key}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
                        className="w-full h-full"
                        frameBorder="0"
                      />
                    </div>
                    <div className="absolute top-3 left-3 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm">
                        <span className="text-[7px] font-black text-white/90 uppercase tracking-[0.2em]">Trailer</span>
                    </div>
                </div>
              )}

              <div className="hidden sm:flex absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent flex flex-col justify-end p-5 rounded-xl pointer-events-none group-hover:pointer-events-auto z-40">
                  {movie.title_logo ? (
                    <img src={movie.title_logo} className="h-10 w-auto object-contain mb-2 self-start" alt="" />
                  ) : (
                    <div className="text-sm font-black text-white mb-2 truncate uppercase">{movie.title || movie.slug}</div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 mb-2">
                    <span className="text-blue-400 uppercase font-black">{formatLanguageCount(movie.language)}</span>
                    {movie.certification && <span className="px-1.5 border border-white/40 rounded text-white bg-black/40">{movie.certification}</span>}
                  </div>
                  <p className="text-[9px] text-gray-300 line-clamp-2 mb-4 leading-relaxed italic">{movie.description}</p>
                  <button className="w-full py-2 bg-white text-black text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                    <Play className="w-3.5 h-3.5 fill-current" /> WATCH NOW
                  </button>
              </div>
            </div>
          ))}
        </div>
        {showRight && (
          <button onClick={() => scroll("right")} className="absolute right-[-10px] top-0 bottom-0 z-[60] flex items-center justify-center w-12 text-white bg-black/60 backdrop-blur-sm hover:bg-blue-600 transition-all rounded-l-xl opacity-0 group-hover/row:opacity-100">◀</button>
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
  const [session, setSession] = useState(null); 
  const [userLangs, setUserLangs] = useState([]); 
  const [showLangPopup, setShowLangPopup] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroMovies, setHeroMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [resumeRefresh, setResumeRefresh] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [heroTrailerActive, setHeroTrailerActive] = useState(false);
  const [infoVisible, setInfoVisible] = useState(true); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  const navigate = useNavigate();

  const langAssets = [
    { name: "Hindi", img: "/Hindi.webp" },
    { name: "English", img: "/English.webp" },
    { name: "Kannada", img: "/Kannada.webp" },
    { name: "Malayalam", img: "/Malayalam.webp" },
    { name: "Telugu", img: "/Telugu.webp" },
    { name: "Tamil", img: "/Tamil.webp" }
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      const langs = initialSession?.user?.user_metadata?.languages || [];
      setUserLangs(langs);
      
      if (initialSession?.user && !initialSession.user.user_metadata?.hasSelectedLanguage) {
        setShowLangPopup(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLangSelect = (name) => {
    setUserLangs(prev => 
      prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]
    );
  };

  const saveLanguages = async () => {
    if (userLangs.length === 0) return;
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          languages: userLangs,
          hasSelectedLanguage: true 
        }
      });
      if (error) throw error;
      setShowLangPopup(false);
    } catch (e) { console.error(e); }
  };

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
          
          const movieLangs = match?.language?.length ? (Array.isArray(match.language) ? match.language : [match.language]) : ["Unknown"];

          return {
            ...item,
            poster: item.poster || "/default-poster.jpg",
            cover_poster: item.cover_poster || item.poster || "/default-cover.jpg",
            language: movieLangs,
            categories: match?.categories || [],
            subCategory: match?.subCategory || null,
            description: match?.description || item.description || "",
            show_on_hero: item.show_on_hero || false,
            is_trending: item.is_trending || false,
            genres: item.genres || match?.categories || [], // 🚀 Ensuring genres are available
            trailer_key: item.trailer_codes || null
          };
        });

        setMovies(merged);
        const adminHero = merged.filter(m => m.show_on_hero === true).slice(0, 3);
        const others = merged.filter(m => !adminHero.some(a => a.id === m.id));
        const mixedExtra = others.sort(() => 0.5 - Math.random()).slice(0, 4);
        setHeroMovies([...adminHero, ...mixedExtra]);

        const manualTrending = merged.filter(m => m.is_trending === true).slice(0, 10);
        const autoTrending = merged.filter(m => !manualTrending.some(t => t.id === m.id)).slice(0, 10 - manualTrending.length);
        setTrendingMovies([...manualTrending, ...autoTrending]);

        enrichList(merged);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchMovies();
  }, [backendUrl]);

  const enrichList = async (list) => {
    const enriched = await Promise.all(list.map(async (m) => {
      if (m.genres?.length > 0 && m.trailer_codes) {
        return { ...m, tmdb_genres: m.genres, trailer_key: m.trailer_codes };
      }
      if (!m.imdb_id) return m;
      try {
        const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params: { imdbId: m.imdb_id } });
        if (res.data?.success) {
          const tmdb = res.data.data;
          const fetchedGenres = tmdb.genres || [];
          const fetchedTrailerCode = tmdb.trailer_key || null;
          await supabase.from("watch_html").update({ 
            genres: fetchedGenres, 
            imdb_rating: tmdb.imdb_rating,
            trailer_codes: fetchedTrailerCode 
          }).eq("slug", m.slug);
          return { ...m, certification: tmdb.certification || "", year: tmdb.year || "", tmdb_genres: fetchedGenres, imdbRating: tmdb.imdb_rating?.toFixed(1), runtime: tmdb.runtime, trailer_key: fetchedTrailerCode };
        }
      } catch (e) { console.warn("Sync failed for", m.title); }
      return m;
    }));
    setMovies(prev => {
      const map = new Map(prev.map(o => [o.slug, o]));
      enriched.forEach(e => map.set(e.slug, e));
      return Array.from(map.values());
    });
  };

  const relatedMovies = useMemo(() => {
    if (!selectedMovie) return [];
    const targetGenres = selectedMovie.tmdb_genres || selectedMovie.genres || selectedMovie.categories || [];
    const targetLangs = Array.isArray(selectedMovie.language) ? selectedMovie.language : [selectedMovie.language];
    return movies
      .filter(m => m.slug !== selectedMovie.slug)
      .filter(m => {
        const movieGenres = m.tmdb_genres || m.genres || m.categories || [];
        const movieLangs = Array.isArray(m.language) ? m.language : [m.language];
        return movieGenres.some(g => targetGenres.includes(g)) && movieLangs.some(l => targetLangs.includes(l));
      })
      .slice(0, 12);
  }, [selectedMovie, movies]);

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

  const groupedByBackendGenre = useMemo(() => {
    const query = search.toLowerCase().trim();
    let filteredList = !query ? movies : movies.filter((m) => [m.title, m.slug, m.description].join(" ").toLowerCase().includes(query));
    if (userLangs.length > 0) {
      filteredList = filteredList.filter(movie => movie.language.some(lang => userLangs.includes(lang)));
    }
    return filteredList.reduce((acc, movie) => {
      const genres = movie.tmdb_genres && movie.tmdb_genres.length > 0 ? movie.tmdb_genres : (movie.genres && movie.genres.length > 0 ? movie.genres : (movie.categories && movie.categories.length > 0 ? movie.categories : ["Others"]));
      genres.forEach((genre) => { if (!acc[genre]) acc[genre] = []; acc[genre].push(movie); });
      return acc;
    }, {});
  }, [movies, search, userLangs]); 

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      setScrolled(scrollPos > 50);
      if (scrollPos > 400) {
        setHeroTrailerActive(false);
        setInfoVisible(true);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (heroMovies.length === 0) return;
    setHeroTrailerActive(false);
    setInfoVisible(true);

    let slideTimer;
    let trailerTimer;
    let fadeTimer;
    const currentHero = heroMovies[currentSlide];

    if (isMobile) {
      slideTimer = setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % heroMovies.length);
      }, 5000);
    } else {
      if (!currentHero.trailer_key) {
        slideTimer = setTimeout(() => {
          setCurrentSlide((prev) => (prev + 1) % heroMovies.length);
        }, 5000);
      } else {
        trailerTimer = setTimeout(() => {
          if (window.scrollY < 400) setHeroTrailerActive(true);
        }, 2000);

        fadeTimer = setTimeout(() => {
          if (window.scrollY < 400) setInfoVisible(false);
        }, 7000); 

        slideTimer = setTimeout(() => {
          setCurrentSlide((prev) => (prev + 1) % heroMovies.length);
        }, 50000);
      }
    }

    return () => {
      clearTimeout(slideTimer);
      clearTimeout(trailerTimer);
      clearTimeout(fadeTimer);
    };
  }, [currentSlide, heroMovies, isMobile]);

  const getProfileInitial = () => {
    if (!session?.user) return "";
    const metaName = session.user.user_metadata?.full_name;
    if (metaName && metaName.trim() !== "") {
      return metaName.trim().charAt(0).toUpperCase();
    }
    return session.user.email.charAt(0).toUpperCase();
  };

  if (loading) return <div className="min-h-screen bg-black flex flex-col items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" /><p className="text-gray-400 font-mono tracking-widest uppercase text-[10px]">Global Database Sync</p></div>;

  return (
    <div className={`min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden ${selectedMovie || showLangPopup ? 'h-screen overflow-hidden' : ''}`}>
      <Helmet><title>Watchlist | 1Anchormovies</title></Helmet>

      {showLangPopup && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="w-full max-w-4xl p-8 animate-in zoom-in duration-500">
              <div className="text-center mb-12">
                 <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Choose Your Languages</h2>
                 <p className="text-gray-400 text-sm font-bold tracking-widest">PERSONALIZING YOUR CINEMATIC EXPERIENCE</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
                 {langAssets.map(lang => {
                    const isSelected = userLangs.includes(lang.name);
                    return (
                      <div 
                        key={lang.name}
                        onClick={() => handleLangSelect(lang.name)}
                        className={`relative aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 transform active:scale-95 group shadow-2xl ${isSelected ? 'ring-4 ring-blue-600 scale-105' : 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:scale-105'}`}
                      >
                         <img src={lang.img} className="w-full h-full object-cover" alt={lang.name} />
                         <div className={`absolute inset-0 transition-opacity duration-300 ${isSelected ? 'bg-blue-600/20' : 'bg-black/40'}`} />
                         
                         {isSelected && (
                           <div className="absolute top-3 right-3 bg-blue-600 p-1.5 rounded-full shadow-lg animate-in zoom-in">
                              <CheckCircle2 size={18} className="text-white" />
                           </div>
                         )}

                         <div className="absolute bottom-4 left-4">
                            <span className="text-lg font-black italic uppercase tracking-tighter drop-shadow-xl">{lang.name}</span>
                         </div>
                      </div>
                    );
                 })}
              </div>

              <div className="flex justify-center">
                 <button 
                  onClick={saveLanguages}
                  disabled={userLangs.length === 0}
                  className="px-16 py-4 bg-white text-black hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]"
                 >
                   Get Started
                 </button>
              </div>
           </div>
        </div>
      )}

      <header className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${scrolled || showSearch ? "bg-black/95 backdrop-blur-md shadow-2xl" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/"><img src="/logo_39.png" alt="Logo" className="h-9 sm:h-10" /></Link>
          
          <nav className={`hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest transition-opacity duration-1000 ${!infoVisible ? "opacity-40" : "opacity-100"}`}>
            <Link to="/" className="hover:text-blue-400 transition">Home</Link>
            <Link to="/latest" className="hover:text-blue-400 transition">Latest</Link>
            <Link to="/watchlist" className="text-blue-500 border-b-2 border-blue-500 pb-1">My Watchlist</Link>
          </nav>
          
          <div className="flex items-center gap-4">
            <button onClick={() => { setShowSearch(!showSearch); if(showSearch) setSearch(""); }} className="p-2 hover:bg-white/10 rounded-full transition">
              {showSearch ? <XMarkIcon className="w-6 h-6" /> : <MagnifyingGlassIcon className="w-6 h-6" />}
            </button>
            <Link to={session ? "/profile" : "/auth"} className={`group relative flex items-center justify-center transition-opacity duration-1000 ${!infoVisible ? "opacity-40" : "opacity-100"}`}>
              {session ? (
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white/20 overflow-hidden shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all group-hover:border-blue-400 group-hover:scale-105">
                   <span className="text-sm font-black text-white">{getProfileInitial()}</span>
                </div>
              ) : (
                <div className="p-2 text-gray-400 hover:text-white transition-all hover:scale-110">
                  <UserCircle className="w-7 h-7" />
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      {showSearch ? (
        <div className="pt-20">
            <SearchPage />
        </div>
      ) : (
        <>
          {/* 🎬 HERO SECTION */}
          {heroMovies.length > 0 && (
            <div className="relative h-[65vh] sm:h-[90vh] w-full overflow-hidden bg-black">
              {heroMovies.map((movie, idx) => (
                <div key={`${movie.slug}-${idx}`} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
                  <img src={movie.cover_poster} className={`w-full h-full object-cover brightness-[0.5] transition-opacity duration-1000 ${idx === currentSlide && heroTrailerActive && movie.trailer_key && !isMobile ? "sm:opacity-0" : "opacity-100"}`} alt="" />
                  
                  {idx === currentSlide && heroTrailerActive && movie.trailer_key && !isMobile && (
                    <div className="absolute inset-0 bg-black overflow-hidden">
                       <div className="relative w-full h-full scale-[1.35] pointer-events-none">
                        <iframe
                          src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${movie.trailer_key}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${window.location.origin}`}
                          title="Hero Trailer"
                          className="w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        ></iframe>
                      </div>
                      
                      <button 
                        onClick={(e) => { e.preventDefault(); setIsMuted(!isMuted); }}
                        className="absolute bottom-32 right-10 z-[40] p-3 bg-black/60 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md border border-white/10 transition-all shadow-2xl active:scale-90"
                      >
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                      </button>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent flex flex-col justify-end p-6 sm:p-20 z-20 pointer-events-none">
                    <div className="max-w-4xl space-y-4 sm:space-y-6 pointer-events-auto">
                      
                      {/* Info Stack - becomes transparent when trailer plays after 5s */}
                      <div className={`space-y-4 sm:space-y-6 transition-opacity duration-1000 ${!infoVisible ? "opacity-40" : "opacity-100"}`}>
                        {movie.title_logo ? (
                            <img src={movie.title_logo} className="h-12 sm:h-39 md:h-36 object-contain drop-shadow-2xl" alt="" />
                        ) : (
                            <h1 className="text-3xl sm:text-7xl font-black italic uppercase tracking-tighter drop-shadow-2xl leading-none">{movie.slug}</h1>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-[10px] sm:text-sm font-black text-gray-300">
                          <div className="flex items-center gap-1.5"><div className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[4px] font-black text-[10px] sm:text-[11px] shadow-lg">IMDb</div><span className="text-white drop-shadow-md">{movie.imdbRating || "7.5"}</span></div>
                          <span className="text-gray-300 drop-shadow-md font-black">{movie.year || "2024"}</span>
                          <span className="text-blue-400 uppercase tracking-widest drop-shadow-md font-black">{formatLanguageCount(movie.language)}</span>
                          {/* 🚀 NEW: Genres Display Section */}
                          {movie.genres && movie.genres.length > 0 && (
                            <span className="text-gray-400 font-bold uppercase tracking-widest border-l border-white/20 pl-4 hidden sm:block">
                              {movie.genres.join(" | ")}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 text-xs sm:text-lg line-clamp-2 sm:line-clamp-3 max-w-2xl font-medium italic drop-shadow-lg leading-relaxed">{movie.description}</p>
                      </div>

                      {/* Play Button - Remains solid and stays at the bottom */}
                      <Link to={`/watch/${movie.slug}`} className={`group w-full sm:w-fit px-8 py-3 sm:px-12 sm:py-4 bg-white text-black hover:bg-blue-600 hover:text-white rounded-xl sm:rounded-2xl font-black flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-lg uppercase tracking-widest`}>
                        <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-current" /> 
                        <span className="text-[11px] sm:text-base uppercase tracking-widest font-black">PLAY NOW</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              <div className="hidden sm:flex absolute bottom-10 left-10 z-20 items-center gap-2">
                {heroMovies.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentSlide(idx)} className={`transition-all duration-500 rounded-full h-1.5 ${idx === currentSlide ? "w-10 bg-blue-500 shadow-[0_0_10px_#3b82f6]" : "w-2 bg-white/30"}`} />
                ))}
              </div>
            </div>
          )}

          <main className={`relative z-20 pb-32 mt-4`}>
            {/* CONTINUE WATCHING */}
            {continueList.length > 0 && (
              <div className="mb-12 max-w-7xl mx-auto px-4 overflow-visible">
                <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2 uppercase tracking-widest px-2 font-black"><Clock3 className="w-5 h-5" /> CONTINUE WATCHING</h2>
                <div className="flex gap-6 overflow-x-auto pb-10 pt-4 scrollbar-hide px-2">
                  {continueList.map(({ movie, time }) => {
                    const progressPercent = Math.min(100, (time / (movie.runtime ? movie.runtime * 60 : 7200)) * 100);
                    return (
                      <div key={movie.slug} className="relative flex-none w-[260px] sm:w-[340px] cursor-pointer group/continue transition-all duration-300" onClick={() => navigate(`/watch/${movie.slug}`)}>
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl group-hover:scale-105 transition-all">
                          <img src={movie.cover_poster || movie.poster || "/default-cover.jpg"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={movie.title} />
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                            <div className="h-full bg-blue-600 shadow-[0_0_10px_#2563eb]" style={{ width: `${progressPercent}%` }} />
                          </div>
                        </div>
                        <div className="mt-3 px-1">
                          <h3 className="text-sm font-bold text-gray-200 truncate font-black">{movie.title || movie.slug}</h3>
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

            {Object.entries(groupedByBackendGenre).map(([genreName, list], index) => (
              <React.Fragment key={genreName}>
                <GenreRow title={genreName} movies={list} onSelect={(m) => setSelectedMovie(m)} />
                {index === 0 && <TrendingNumbersRow movies={trendingMovies} onSelect={(m) => setSelectedMovie(m)} />}
              </React.Fragment>
            ))}
          </main>
        </>
      )}

      {/* 🎬 CINEMATIC DETAIL OVERLAY */}
      {selectedMovie && (
        <div className="fixed inset-0 z-[200] bg-gray-950/98 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom duration-500" onClick={(e) => e.target === e.currentTarget && setSelectedMovie(null)}>
          <button onClick={() => setSelectedMovie(null)} className="absolute top-6 right-6 z-[210] p-3 bg-black/50 rounded-full text-white backdrop-blur-md active:scale-90 transition-transform"><X size={24} /></button>
          
          <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
            <div className="relative aspect-video w-full shadow-2xl bg-black overflow-hidden flex items-center justify-center">
              {selectedMovie.trailer_key ? (
                <>
                  <div className="relative w-full h-full scale-[1.3] pointer-events-none">
                    <iframe
                      src={`https://www.youtube.com/embed/${selectedMovie.trailer_key}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${selectedMovie.trailer_key}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${window.location.origin}`}
                      title="Trailer"
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    ></iframe>
                  </div>
                  
                  <div className="absolute top-4 left-4 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm shadow-lg pointer-events-none">
                    <span className="text-[8px] font-bold text-white/90 uppercase tracking-[0.2em]">Trailer</span>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="absolute bottom-10 right-6 z-[220] p-3 bg-black/60 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all border border-white/10 shadow-2xl active:scale-90"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </>
              ) : (
                <img src={selectedMovie.cover_poster || selectedMovie.poster} className="w-full h-full object-cover opacity-80" alt="" />
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="px-6 flex flex-col items-center text-center space-y-6 -mt-12 relative z-10">
              {selectedMovie.title_logo ? (
                <img src={selectedMovie.title_logo} className="h-16 w-auto object-contain drop-shadow-2xl mb-2" alt="" />
              ) : (
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl leading-none">{selectedMovie.title || selectedMovie.slug}</h3>
              )}

              <div className="flex items-center gap-4 text-xs font-black text-gray-400">
                <div className="flex items-center gap-1.5"><div className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[3px] font-black text-[9px] shadow-md">IMDb</div><span className="text-white">{selectedMovie.imdbRating || "7.5"}</span></div>
                <span>{selectedMovie.year || "2024"}</span>
                <span className="font-black text-blue-400 uppercase tracking-widest">{formatLanguageCount(selectedMovie.language)}</span>
              </div>

              <button onClick={() => { saveRecentlyWatched(selectedMovie); navigate(`/watch/${selectedMovie.slug}`); }} className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg uppercase tracking-widest font-black">
                <Play className="w-5 h-5 fill-current" /> WATCH NOW
              </button>

              <div className="flex flex-wrap justify-center gap-2">
                {(selectedMovie.tmdb_genres || selectedMovie.genres || []).map((g) => (
                  <span key={g} className="px-3 py-1 bg-gray-900 border border-white/5 rounded-full text-[9px] font-black uppercase text-gray-400 tracking-wider">{g}</span>
                ))}
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm italic opacity-80 font-medium">{selectedMovie.description}</p>

              {/* RELATED MOVIES SECTION */}
              {relatedMovies.length > 0 && (
                <div className="w-full pt-10 text-left border-t border-white/10 mt-8">
                  <h4 className="text-lg font-black text-white uppercase tracking-widest border-l-4 border-blue-600 pl-3">More Like This</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {relatedMovies.map((m) => (
                      <div key={m.id || m.slug} className="flex flex-col gap-2 group active:scale-95 transition-transform cursor-pointer" 
                        onClick={() => { 
                          setSelectedMovie(m); 
                          document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' }); 
                        }}>
                        <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/5 bg-gray-900 shadow-lg relative">
                          <img src={m.poster || "/default-poster.jpg"} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" alt="" />
                        </div>
                        <span className="text-[9px] font-black text-gray-400 truncate uppercase tracking-tighter">{m.title || m.slug}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="py-16 text-center border-t border-white/5 bg-black mt-20 opacity-40"><p className="text-[10px] font-mono tracking-[0.5em] uppercase font-black">© 1ANCHORMOVIES 2025</p></footer>
    </div>
  );
};

export default WatchListPage;