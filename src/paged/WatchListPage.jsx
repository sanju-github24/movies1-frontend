// src/pages/WatchListPage.jsx
import React, { useEffect, useState, useRef, useMemo, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Helmet } from "react-helmet";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { AppContext } from "../context/AppContext";

/* ===== Helper: Save Recently Watched (UNCHANGED) ===== */
const saveRecentlyWatched = (movie) => {
  const existing = JSON.parse(localStorage.getItem("recently_watched") || "[]");
  const filtered = existing.filter((m) => m.slug !== movie.slug);
  const updated = [movie, ...filtered].slice(0, 10);
  localStorage.setItem("recently_watched", JSON.stringify(updated));
};

/* ===== STORAGE helpers for resume times (match VideoPlayer key) ===== */
const STORAGE_PREFIX = "video_last_time_v1:";

const readAllResumeTimes = () => {
  const resumeMap = {}; // slugOrSrc -> { time, updatedAt }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(raw);
          const id = key.replace(STORAGE_PREFIX, "");
          resumeMap[id] = parsed;
        } catch (e) {
          // ignore parse errors
        }
      }
    }
  } catch (e) {
    console.warn("Failed reading resume times:", e);
  }
  return resumeMap;
};

/* ====== Language Row Component (uses poster now) ====== */
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
    rowRef.current?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      rowRef.current?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [movies]);

  return (
    <div className="mb-10 w-full">
      <h2 className="text-xl font-semibold text-blue-300 mb-4 border-b border-gray-700 pb-2">
        {language}
      </h2>
      <div className="relative group">
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="hidden sm:flex absolute left-0 top-0 bottom-0 z-20 items-center justify-center w-10 bg-gradient-to-r from-black/80 to-transparent hover:from-black/90 transition"
          >
            ◀
          </button>
        )}

        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="sm:hidden absolute left-0 top-0 bottom-0 z-10 items-center justify-center w-8 text-white text-xl bg-black/40 hover:bg-black/60 transition rounded-l-lg ml-1 h-56 my-auto"
            style={{ height: "224px" }}
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
                  {Array.isArray(movie.subCategory) ? movie.subCategory[0] : movie.subCategory}
                </span>
              )}

              {/* <-- poster */}
              <img
                src={movie.poster || "/default-poster.jpg"}
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

        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="hidden sm:flex absolute right-0 top-0 bottom-0 z-20 items-center justify-center w-10 bg-gradient-to-l from-black/80 to-transparent hover:from-black/90 transition"
          >
            ▶
          </button>
        )}

        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="sm:hidden absolute right-0 top-0 bottom-0 z-10 items-center justify-center w-8 text-white text-xl bg-black/40 hover:bg-black/60 transition rounded-r-lg mr-1 h-56 my-auto"
            style={{ height: "224px" }}
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
  const { backendUrl } = useContext(AppContext);

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

  // refresh toggle to re-read resume times (instead of page reload)
  const [resumeRefresh, setResumeRefresh] = useState(0);

  const navigate = useNavigate();

  /* ===== Helper: fetch TMDB details from backend (mirrors WatchHtmlPage) ===== */
  const fetchTmdbDetails = async (imdbId) => {
    if (!backendUrl || !imdbId) return null;
    try {
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params: { imdbId } });
      if (res.data?.success && res.data.data) return res.data.data;
    } catch (err) {
      console.error("tmdb fetch error:", err?.message || err);
    }
    return null;
  };

  /* ===== Fetch Movies ===== */
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const [watchRes, moviesRes] = await Promise.all([
          supabase
            .from("watch_html")
            // included imdb_id so we can enrich hero slides later
            .select("id, title, slug, poster, cover_poster, video_url, created_at, title_logo, imdb_id")
            .order("created_at", { ascending: false })
            .limit(200),
          supabase.from("movies").select("slug, title, language, categories, subCategory, description"),
        ]);

        if (watchRes.error) throw new Error(watchRes.error.message);
        if (moviesRes.error) throw new Error(moviesRes.error.message);

        const moviesData = moviesRes.data || [];
        const merged = watchRes.data.map((item) => {
          const match =
            moviesData.find((m) => m.slug === item.slug) ||
            moviesData.find((m) => m.title?.toLowerCase() === item.title?.toLowerCase());

          return {
            id: item.id,
            slug: item.slug,
            title: item.title,
            poster: item.poster || "/default-poster.jpg",
            cover_poster: item.cover_poster || item.poster || "/default-cover.jpg",
            table_cover_poster: item.cover_poster || null,
            video_url: item.video_url || "",
            created_at: item.created_at,
            title_logo: item.title_logo || "",
            imdb_id: item.imdb_id || null,
            language: match?.language?.length ? match.language : ["Unknown"],
            categories: match?.categories || [],
            subCategory: match?.subCategory || [],
            description: match?.description || "",
          };
        });

        setMovies(merged);
      } catch (err) {
        console.error("Fetch error:", err.message || err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [backendUrl]);

  /* ===== Hero / latest selection logic (initial selection from movies) ===== */
  useEffect(() => {
    if (movies.length === 0) return;

    const today = new Date().toISOString().split("T")[0];
    const lastVisit = localStorage.getItem("last_visit_date");

    let heroSelection = [...movies].slice(0, 5);

    if (lastVisit === today) {
      const olderMovies = [...movies].slice(5, 50);
      const randomPicks = olderMovies.sort(() => 0.5 - Math.random()).slice(0, 2);
      heroSelection = [...heroSelection.slice(0, 3), ...randomPicks];
    } else {
      localStorage.setItem("last_visit_date", today);
    }

    setHeroMovies(heroSelection);
  }, [movies]);

  /* ===== Enrich heroMovies with TMDB details (cert, year, genres, poster/cover) =====
     This runs when heroMovies change or backendUrl changes. It fetches TMDB details only for the
     first few hero candidates (keeps network calls small). */
  useEffect(() => {
    if (!heroMovies || heroMovies.length === 0 || !backendUrl) return;

    let cancelled = false;

    const enrich = async () => {
      const candidates = heroMovies.slice(0, 8); // keep small
      const promises = candidates.map(async (m) => {
        if (!m.imdb_id) return m;
        const tmdb = await fetchTmdbDetails(m.imdb_id);
        if (!tmdb) return m;

        return {
          ...m,
          poster: tmdb.poster_url || m.poster,
          cover_poster: tmdb.cover_poster_url || m.cover_poster || m.poster,
          certification: tmdb.certification || m.certification || "",
          year: tmdb.year || m.year || (tmdb.release_date ? new Date(tmdb.release_date).getFullYear() : null),
          tmdb_genres: tmdb.genres || null,
          trailer_url: tmdb.trailer_url || null,
        };
      });

      try {
        const enriched = await Promise.all(promises);
        if (cancelled) return;

        // Replace matching entries in heroMovies by slug (preserve order)
        setHeroMovies((prev) => {
          const bySlug = Object.fromEntries(prev.map((p) => [p.slug, p]));
          enriched.forEach((e) => {
            if (e.slug) bySlug[e.slug] = e;
          });
          // maintain previous ordering
          return prev.map((p) => bySlug[p.slug] || p);
        });
      } catch (err) {
        console.error("hero enrich error:", err);
      }
    };

    enrich();

    return () => {
      cancelled = true;
    };
  }, [heroMovies, backendUrl]);

  /* ===== Load Recommendations (based on recently watched) ===== */
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recently_watched") || "[]");

    if (stored.length > 0) {
      const last = stored[0];
      setLastWatchedTitle(last.slug || "a movie");

      const related = movies.filter(
        (m) => m.language?.[0] === last.language?.[0] || m.categories?.[0] === last.categories?.[0]
      );
      setRecommended(related.filter((m) => m.slug !== last.slug).slice(0, 10));
    }
  }, [movies]);

  /* ===== Filter & Group Movies ===== */
  const filtered = useMemo(() => movies.filter((m) => m.title.toLowerCase().includes(search.toLowerCase())), [movies, search]);

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

  /* ===== Auto-Slide Effect ===== */
  useEffect(() => {
  if (!latestMovies || latestMovies.length === 0) return;

  const interval = setInterval(() => {
    setCurrentSlide((prev) => (prev + 1) % latestMovies.length);
  }, 5000); // <-- 5 seconds now

  return () => clearInterval(interval);
}, [latestMovies]);


  // Handle Scroll to toggle navbar background
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrolled]);

  // ===== CONTINUE WATCHING: read resume times and map to movies =====
  const resumeMap = useMemo(() => {
    const raw = readAllResumeTimes(); // id -> {time, updatedAt}
    const mapped = {};
    Object.entries(raw).forEach(([id, value]) => {
      const found = movies.find((m) => m.slug === id);
      if (found) {
        mapped[found.slug] = { movie: found, time: value.time || 0, updatedAt: value.updatedAt || 0 };
      } else {
        const bySrc = movies.find((m) => m.video_url && id === m.video_url);
        if (bySrc) mapped[bySrc.slug] = { movie: bySrc, time: value.time || 0, updatedAt: value.updatedAt || 0 };
      }
    });
    return mapped; // keyed by slug
  }, [movies, resumeRefresh]);

  // Create sorted continue list (most recent first) and filter out very short times (under 5s)
  const continueList = useMemo(() => {
    const arr = Object.values(resumeMap).filter((r) => r.time && r.time > 5).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return arr;
  }, [resumeMap]);

  // Quick resume handler: navigate to /player with state containing src & metadata
  const handleResume = (movie, time) => {
    const activeSrc = {
      name: movie.title,
      type: movie.video_url && movie.video_url.includes(".m3u8") ? "video" : "video",
      src: movie.video_url || movie.direct_url || null,
      isEpisode: false,
    };

    const movieMeta = {
      slug: movie.slug,
      title: movie.title,
      titleLogoUrl: movie.title_logo || null,
      video_url: movie.video_url || null,
    };

    navigate("/player", { state: { src: activeSrc, movieMeta, tmdbMeta: null } });
  };

  // remove stored resume time & refresh continue list reactively
  const handleRemoveProgress = (slug) => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${slug}`);
      // also remove from recently_watched if present
      try {
        const rw = JSON.parse(localStorage.getItem("recently_watched") || "[]");
        localStorage.setItem("recently_watched", JSON.stringify(rw.filter((m) => m.slug !== slug)));
      } catch (e) {}
      setResumeRefresh((r) => r + 1);
    } catch (err) {
      console.error("Failed to remove progress:", err);
    }
  };

  // LOADING UI
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
      <Helmet>
        <title>Watch Movies Online | 1TamilMV - Latest & Trending</title>
        <meta name="description" content="Watch the latest movies online in HD. Explore trending movies in Tamil, Telugu, Kannada, Malayalam, and Hindi on 1TamilMV. Fast streaming and download." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.1anchormovies.live/watchlist" />
      </Helmet>

      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-gray-950 shadow-lg" : "bg-transparent"}`}>
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

          <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-full bg-transparent">
            {showSearch ? <XMarkIcon className="w-6 h-6 text-white" /> : <MagnifyingGlassIcon className="w-6 h-6 text-white" />}
          </button>
        </div>

        {showSearch && (
          <div className={`px-4 pb-3 max-w-3xl mx-auto transition-all duration-300 ${scrolled ? "bg-gray-950" : "bg-transparent"}`}>
            <input type="text" placeholder="🔍 Search movies..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-0 py-2 border-b border-gray-500 focus:border-blue-500 bg-transparent text-white placeholder-gray-300 outline-none" />
          </div>
        )}
      </header>

      {/* Hero Slider (uses poster/cover and enriched fields when available) */}
      {/* Hero Slider (uses poster/cover and enriched fields when available)
    — unified layout: same info on mobile & desktop
*/}
{/* Hero Slider */}
{!loading && latestMovies.length > 0 && search === "" && (
  <div className="relative w-full overflow-hidden mt-[-60px] sm:mt-[-64px]">
    <div className="relative w-full h-[60vh] sm:h-[75vh] flex justify-center items-center">
      {latestMovies.map((movie, idx) => {
        const isActive = idx === currentSlide;

        const title = movie.slug;
        const titleLogo = movie.title_logo || null;
        const cert = movie.certification || movie.cert || "";
        const year = movie.year || (movie.created_at ? new Date(movie.created_at).getFullYear() : "");
        const genres = movie.tmdb_genres || movie.categories || [];
        const cover = movie.table_cover_poster || movie.cover_poster || movie.poster || "/default-cover.jpg";

        return (
          <div
            key={movie.id || movie.slug || idx}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isActive ? "opacity-100 z-20" : "opacity-0 z-10"
            }`}
          >
            <img
              src={cover}
              alt={title}
              className="w-full h-full object-cover brightness-75"
              draggable={false}
              onError={(e) => (e.currentTarget.src = "/default-cover.jpg")}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent flex items-end sm:items-center p-6 sm:p-10 pointer-events-none">
              <div className="max-w-3xl md:max-w-2xl flex flex-col gap-4 w-full pointer-events-auto">

                {/* Title */}
                {titleLogo ? (
                  <img
                    src={titleLogo}
                    alt={`${title} Logo`}
                    className="w-52 sm:w-[420px] object-contain drop-shadow-lg"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <h2 className="text-white text-3xl sm:text-5xl font-extrabold drop-shadow-lg">
                    {title}
                  </h2>
                )}

                {/* MOBILE META ROW (Genres + Languages) */}
                <div className="sm:hidden flex flex-wrap gap-2">
                  {movie.language?.slice(0, 3).map((l, i) => (
                    <span key={i} className="px-3 py-1 bg-black/70 text-white text-xs rounded-md">
                      {l}
                    </span>
                  ))}

                  {genres?.slice(0, 3).map((g, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-800/70 text-gray-200 text-xs rounded-md">
                      {g}
                    </span>
                  ))}
                </div>

                {/* DESKTOP META ROW */}
                <div className="hidden sm:flex flex-wrap items-center gap-3">
                  {year && <span className="px-3 py-1.5 bg-gray-800/70 rounded text-base">{year}</span>}
                  {cert && <span className="px-3 py-1.5 bg-red-600/90 rounded text-base text-white">{cert}</span>}
                  {genres.length > 0 && (
                    <span className="px-3 py-1.5 bg-black/50 rounded text-base text-gray-200">
                      {genres.slice(0, 3).join(" • ")}
                    </span>
                  )}
                </div>

                {/* DESCRIPTION (Desktop only) */}
                {movie.description && (
                  <p className="hidden sm:block text-gray-300 text-base max-w-xl line-clamp-4">
                    {movie.description}
                  </p>
                )}

                {/* ACTIONS */}
                <div className="flex items-center gap-3 mt-2">
                  <Link
                    to={`/watch/${movie.slug}`}
                    className="inline-flex items-center gap-3 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-md shadow-md"
                  >
                    ▶ Watch
                  </Link>
                </div>

              </div>
            </div>
          </div>
        );
      })}
    </div>

    {/* Dots */}
    <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
      {latestMovies.map((_, idx) => (
        <button
          key={idx}
          onClick={() => setCurrentSlide(idx)}
          className={`h-1.5 rounded-full transition-all ${
            idx === currentSlide ? "w-6 bg-white" : "w-2 bg-gray-500 hover:bg-gray-400"
          }`}
        />
      ))}
    </div>
  </div>
)}



      {/* ===== CONTINUE WATCHING SECTION (CLEAN + DESKTOP HOVER OVERLAY + MOBILE TAP) ===== */}
      {continueList.length > 0 && (
        <div className="max-w-10xl mx-auto px-4 py-6">
          <h2 className="text-2xl font-bold text-blue-400 mb-4">Continue Watching For You</h2>

          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1">
            {continueList.map(({ movie, time }) => {
              const resumeText = `${Math.floor(time / 60)}m ${Math.floor(time % 60)}s`;
              const percent = Math.round(Math.min(100, (time / 7200) * 100)); // approx max 2hr

              // metadata fallbacks
              const titleLogo = movie.title_logo || null;
              const cert = movie.certification || movie.certificate || "";
              const year = movie.year || (movie.created_at ? new Date(movie.created_at).getFullYear() : null);
              const shortDesc = movie.description ? (movie.description.length > 160 ? movie.description.slice(0, 157) + "…" : movie.description) : "";

              return (
                <div
                  key={movie.slug}
                  onClick={() => handleResume(movie, time)} // mobile: tap whole card
                  className="
                    relative flex-none rounded-lg overflow-hidden bg-gray-900 
                    border border-gray-800 shadow-sm cursor-pointer
                    w-[280px] sm:w-[320px] md:w-[380px]
                    group
                  "
                >
                  {/* Poster */}
                  <div className="relative">
                    <img
                      src={movie.cover_poster || movie.poster}
                      alt={movie.title}
                      className="w-full h-36 sm:h-44 md:h-52 object-cover"
                      onError={(e) => (e.currentTarget.src = '/default-cover.jpg')}
                    />

                    {/* DESKTOP HOVER OVERLAY (shows logo, cert, year, desc, Resume) */}
                    <div
                      className="
                        hidden sm:flex
                        absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent
                        flex-col justify-end p-4 gap-3
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      "
                      onClick={(e) => e.stopPropagation()} // prevent parent click when clicking overlay controls
                    >
                      {/* Title logo or fallback title */}
                      <div className="flex items-center gap-3">
                        {titleLogo ? (
                          <img src={titleLogo} alt={movie.title} className="h-12 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <div className="text-lg font-bold text-white truncate">{movie.title}</div>
                        )}

                        {/* badges */}
                        <div className="ml-auto flex items-center gap-2">
                          {cert && <span className="text-xs font-bold px-2 py-1 bg-red-600/90 text-white rounded">{cert}</span>}
                          {year && <span className="text-xs text-gray-200 px-2 py-1 bg-black/30 rounded">{year}</span>}
                        </div>
                      </div>

                      {/* Description (single paragraph) */}
                      {shortDesc && <p className="text-sm text-gray-200 leading-tight max-h-20 overflow-hidden line-clamp-3">{shortDesc}</p>}

                      {/* Actions row */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleResume(movie, time)}
                          className="inline-flex items-center px-4 py-2 bg-white text-black font-semibold rounded shadow hover:bg-gray-100"
                        >
                          ▶ Resume
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveProgress(movie.slug); }}
                          className="px-3 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 ml-2"
                          title="Remove Progress"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Desktop-only subtle overlay to indicate hover area (keeps poster readable) */}
                    <div className="hidden sm:block absolute inset-0 pointer-events-none bg-gradient-to-t from-black/0 to-black/20 opacity-0 group-hover:opacity-60 transition-opacity duration-200" />
                  </div>

                  {/* Text & Progress (visible always) */}
                  <div className="px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-300 truncate max-w-[72%]">
                        {movie.slug}
                      </div>
                      <div className="text-xs text-gray-400 ml-2">{resumeText}</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 h-1.5 w-full bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-1.5 bg-red-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* MOBILE: small inline resume button shown under the image for easier accessibility (visible only on small screens) */}
                  <div className="sm:hidden px-3 pb-3">
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResume(movie, time); }}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded"
                      >
                        ▶ Resume
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProgress(movie.slug);
                        }}
                        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 rounded"
                        title="Remove progress"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended */}
      {recommended.length > 0 && search === "" && (
        <div className="p-6 flex flex-col items-center">
          <LanguageRow language={`🎬 Because you watched: ${lastWatchedTitle}`} movies={recommended} />
        </div>
      )}

      {/* Movies grouped by language / search results */}
      <div className={`p-6 flex flex-col items-center transition-opacity duration-500 ${!loading ? "opacity-100" : "opacity-0"}`}>
        {search !== "" && <h2 className="text-2xl font-bold text-blue-400 mb-6 w-full max-w-7xl px-4 text-left">Search Results for: "{search}"</h2>}

        {Object.keys(groupedByLanguage).length === 0 ? (
          <p className="text-center text-gray-400">{search === "" ? "No movies found." : `No movies found matching "${search}".`}</p>
        ) : (
          Object.entries(groupedByLanguage).map(([language, movies]) => <LanguageRow key={language} language={language} movies={movies} />)
        )}
      </div>
    </div>
  );
};

export default WatchListPage;
