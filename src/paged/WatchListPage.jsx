import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Navbar from "../components/Navbar"; // if you still want mobile hamburger

/* ====== Language Row (swipe + arrows) ====== */
const LanguageRow = ({ language, movies }) => {
  const rowRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const navigate = useNavigate();

  // Swipe handling
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (dir) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({
        left: dir === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > 50) {
      if (distance > 0) scroll("right");
      else scroll("left");
    }
  };

  useEffect(() => {
    if (!rowRef.current) return;
    checkScroll();
    rowRef.current.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      rowRef.current?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  return (
    <div className="mb-10 w-full">
      <h2 className="text-xl font-semibold text-blue-300 mb-4 border-b border-gray-700 pb-2">
        {language}
      </h2>

      <div className="relative group">
        {/* Left Arrow */}
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="hidden sm:flex absolute left-0 top-0 bottom-0 z-20 items-center justify-center w-10 bg-gradient-to-r from-black/80 to-transparent hover:from-black/90 transition"
          >
            ◀
          </button>
        )}

        {/* Movies Row */}
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
              className="flex-none w-40 sm:w-48 md:w-56 border border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition duration-200 bg-gray-900 hover:bg-gray-800 cursor-pointer"
              onClick={() => navigate(`/watch/${movie.slug}`)}
            >
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-56 object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/default-poster.jpg";
                }}
              />
              <div className="p-2 text-center font-medium">
                <div className="text-sm text-white truncate">{movie.title}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
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

        {/* Right Arrow */}
        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="hidden sm:flex absolute right-0 top-0 bottom-0 z-20 items-center justify-center w-10 bg-gradient-to-l from-black/80 to-transparent hover:from-black/90 transition"
          >
            ▶
          </button>
        )}
      </div>
    </div>
  );
};

/* ====== Watch List Page ====== */
const WatchListPage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRef = useRef(null);

  /* Fetch Movies */
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const { data: watchData, error: watchError } = await supabase
          .from("watch_html")
          .select("id, title, slug, poster, cover_poster, created_at")
          .order("created_at", { ascending: false });

        if (watchError) throw new Error(watchError.message);

        const { data: moviesData, error: moviesError } = await supabase
          .from("movies")
          .select("title, language, categories, subCategory");

        if (moviesError) throw new Error(moviesError.message);

        const moviesWithMeta = watchData.map((item) => {
          const match = moviesData?.find(
            (m) =>
              m.title.trim().toLowerCase() === item.title.trim().toLowerCase()
          );

          return {
            id: item.id,
            slug: item.slug,
            title: item.title,
            poster: item.poster || "/default-poster.jpg",
            cover_poster: item.cover_poster || null,
            created_at: item.created_at,
            language: match?.language || ["Unknown"],
            categories: match?.categories || [],
            subCategory: match?.subCategory || [],
          };
        });

        setMovies(moviesWithMeta);
      } catch (err) {
        console.error("Fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  /* Filter + Group */
  const filtered = movies.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const groupedByLanguage = filtered.reduce((acc, movie) => {
    const langs = Array.isArray(movie.language)
      ? movie.language
      : [movie.language || "Unknown"];
    langs.forEach((lang) => {
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(movie);
    });
    return acc;
  }, {});

  const latestMovies = filtered.slice(0, 5);

  /* Auto Slide Hero */
  useEffect(() => {
    if (latestMovies.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % latestMovies.length);
      if (slideRef.current) {
        slideRef.current.scrollTo({
          left:
            slideRef.current.clientWidth *
            ((currentSlide + 1) % latestMovies.length),
          behavior: "smooth",
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [latestMovies, currentSlide]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ✅ Top Navbar (instead of sidebar) */}
      <header className="sticky top-0 z-50 bg-black/90 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo_39.png" alt="Logo" className="h-10" />
          </Link>

          {/* Center: Nav Links */}
          <nav className="hidden sm:flex gap-6 text-sm font-medium">
            <Link to="/" className="hover:text-blue-400 transition">Home</Link>
            <Link to="/latest" className="hover:text-blue-400 transition">Latest</Link>
            <Link to="/blogs" className="hover:text-blue-400 transition">Blogs</Link>
            <Link to="/watchlist" className="hover:text-blue-400 transition">My Watchlist</Link>
          </nav>

          {/* Right: Search toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80"
          >
            {showSearch ? (
              <XMarkIcon className="w-6 h-6 text-white" />
            ) : (
              <MagnifyingGlassIcon className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Expanded search */}
        {showSearch && (
          <div className="px-4 pb-3 max-w-3xl mx-auto">
            <input
              type="text"
              placeholder="🔍 Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/70 border border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-400"
            />
          </div>
        )}
      </header>

      {/* Hero Section */}
{!loading && latestMovies.filter((m) => m.cover_poster).length > 0 && (
  <div className="relative w-full overflow-hidden bg-black">
    <div className="relative w-full h-[45vh] sm:h-[75vh] flex justify-center items-center">
      {latestMovies
        .filter((movie) => movie.cover_poster)
        .map((movie, idx) => (
          <div
            key={movie.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              idx === currentSlide
                ? "opacity-100 z-20 pointer-events-auto"
                : "opacity-0 z-10 pointer-events-none"
            }`}
          >
            <img
              src={movie.cover_poster}
              alt={movie.title || "Movie Cover"}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover brightness-75 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.src = "/default-cover.jpg";
              }}
            />

            {/* Overlay Content */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end sm:justify-end md:justify-center p-4 sm:p-12">
              <p className="text-white text-lg sm:text-xl font-bold mb-2 line-clamp-1">
                {movie.slug}
              </p>
              {movie.language?.length > 0 && (
                <p className="text-gray-400 text-xs sm:text-sm mb-3">
                  {movie.language.join(" • ")}
                </p>
              )}
              <Link
                to={`/watch/${movie.slug}`}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm md:text-base font-semibold rounded w-fit"
              >
                ▶ Watch Now
              </Link>
            </div>
          </div>
        ))}
    </div>

    {/* Dots */}
    <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
      {latestMovies.map((_, idx) => (
        <span
          key={idx}
          className={`w-2 h-2 rounded-full ${
            idx === currentSlide ? "bg-white" : "bg-gray-500"
          }`}
        />
      ))}
    </div>
  </div>
)}


      {/* Movies grouped by Language */}
      <div className="p-6 flex flex-col items-center">
        {loading ? (
          <p className="text-center">⏳ Loading...</p>
        ) : Object.keys(groupedByLanguage).length === 0 ? (
          <p className="text-center text-gray-400">No movies found.</p>
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
