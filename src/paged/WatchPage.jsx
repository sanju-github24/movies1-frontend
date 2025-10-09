import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";

const WatchHtmlPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [movieMeta, setMovieMeta] = useState(null);
  const [servers, setServers] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [activeSrc, setActiveSrc] = useState(null);

  // 🔹 Fetch Movie + Episode Data
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 🔹 Fetch movie details
        const { data: watchData, error: watchError } = await supabase
          .from("watch_html")
          .select("id, slug, html_code, html_code2, title, poster, cover_poster")
          .eq("slug", slug)
          .single();

        if (watchError || !watchData) {
          if (isMounted) setMovieMeta({ slug: "Not Found 🚫" });
          return;
        }

        // 🔹 Fetch episodes
        const { data: epData } = await supabase
          .from("watch_episodes")
          .select("id, episode_title, episode_html")
          .eq("watch_id", watchData.id)
          .order("created_at", { ascending: true });

        // Extract iframe sources
        const iframeSrc1 =
          watchData.html_code?.match(/src="([^"]+)"/i)?.[1] || null;
        const iframeSrc2 =
          watchData.html_code2?.match(/src="([^"]+)"/i)?.[1] || null;

        if (isMounted) {
          setMovieMeta({
            slug: watchData.slug,
            title: watchData.title || "Untitled Movie",
            poster: watchData.poster || "/poster.png",
            background:
              watchData.cover_poster || watchData.poster || "/poster.png",
          });

          if (epData && epData.length > 0) {
            // Show episodes
            setEpisodes(epData);
            setActiveSrc(
              epData[0].episode_html?.match(/src="([^"]+)"/i)?.[1] || null
            );
          } else {
            // Fallback to servers
            const srv = [
              { name: "Server 1", src: iframeSrc1 },
              { name: "Server 2", src: iframeSrc2 },
            ].filter((s) => s.src);
            setServers(srv);
            setActiveSrc(srv[0]?.src || null);
          }
        }
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

  // 🔹 SEO Meta Updates
  useEffect(() => {
    if (movieMeta?.slug) {
      const titleText = `Watch ${movieMeta.slug} now in all languages | MovieStream`;
      const descText = `Watch ${movieMeta.slug} online now in multiple languages. Stream or download all types of movies including action, drama, romance, and more.`;

      document.title = titleText;

      let metaDesc = document.querySelector("meta[name='description']");
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = descText;
    }
  }, [movieMeta]);

  if (loading)
    return (
      <p className="text-center mt-20 text-gray-300 text-lg">⏳ Loading...</p>
    );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 🧭 Desktop Navbar */}
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

      {/* 📱 Mobile Navbar */}
      <div className="sm:hidden sticky top-0 z-50">
        <Navbar />
      </div>

      {/* 🎥 Hero Section */}
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
                {movieMeta.title}
              </h1>
              <p className="text-gray-300 max-w-lg leading-relaxed">
                Watch <span className="text-blue-400">{movieMeta.title}</span> now in all
                languages — enjoy movies of every genre including action, drama, comedy,
                thriller, and romance. Stream or download anytime, anywhere!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🎬 Main Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg shadow text-white font-medium transition text-sm sm:text-base"
        >
          ⬅ Previous Page
        </button>

        {/* ▶️ Video Player */}
        {activeSrc && (
          <div className="mb-10">
            <div className="w-full max-w-4xl mx-auto aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
              <iframe
                src={activeSrc}
                frameBorder="0"
                allowFullScreen
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                className="w-full h-full rounded-lg"
              />
            </div>
          </div>
        )}

        {/* 📺 Episodes or Servers */}
        {episodes.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold text-yellow-400 mb-4">📺 Episodes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {episodes.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() =>
                    setActiveSrc(ep.episode_html?.match(/src="([^"]+)"/i)?.[1] || null)
                  }
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-200"
                >
                  {ep.episode_title}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-green-400 mb-4">🎛️ Available Servers</h2>
            <div className="flex gap-3 flex-wrap">
              {servers.map((server, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSrc(server.src)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-200"
                >
                  {server.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchHtmlPage;
