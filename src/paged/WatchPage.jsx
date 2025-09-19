import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";

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
        // Fetch from Supabase
        const { data: watchData, error: watchError } = await supabase
          .from("watch_html")
          .select("slug, html_code, title, poster, cover_poster")
          .eq("slug", slug)
          .single();

        if (watchError || !watchData) {
          if (isMounted) setMovieMeta({ slug: "Not Found 🚫" });
          return;
        }

        // Extract iframe src from html_code
        const iframeSrc =
          watchData.html_code?.match(/src="([^"]+)"/i)?.[1] || null;
        if (isMounted) setEmbedSrc(iframeSrc);

        // Store Supabase data
        const meta = {
          slug: watchData.slug, // ✅ Keep slug
          title: watchData.title || "Untitled",
          poster: watchData.poster || "/poster.png",
          background: watchData.cover_poster || watchData.poster || "/poster.png",
        };

        if (isMounted) setMovieMeta(meta);
      } catch {
        if (isMounted) setMovieMeta({ slug: "Error 🚫" });
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
    return (
      <p className="text-center mt-20 text-gray-300 text-lg">⏳ Loading...</p>
    );

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
              src={movieMeta.poster}
              alt={movieMeta.title}
              loading="lazy"
              className="w-44 sm:w-56 rounded-lg shadow-lg z-10"
              onError={(e) => (e.currentTarget.src = "/poster.png")}
            />

            <div className="text-center sm:text-left z-10">
              <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                {movieMeta.slug} {/* ✅ Show slug column */}
              </h1>
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
      </div>
    </div>
  );
};

export default WatchHtmlPage;
