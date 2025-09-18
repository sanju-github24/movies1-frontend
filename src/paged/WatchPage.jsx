import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import { backendUrl } from "../utils/api";

const WatchHtmlPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [embedSrc, setEmbedSrc] = useState(null);
  const [movieMeta, setMovieMeta] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1️⃣ Fetch watch_html from Supabase
        const { data: watchData, error: watchError } = await supabase
          .from("watch_html")
          .select("html_code, title, bms_slug")
          .eq("slug", slug)
          .single();

        if (watchError || !watchData) {
          if (isMounted) setMovieMeta({ title: "Not Found 🚫" });
          return;
        }

        // Extract iframe src
        const iframeSrc = watchData.html_code?.match(/src="([^"]+)"/i)?.[1] || null;
        if (isMounted) setEmbedSrc(iframeSrc);

        // Minimal initial meta
        let meta = {
          title: watchData.title || "Untitled",
          language: "Unknown",
          releaseDate: "N/A",
          rating: "N/A",
          poster: null,
          background: null,
          cast: [],
        };

        const bmsSlug = watchData.bms_slug || slug;

        // 2️⃣ Fetch BMS metadata in parallel
        if (bmsSlug) {
          fetch(`${backendUrl}/api/bms?slug=${encodeURIComponent(bmsSlug)}`)
            .then((res) => res.json())
            .then((json) => {
              if (!isMounted) return;
              if (json.success && json.movie) {
                meta = {
                  ...meta,
                  title: json.movie.title || meta.title,
                  language: json.movie.formatLanguage?.join(", ") || meta.language,
                  releaseDate: json.movie.releaseDate || meta.releaseDate,
                  rating: json.movie.rating || meta.rating,
                  poster: json.movie.poster || meta.poster,
                  background: json.movie.background || meta.background,
                  cast: json.movie.cast || meta.cast,
                };
              }
              setMovieMeta(meta);
            })
            .catch(() => {
              if (isMounted) setMovieMeta(meta);
            });
        } else {
          setMovieMeta(meta);
        }
      } catch {
        if (isMounted) setMovieMeta({ title: "Error 🚫" });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading)
    return <p className="text-center mt-20 text-gray-300 text-lg">⏳ Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Desktop Navbar */}
      <header className="hidden sm:block sticky top-0 z-50 bg-black/90 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo_39.png" alt="Logo" className="h-10" />
          </Link>
          <nav className="flex gap-6 text-sm font-medium">
            <Link to="/" className="hover:text-blue-400 transition">Home</Link>
            <Link to="/latest" className="hover:text-blue-400 transition">Latest</Link>
            <Link to="/blogs" className="hover:text-blue-400 transition">Blogs</Link>
            <Link to="/watchlist" className="hover:text-blue-400 transition">My Watchlist</Link>
          </nav>
        </div>
      </header>

      {/* Mobile Navbar */}
      <div className="sm:hidden sticky top-0 z-50">
        <Navbar />
      </div>

      {/* Hero Section */}
      {movieMeta && (
        <div className="relative w-full bg-black">
          {movieMeta.background && (
            <div
              className="hidden sm:block absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${movieMeta.background})`,
                filter: "brightness(0.5)",
              }}
            />
          )}
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>

          <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-12 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <img
              src={movieMeta.poster || "/poster.png"}
              alt={movieMeta.title}
              loading="lazy"
              className="w-44 sm:w-56 rounded-lg shadow-lg z-10"
              onError={(e) => (e.currentTarget.src = "/poster.png")}
            />

            <div className="text-center sm:text-left z-10">
              <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                {movieMeta.title}
              </h1>

              {(movieMeta.language || movieMeta.releaseDate) && (
                <p className="text-gray-200 text-base sm:text-lg mt-2 text-center sm:text-left">
                  {movieMeta.language && <span>{movieMeta.language}</span>}
                  {movieMeta.language && movieMeta.releaseDate && <span className="mx-2">•</span>}
                  {movieMeta.releaseDate && <span>{movieMeta.releaseDate}</span>}
                </p>
              )}

              {movieMeta.rating && (
                <div className="flex items-center gap-3 mt-2 justify-center sm:justify-start">
                  <img
                    src="/bms.png"
                    alt="BookMyShow"
                    className="w-16 sm:w-20 h-8 sm:h-10 object-contain"
                  />
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                    {movieMeta.rating}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg shadow text-white font-medium transition text-sm sm:text-base"
        >
          ⬅ Previous Page
        </button>

        {/* Video Player */}
        <div className="w-full aspect-video bg-black rounded-lg overflow-hidden mb-8 flex items-center justify-center">
          {embedSrc ? (
            <iframe
              src={embedSrc}
              frameBorder="0"
              allowFullScreen
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
              className="w-full h-full rounded-lg"
            />
          ) : (
            <p className="text-gray-400 text-sm sm:text-base">⚠ No video available.</p>
          )}
        </div>

        {/* Cast */}
        {movieMeta?.cast?.length > 0 && (
          <div className="bg-gray-900 p-4 sm:p-6 rounded-xl shadow-md">
            <h3 className="font-semibold text-blue-300 mb-3">Cast:</h3>
            <div className="flex gap-3 overflow-x-auto py-2">
              {movieMeta.cast.map((c, idx) => (
                <div key={idx} className="flex-shrink-0 w-20 text-center">
                  <img
                    src={c.image || "/user.png"}
                    alt={c.name}
                    loading="lazy"
                    className="w-20 h-28 object-cover rounded"
                    onError={(e) => (e.currentTarget.src = "/user.png")}
                  />
                  <p className="text-sm mt-1">{c.name}</p>
                  {c.role && <p className="text-xs text-gray-400">{c.role}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchHtmlPage;
