import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Navbar from "../components/Navbar";

const WatchListPage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRef = useRef(null);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
  
      try {
        // 1. Fetch watch_html data (✅ include slug + cover_poster)
        const { data: watchData, error: watchError } = await supabase
          .from("watch_html")
          .select("id, title, slug, poster, cover_poster, created_at")
          .order("created_at", { ascending: false });
  
        if (watchError) {
          console.error("Watch HTML fetch error:", watchError.message);
          setLoading(false);
          return;
        }
  
        // 2. Fetch movies table (enrich with meta info)
        const { data: moviesData, error: moviesError } = await supabase
          .from("movies")
          .select("title, language, categories, subCategory");
  
        if (moviesError) {
          console.error("Movies fetch error:", moviesError.message);
        }
  
        // 3. Merge data by title
        const moviesWithMeta = watchData.map((item) => {
          const match = moviesData?.find(
            (m) =>
              m.title.trim().toLowerCase() === item.title.trim().toLowerCase()
          );
  
          return {
            id: item.id,
            slug: item.slug, // ✅ keep slug from watch_html
            title: item.title,
            poster: item.poster || "/default-poster.jpg",
            cover_poster: item.cover_poster || null, // ✅ hero section will use this
            created_at: item.created_at,
            language: match?.language || "Unknown",
            categories: match?.categories || [],
            subCategory: match?.subCategory || [],
          };
        });
  
        setMovies(moviesWithMeta);
      } catch (err) {
        console.error("Unexpected fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchMovies();
  }, []);
  
  
  const filtered = movies.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const groupedByLanguage = filtered.reduce((acc, movie) => {
  const langs = movie.language
    ? Array.isArray(movie.language)
      ? movie.language
      : [movie.language]
    : ["Unknown"];
  langs.forEach((lang) => {
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(movie);
  });
  return acc;
}, {});

  const latestMovies = filtered.slice(0, 5);

  useEffect(() => {
    if (latestMovies.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % latestMovies.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [latestMovies]);

  useEffect(() => {
    if (slideRef.current) {
      slideRef.current.scrollTo({
        left: currentSlide * slideRef.current.offsetWidth,
        behavior: "smooth",
      });
    }
  }, [currentSlide]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Desktop Navbar */}
      <div className="hidden sm:flex w-full bg-blue-700 text-white px-4 py-1.5 items-center justify-between sticky top-0 z-50 shadow">
        <Link to="/" className="shrink-0">
          <img
            src="/logo_3.png"
            alt="Logo"
            className="w-16 md:w-20 object-contain"
          />
        </Link>
        <ul className="flex gap-3 text-xs font-medium">
          <li>
            <Link
              to="/"
              className="hover:underline hover:text-blue-300 transition-colors"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/latest"
              className="hover:underline hover:text-blue-300 transition-colors"
            >
              Latest Uploads
            </Link>
          </li>
          <li>
            <Link
              to="/blogs"
              className="hover:underline hover:text-blue-300 transition-colors"
            >
              Blogs
            </Link>
          </li>
        </ul>
      </div>
  
      {/* Mobile Navbar */}
      <div className="sm:hidden sticky top-0 z-50">
        <Navbar />
      </div>
  
{/* Hero Section (uses only cover_poster) */}
{!loading && latestMovies.filter((m) => m.cover_poster).length > 0 && (
  <div className="relative w-full overflow-hidden">
    <div
      ref={slideRef}
      className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
      style={{ scrollBehavior: "smooth" }}
    >
      {latestMovies
        .filter((movie) => movie.cover_poster) // ✅ Only movies with cover_poster
        .map((movie) => (
          <div
            key={movie.id}
            className="relative flex-none w-full h-[65vh] sm:h-[75vh] snap-center"
          >
            <img
              src={movie.cover_poster}
              srcSet={`
                ${movie.cover_poster}?w=768 768w,
                ${movie.cover_poster}?w=1280 1280w,
                ${movie.cover_poster}?w=1920 1920w
              `}
              sizes="(max-width: 768px) 768px,
                     (max-width: 1280px) 1280px,
                     1920px"
              alt={movie.title || "Movie Cover"}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover brightness-75"
              onError={(e) => {
                e.currentTarget.src = "/default-cover.jpg";
              }}
            />

            {/* Overlay Gradient & Content */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-12">
              <Link
                to={`/watch/${movie.slug}`}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base font-semibold rounded w-fit mb-2"
              >
                ▶ Watch Now
              </Link>

              {/* ✅ Show slug */}
              <p className="text-gray-300 text-xs sm:text-sm font-mono">
                {movie.slug}
              </p>
            </div>
          </div>
        ))}
    </div>

    {/* Slide Dots */}
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
      {latestMovies
        .filter((m) => m.cover_poster)
        .map((_, idx) => (
          <span
            key={idx}
            className={`w-3 h-3 rounded-full ${
              idx === currentSlide ? "bg-white" : "bg-gray-500"
            }`}
          />
        ))}
    </div>

          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80"
          >
            {showSearch ? (
              <XMarkIcon className="w-6 h-6 text-white" />
            ) : (
              <MagnifyingGlassIcon className="w-6 h-6 text-white" />
            )}
          </button>

          {showSearch && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
              <input
                type="text"
                placeholder="🔍 Search movies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-black/70 border border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-400"
              />
            </div>
          )}
        </div>
      )}

      {/* Movies grouped by Language (uses poster) */}
      <div className="p-6 flex flex-col items-center">
        {loading ? (
          <p className="text-center">⏳ Loading...</p>
        ) : Object.keys(groupedByLanguage).length === 0 ? (
          <p className="text-center text-gray-400">No movies found.</p>
        ) : (
          Object.entries(groupedByLanguage).map(([language, movies]) => (
            <div key={language} className="mb-10 w-full">
              <h2 className="text-xl font-semibold text-blue-300 mb-4 border-b border-gray-700 pb-2">
                {language}
              </h2>
              <div className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 pb-3">
                {movies.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex-none w-40 sm:w-48 md:w-56 border border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition duration-200 bg-gray-900 hover:bg-gray-800"
                  >
                    <Link to={`/watch/${movie.slug}`}>
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-56 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/default-poster.jpg";
                        }}
                      />
                    </Link>
                    <div className="p-2 text-center font-medium">
                      <div className="text-sm text-white truncate">
                        {movie.title}
                      </div>
                      <Link
                        to={`/watch/${movie.slug}`}
                        className="inline-block mt-2 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded"
                      >
                        ▶ Watch
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WatchListPage;
