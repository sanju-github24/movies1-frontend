import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Helmet } from "react-helmet";
// ✅ IMPORTED Loader2 for loading animation
import { Loader2 } from "lucide-react"; 

/* ====== Language Row Component (UNCHANGED) ====== */
const LanguageRow = ({ language, movies, overlay }) => {
  // ... (LanguageRow component code is unchanged)
  const rowRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    // Check if scrolling is needed and possible
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (dir) => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  const handleTouchStart = (e) => (touchStartX.current = e.touches[0].clientX);
  const handleTouchMove = (e) => (touchEndX.current = e.touches[0].clientX);
  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > 50) scroll(distance > 0 ? "right" : "left");
  };

  useEffect(() => {
    checkScroll();
    // Add scroll event listener to update arrow visibility
    rowRef.current?.addEventListener("scroll", checkScroll); 
    window.addEventListener("resize", checkScroll);
    return () => {
      rowRef.current?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [movies]); // Re-run effect when movies change

  return (
    <div className="mb-10 w-full">
      <h2 className="text-xl font-semibold text-blue-300 mb-4 border-b border-gray-700 pb-2">
        {language}
      </h2>
      <div className="relative group">
        
        {/* === DESKTOP SCROLL LEFT ARROW === */}
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="hidden sm:flex absolute left-0 top-0 bottom-0 z-20 items-center justify-center w-10 bg-gradient-to-r from-black/80 to-transparent hover:from-black/90 transition"
          >
            ◀
          </button>
        )}
        
        {/* === MOBILE SCROLL LEFT ARROW (NEW) === */}
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="sm:hidden absolute left-0 top-0 bottom-0 z-10 items-center justify-center w-8 text-white text-xl bg-black/40 hover:bg-black/60 transition rounded-l-lg ml-1 h-56 my-auto"
            style={{ height: '224px' }} // Explicitly match h-56
          >
            ◀
          </button>
        )}

        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-3"
          style={{ WebkitOverflowScrolling: "touch" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="relative flex-none w-40 sm:w-48 md:w-56 border border-gray-700 rounded-lg overflow-hidden hover:shadow-lg bg-gray-900 hover:bg-gray-800 cursor-pointer transform transition-transform duration-300 hover:scale-110 hover:z-20"
              onClick={() => {
                saveRecentlyWatched(movie);
                navigate(`/watch/${movie.slug}`);
              }}
            >
              {movie.subCategory?.length > 0 && (
                <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                  {Array.isArray(movie.subCategory)
                    ? movie.subCategory[0]
                    : movie.subCategory}
                </span>
              )}

              <img
                src={movie.poster}
                alt={movie.title}
                loading="lazy"
                className="w-full h-56 object-cover"
                onError={(e) => (e.currentTarget.src = "/default-poster.jpg")}
              />
              <div className="p-2 text-center font-medium">
                <div className="text-sm text-white truncate">{movie.title}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveRecentlyWatched(movie);
                    navigate(`/watch/${movie.slug}`);
                  }}
                  className="inline-block mt-2 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded"
                >
                  ▶ Watch
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* === DESKTOP SCROLL RIGHT ARROW === */}
        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="hidden sm:flex absolute right-0 top-0 bottom-0 z-20 items-center justify-center w-10 bg-gradient-to-l from-black/80 to-transparent hover:from-black/90 transition"
          >
            ▶
          </button>
        )}
        
        {/* === MOBILE SCROLL RIGHT ARROW (NEW) === */}
        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="sm:hidden absolute right-0 top-0 bottom-0 z-10 items-center justify-center w-8 text-white text-xl bg-black/40 hover:bg-black/60 transition rounded-r-lg mr-1 h-56 my-auto"
            style={{ height: '224px' }} // Explicitly match h-56
          >
            ▶
          </button>
        )}
        
      </div>
    </div>
  );
};

