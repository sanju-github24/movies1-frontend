import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Helmet } from "react-helmet";

/* ====== Language Row Component ====== */
const LanguageRow = ({ language, movies }) => {
  const rowRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (dir) => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const handleTouchStart = (e) => (touchStartX.current = e.touches[0].clientX);
  const handleTouchMove = (e) => (touchEndX.current = e.touches[0].clientX);
  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > 50) scroll(distance > 0 ? "right" : "left");
  };

  useEffect(() => {
    checkScroll();
    rowRef.current?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      rowRef.current?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  return (
    <div className="mb-10 w-full">
      <h2 className="text-xl font-semibold text-blue-300 mb-4 border-b border-gray-700 pb-2">{language}</h2>
      <div className="relative group">
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="hidden sm:flex absolute left-0 top-0 bottom-0 z-20 items-center justify-center w-10 bg-gradient-to-r from-black/80 to-transparent hover:from-black/90 transition"
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
              className="relative flex-none w-40 sm:w-48 md:w-56 border border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition duration-200 bg-gray-900 hover:bg-gray-800 cursor-pointer"
              onClick={() => navigate(`/watch/${movie.slug}`)}
            >
              {movie.subCategory?.length > 0 && (
                <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                  {Array.isArray(movie.subCategory) ? movie.subCategory[0] : movie.subCategory}
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

/* ====== Watch List Page Component ====== */
const WatchListPage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const latestMovieTimer = useRef(null);
  const navigate = useNavigate();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // default muted

  /* ===== Fetch Movies ===== */
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const [watchRes, moviesRes] = await Promise.all([
          supabase
            .from("watch_html")
            .select("id, title, slug, poster, cover_poster, video_url, created_at, title_logo")
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
            title_logo: item.title_logo || "", // ✅ include new column
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

  /* ===== Filter & Group Movies ===== */
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

  const latestMovies = filtered.slice(0, 5);

  /* ===== Hero Slider Logic ===== */
  useEffect(() => {
    if (latestMovies.length === 0) return;

    if (latestMovieTimer.current) clearTimeout(latestMovieTimer.current);

    // Reset video
    setShowVideo(false);

    const currentMovie = latestMovies[currentSlide];

    // If current slide is an image, auto-advance after 5s
    if (!currentMovie?.video_url) {
      const timer = setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % latestMovies.length);
      }, 5000); // 5 seconds per image
      return () => clearTimeout(timer);
    }
    // Do nothing for video slides; they will advance on video end
  }, [currentSlide, latestMovies]);

  const handleVideoEnd = () =>
    setCurrentSlide((prev) => (prev + 1) % latestMovies.length);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* SEO */}
      <Helmet>
        <title>Watch Movies Online | 1TamilMV - Latest & Trending</title>
        <meta
          name="description"
          content="Watch the latest movies online in HD. Explore trending movies in Tamil, Telugu, Kannada, Malayalam, and Hindi on 1TamilMV. Fast streaming and download."
        />
        <meta name="robots" content="index, follow" />
        <link
          rel="canonical"
          href="https://www.1anchormovies.live/watchlist"
        />
      </Helmet>

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-black/90 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo_39.png" alt="Logo" className="h-10" />
          </Link>
          <nav className="hidden sm:flex gap-6 text-sm font-medium">
            <Link to="/" className="hover:text-blue-400 transition">
              Home
            </Link>
            <Link to="/latest" className="hover:text-blue-400 transition">
              Latest
            </Link>
            <Link to="/blogs" className="hover:text-blue-400 transition">
              Blogs
            </Link>
            <Link to="/watchlist" className="hover:text-blue-400 transition">
              My Watchlist
            </Link>
          </nav>
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

      {/* Hero Slider */}
      {!loading && latestMovies.length > 0 && (
        <div className="relative w-full overflow-hidden bg-black">
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
                  {/* Background video or image */}
                  {isActive && movie.video_url ? (
                    <video
                      key={`${movie.slug}-${currentSlide}`}
                      src={movie.video_url}
                      muted={isMuted}
                      playsInline
                      autoPlay
                      className="w-full h-full object-cover brightness-75"
                      onPlay={() => setIsVideoPlaying(true)}
                      onEnded={() => {
                        setIsVideoPlaying(false);
                        setCurrentSlide(
                          (prev) => (prev + 1) % latestMovies.length
                        );
                      }}
                      ref={(el) => {
                        if (el && !el.playing) {
                          el.muted = isMuted;
                          el.play().catch(() =>
                            console.log("Autoplay blocked.")
                          );
                        }
                      }}
                    />
                  ) : (
                    <img
  src={movie.cover_poster}
  alt={movie.title || "Movie Cover"}
  className="w-full h-full object-contain sm:object-cover brightness-75 bg-black"
  onError={(e) => (e.currentTarget.src = "/default-cover.jpg")}
/>

                  )}

                  {/* Gradient overlay */}
<div
  className="
    absolute inset-0 
    bg-gradient-to-t 
    from-black/60 via-black/40 to-transparent   /* lighter for mobile */
    sm:from-black/95 sm:via-black/70 sm:to-transparent  /* darker for desktop */
    flex flex-col gap-4 justify-end p-4 sm:p-10
  "
>

{/* Movie Title Logo */}
{movie.title_logo ? (
  <img
    src={movie.title_logo}
    alt={`${movie.title} Logo`}
    className="w-[260px] sm:w-[420px] object-contain drop-shadow-lg mb-3 mx-auto sm:mx-0"
  />
) : (
  <h2 className="text-white text-xl sm:text-4xl font-extrabold drop-shadow-lg truncate text-center sm:text-left">
    {movie.slug}
  </h2>
)}

{/* Language */}
{movie.language?.length > 0 && (
  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
    {movie.language.map((lang, i) => (
      <span
        key={i}
        className="px-3 py-1.5 bg-gray-800/80 rounded-lg text-sm sm:text-base font-medium text-gray-100 shadow-md"
      >
        {lang}
      </span>
    ))}
  </div>
)}


                    {/* Description */}
{movie.description && (
  <p className="hidden sm:block text-gray-200 text-sm md:text-base max-w-2xl whitespace-normal leading-relaxed">
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

                  {/* Mute/Unmute Button */}
                  {isActive && movie.video_url && (
                    <button
                      onClick={() => {
                        setIsMuted((prev) => !prev);
                        const videoEl = document.querySelector(
                          `video[key="${movie.slug}-${currentSlide}"]`
                        );
                        if (videoEl) videoEl.muted = !isMuted;
                      }}
                      className="absolute bottom-3 right-3 z-30 bg-black/80 hover:bg-black p-2 rounded-full flex items-center justify-center border border-white shadow-lg hover:scale-110 transition-transform"
                    >
                      <img
                        src={isMuted ? "/mute.png" : "/volume.png"}
                        alt={isMuted ? "Muted" : "Volume"}
                        className="w-6 h-6"
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Slider Dots */}
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

      {/* Movies by Language */}
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