import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import Navbar from "../components/Navbar";

/* ✅ Extracted Row Component */
const LanguageRow = ({ language, movies }) => {
  const rowRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  const scroll = (dir) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({
        left: dir === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    if (rowRef.current) {
      checkScroll();
      rowRef.current.addEventListener("scroll", checkScroll);
    }
    return () => {
      if (rowRef.current) {
        rowRef.current.removeEventListener("scroll", checkScroll);
      }
    };
  }, []);

  return (
    <div className="mb-10 w-full">
      <h2 className="text-xl font-semibold text-blue-300 mb-4 border-b border-gray-700 pb-2">
        {language}
      </h2>

      <div className="relative">
        {/* Left Arrow */}
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/70 hover:bg-black/90 transition"
          >
            <ChevronLeftIcon className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Movies Row */}
        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 pb-3 scroll-smooth"
        >
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
                <div className="text-sm text-white truncate">{movie.title}</div>
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

        {/* Right Arrow */}
        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/70 hover:bg-black/90 transition"
          >
            <ChevronRightIcon className="w-6 h-6 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

const WatchListPage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRef = useRef(null);

  /* ✅ Fetch Movies */
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const { data: watchData, error: watchError } = await supabase
          .from("watch_html")
          .select("id, title, slug, poster, cover_poster, created_at")
          .order("created_at", { ascending: false });

        if (watchError) {
          console.error("Watch HTML fetch error:", watchError.message);
          setLoading(false);
          return;
        }

        const { data: moviesData, error: moviesError } = await supabase
          .from("movies")
          .select("title, language, categories, subCategory");

        if (moviesError) {
          console.error("Movies fetch error:", moviesError.message);
        }

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

  /* ✅ Filter + Group */
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

  /* ✅ Auto Slide Hero */
  useEffect(() => {
    if (latestMovies.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % latestMovies.length);
      if (slideRef.current) {
        slideRef.current.scrollTo({
          left: slideRef.current.clientWidth * ((currentSlide + 1) % latestMovies.length),
          behavior: "smooth",
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [latestMovies, currentSlide]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* ✅ Sidebar */}
      <aside className="hidden sm:flex flex-col w-56 bg-black/90 border-r border-gray-800 sticky top-0 h-screen z-50">
        <div className="p-4 flex items-center justify-center">
          <Link to="/">
            <img src="/logo_39.png" alt="Logo" className="w-20 object-contain" />
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-4 text-sm font-medium">
          <Link to="/" className="block py-2 px-3 rounded hover:bg-gray-800 transition">
            Home
          </Link>
          <Link to="/latest" className="block py-2 px-3 rounded hover:bg-gray-800 transition">
            Latest Uploads
          </Link>
          <Link to="/blogs" className="block py-2 px-3 rounded hover:bg-gray-800 transition">
            Blogs
          </Link>
          <Link to="/watchlist" className="block py-2 px-3 rounded hover:bg-gray-800 transition">
            My Watchlist
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-800 text-xs text-gray-400">
          © 2025 AnchorMovies
        </div>
      </aside>

      {/* ✅ Main Content */}
      <div className="flex-1">
        {/* Mobile Navbar */}
        <div className="sm:hidden sticky top-0 z-50">
          <Navbar />
        </div>

        {/* ✅ Hero Section */}
        {!loading && latestMovies.filter((m) => m.cover_poster).length > 0 && (
          <div className="relative w-full overflow-hidden">
            <div
              ref={slideRef}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
            >
              {latestMovies
                .filter((movie) => movie.cover_poster)
                .map((movie) => (
                  <div
                    key={movie.id}
                    className="relative flex-none w-full h-[65vh] sm:h-[75vh] snap-center"
                  >
                    <img
                      src={movie.cover_poster}
                      alt={movie.title || "Movie Cover"}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover brightness-75"
                      onError={(e) => {
                        e.currentTarget.src = "/default-cover.jpg";
                      }}
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-12">
                      <p className="text-white text-base sm:text-xl font-bold mb-2">
                        {movie.slug}
                      </p>

                      {(movie.categories?.length > 0 || movie.subCategory?.length > 0) && (
                        <p className="text-gray-300 text-sm sm:text-base mb-2">
                          {[...(movie.categories || []), ...(movie.subCategory || [])].join(" | ")}
                        </p>
                      )}

                      {movie.language?.length > 0 && (
                        <p className="text-gray-400 text-xs sm:text-sm mb-4">
                          {movie.language.map((lang, idx) => (
                            <span key={idx}>
                              {idx > 0 && <span className="mx-1">•</span>}
                              {lang}
                            </span>
                          ))}
                        </p>
                      )}

                      <Link
                        to={`/watch/${movie.slug}`}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base font-semibold rounded w-fit mb-3"
                      >
                        ▶ Watch Now
                      </Link>
                    </div>
                  </div>
                ))}
            </div>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {latestMovies.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentSlide ? "bg-white" : "bg-gray-500"
                  }`}
                />
              ))}
            </div>

            {/* Search */}
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
              <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
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

        {/* ✅ Movies grouped by Language */}
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
    </div>
  );
};

export default WatchListPage;