/* ===== Helper: Save Recently Watched (UNCHANGED) ===== */
const saveRecentlyWatched = (movie) => {
  const existing = JSON.parse(localStorage.getItem("recently_watched") || "[]");
  const filtered = existing.filter((m) => m.slug !== movie.slug);
  const updated = [movie, ...filtered].slice(0, 10);
  localStorage.setItem("recently_watched", JSON.stringify(updated));
};


/* ====== Watch List Page Component ====== */
const WatchListPage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [recommended, setRecommended] = useState([]);
  const latestMovieTimer = useRef(null);
  const [lastWatchedTitle, setLastWatchedTitle] = useState("");
  const [heroMovies, setHeroMovies] = useState([]);
  const [scrolled, setScrolled] = useState(false); 


  /* ===== Fetch Movies (UNCHANGED) ===== */
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const [watchRes, moviesRes] = await Promise.all([
          supabase
            .from("watch_html")
            .select(
              "id, title, slug, poster, cover_poster, video_url, created_at, title_logo"
            )
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("movies")
            .select("slug, title, language, categories, subCategory, description"),
        ]);

        if (watchRes.error) throw new Error(watchRes.error.message);
        if (moviesRes.error) throw new Error(moviesRes.error.message);

        const moviesData = moviesRes.data || [];
        const merged = watchRes.data.map((item) => {
          const match =
            moviesData.find((m) => m.slug === item.slug) ||
            moviesData.find(
              (m) => m.title?.toLowerCase() === item.title?.toLowerCase()
            );

          return {
            id: item.id,
            slug: item.slug,
            title: item.title,
            poster: item.poster || "/default-poster.jpg",
            cover_poster: item.cover_poster || "/default-cover.jpg",
            video_url: item.video_url || "",
            created_at: item.created_at,
            title_logo: item.title_logo || "",
            language: match?.language?.length ? match.language : ["Unknown"],
            categories: match?.categories || [],
            subCategory: match?.subCategory || [],
            description: match?.description || "",
          };
        });

        setMovies(merged);
      } catch (err) {
        console.error("Fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  useEffect(() => {
  if (movies.length === 0) return;

  const today = new Date().toISOString().split("T")[0];
  const lastVisit = localStorage.getItem("last_visit_date");

  // Default: Recently uploaded
  let heroSelection = [...movies].slice(0, 5);

  if (lastVisit === today) {
    // User already visited today → mix in some random older movies
    const olderMovies = [...movies].slice(5, 50); // get older ones
    const randomPicks = olderMovies
      .sort(() => 0.5 - Math.random())
      .slice(0, 2); // 2 random movies
    heroSelection = [...heroSelection.slice(0, 3), ...randomPicks];
  } else {
    // First visit today → store visit date
    localStorage.setItem("last_visit_date", today);
  }

  setHeroMovies(heroSelection);
}, [movies]);

  
  /* ===== Load Recommendations (UNCHANGED) ===== */
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recently_watched") || "[]");

    if (stored.length > 0) {
      const last = stored[0];
      setLastWatchedTitle(last.slug || "a movie");

      const related = movies.filter(
        (m) =>
          m.language?.[0] === last.language?.[0] ||
          m.categories?.[0] === last.categories?.[0]
      );
      setRecommended(
        related.filter((m) => m.slug !== last.slug).slice(0, 10)
      );
    }
  }, [movies]);

  

  /* ===== Filter & Group Movies (UNCHANGED) ===== */
  const filtered = useMemo(
    () =>
      movies.filter((m) =>
        m.title.toLowerCase().includes(search.toLowerCase())
      ),
    [movies, search]
  );

  const groupedByLanguage = useMemo(() => {
    return filtered.reduce((acc, movie) => {
      const langs = Array.isArray(movie.language)
        ? movie.language
        : typeof movie.language === "string"
        ? movie.language.split(/[,|]/).map((l) => l.trim())
        : ["Unknown"];
      langs.forEach((lang) => {
        const cleanLang = lang || "Unknown";
        if (!acc[cleanLang]) acc[cleanLang] = [];
        acc[cleanLang].push(movie);
      });
      return acc;
    }, {});
  }, [filtered]);

 const latestMovies = heroMovies;


  /* ===== Auto-Slide Effect (UNCHANGED) ===== */
useEffect(() => {
  if (latestMovies.length === 0) return;

  const interval = setInterval(() => {
    setCurrentSlide((prev) => (prev + 1) % latestMovies.length);
  }, 6000); // 6000ms = 6 seconds

  return () => clearInterval(interval); // Cleanup on unmount
}, [latestMovies]);


  // Handle Scroll to toggle navbar background (UNCHANGED)
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50; // Threshold of 50px
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  // ✅ LOADING ANIMATION COMPONENT
  if (loading) {
      return (
          <div className="min-h-screen bg-gray-950 flex items-center justify-center transition-all duration-500">
              <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
                  <p className="mt-4 text-lg text-gray-300">Fetching latest movies...</p>
              </div>
          </div>
      );
  }


  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* SEO (UNCHANGED) */}
      <Helmet>
        <title>Watch Movies Online | 1TamilMV - Latest & Trending</title>
        <meta
          name="description"
          content="Watch the latest movies online in HD. Explore trending movies in Tamil, Telugu, Kannada, Malayalam, and Hindi on 1TamilMV. Fast streaming and download."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.1anchormovies.live/watchlist" />
      </Helmet>

{/* ===== Transparent Navbar (Main Header UNCHANGED) ===== */}
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-gray-950 shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo_39.png" alt="Logo" className="h-10" />
          </Link>

          <nav className="hidden sm:flex gap-6 text-sm font-medium text-white drop-shadow-lg">
            <Link to="/" className="hover:text-blue-400 transition">Home</Link>
            <Link to="/latest" className="hover:text-blue-400 transition">Latest</Link>
            <Link to="/blogs" className="hover:text-blue-400 transition">Blogs</Link>
            <Link to="/watchlist" className="hover:text-blue-400 transition text-blue-400">My Watchlist</Link>
          </nav>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-full bg-transparent"
          >
            {showSearch ? (
              <XMarkIcon className="w-6 h-6 text-white" />
            ) : (
              <MagnifyingGlassIcon className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* ===== Search Input Container (UPDATED) ===== */}
        {showSearch && (
          <div 
            className={`px-4 pb-3 max-w-3xl mx-auto transition-all duration-300 ${
              scrolled ? 'bg-gray-950' : 'bg-transparent' // Apply background dynamically
            }`}
          >
            <input
              type="text"
              placeholder="🔍 Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              // Ensure input itself remains background-transparent so the container's background shows through
              className="w-full px-0 py-2 border-b border-gray-500 focus:border-blue-500 bg-transparent text-white placeholder-gray-300 outline-none"
            />
          </div>
        )}
      </header>

{/* ===== Hero Slider (MODIFIED: HIDDEN IF SEARCH IS ACTIVE) ===== */}
      {!loading && latestMovies.length > 0 && search === "" && ( // <--- KEY CHANGE: search === ""
        <div className="relative w-full overflow-hidden mt-[-60px] sm:mt-[-64px]"> 
          <div className="relative w-full h-[60vh] sm:h-[75vh] flex justify-center items-center">
            {latestMovies.map((movie, idx) => {
              const isActive = idx === currentSlide;
              return (
                <div
                  key={movie.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    isActive
                      ? "opacity-100 z-20 pointer-events-auto"
                      : "opacity-0 z-10 pointer-events-none"
                  }`}
                >
                  {/* Cover Poster - MODIFIED object-position for mobile */}
                  <img
                    src={movie.cover_poster}
                    alt={movie.title || "Movie Cover"}
                    className="w-full h-full object-cover brightness-75 object-position-right sm:object-center"
                    onError={(e) => (e.currentTarget.src = "/default-cover.jpg")}
                  />

                  {/* Mobile Gradient Overlay (ADDED for Contrast) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent sm:hidden" />


                  {/* Desktop Overlay Info */}
                  <div className="hidden sm:flex absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent items-center p-10">
                    <div className="max-w-2xl flex flex-col gap-3">
                      {/* Title Logo or Fallback */}
                      {movie.title_logo ? (
                        <img
                          src={movie.title_logo}
                          alt={`${movie.title} Logo`}
                          className="w-[260px] sm:w-[420px] object-contain drop-shadow-lg mb-3"
                        />
                      ) : (
                        <h2 className="text-white text-4xl font-extrabold drop-shadow-lg">
                          {movie.slug}
                        </h2>
                      )}

                      {/* Language Badges */}
                      {movie.language?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {movie.language.map((lang, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 bg-black/50 rounded-lg text-base font-medium text-gray-100 shadow-sm"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Description */}
                      {movie.description && (
                        <p className="text-gray-300 text-base leading-relaxed">
                          {movie.description}
                        </p>
                      )}

                      {/* Watch Button */}
                      <Link
                        to={`/watch/${movie.slug}`}
                        className="inline-flex w-max px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-md shadow-md"
                      >
                        ▶ Watch
                      </Link>
                    </div>
                  </div>
            {/* ====== MOBILE VIEW (UNCHANGED) ====== */}
            <div className="sm:hidden absolute inset-0 flex flex-col justify-end items-center pb-24 z-30">
              
              {/* Title Logo */}
              {movie.title_logo ? (
                <img
                  src={movie.title_logo}
                  alt={`${movie.title_logo} Logo`}
                  className="w-64 object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)] mb-4" 
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <h2 className="text-white text-3xl font-extrabold drop-shadow-lg text-center w-full px-4 mb-4">
                  {movie.slug}
                </h2>
              )}
              
              {/* Language tags */}
              {movie.language?.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mb-6"> 
                  {movie.language.map((lang, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-black/70 rounded-md text-xs font-medium text-gray-100 shadow-md"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              )}

              {/* Watch Button */}
              <Link
                to={`/watch/${movie.slug}`}
                className="inline-flex w-max px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-md shadow-md" 
              >
                ▶ Watch
              </Link>
            </div>
          </div>
        );
      })}
    </div>

    {/* Slider Dots */}
    <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
      {latestMovies.map((_, idx) => (
        <button
          key={idx}
          onClick={() => setCurrentSlide(idx)}
          className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none ${
            idx === currentSlide
              ? "w-6 bg-white"
              : "w-2 bg-gray-500 hover:bg-gray-400"
          }`}
        />
      ))}
    </div>
  </div>
)}


{/* ===== Recommended Because You Watched (MODIFIED: HIDDEN IF SEARCH IS ACTIVE) ===== */}
      {recommended.length > 0 && search === "" && ( // <--- KEY CHANGE: search === ""
        <div className="p-6 flex flex-col items-center">
          <LanguageRow
            language={`🎬 Because you watched: ${lastWatchedTitle}`}
            movies={recommended}
          />
        </div>
      )}

{/* ===== Movies by Language / Search Results (UPDATED: Added Search Heading) ===== */}
      {/* Apply opacity transition to the main content area for a smooth load-in effect */}
      <div className={`p-6 flex flex-col items-center transition-opacity duration-500 ${!loading ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* ✅ ADDED: Clear Search Heading */}
        {search !== "" && (
            <h2 className="text-2xl font-bold text-blue-400 mb-6 w-full max-w-7xl px-4 text-left">
                Search Results for: "{search}"
            </h2>
        )}
        
        {Object.keys(groupedByLanguage).length === 0 ? (
          <p className="text-center text-gray-400">
            {/* Improved No Results message */}
            {search === "" 
             ? "No movies found." 
             : `No movies found matching "${search}".`} 
          </p>
        ) : (
          Object.entries(groupedByLanguage).map(([language, movies]) => (
            <LanguageRow key={language} language={language} movies={movies} />
          ))
        )}
      </div>
    </div>
  );
};

export default WatchListPage;