import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import { AppContext } from "../context/AppContext";
import axios from "axios";

const WatchHtmlPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [movieMeta, setMovieMeta] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [servers, setServers] = useState([]);
  const [activeSrc, setActiveSrc] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [showEpisodes, setShowEpisodes] = useState(false); // true = expanded by default

  // 🔹 Fetch Movie + Episodes
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1️⃣ Fetch main movie data
        const { data: watchData, error } = await supabase
          .from("watch_html")
          .select("id, slug, title, poster, cover_poster, video_url, html_code, direct_url, episodes")
          .eq("slug", slug)
          .single();

        if (error || !watchData) {
          if (isMounted) setMovieMeta({ slug: "Not Found 🚫" });
          return;
        }

        // 2️⃣ Set movie meta
        setMovieMeta({
          slug: watchData.slug,
          title: watchData.title || "Untitled Movie",
          poster: watchData.poster || "/poster.png",
          background: watchData.cover_poster || watchData.poster || "/poster.png",
        });

        // 3️⃣ Prepare servers (movie-level)
        const availableServers = [];
        if (watchData.video_url) {
          availableServers.push({ name: "Server 1", type: "video", src: watchData.video_url });
        }

        // 4️⃣ Add direct_url (fresh signed link if required)
        let freshDirectUrl = null;
        if (watchData.direct_url) {
          try {
            const res = await axios.get(`${backendUrl}/api/videos/${watchData.direct_url}/download`);
            if (res.data?.directDownloadUrl) {
              freshDirectUrl = res.data.directDownloadUrl;
              availableServers.push({ name: "Server 2", type: "video", src: freshDirectUrl });
            }
          } catch (err) {
            console.error("❌ Failed to fetch download URL:", err);
          }
        }

        // 5️⃣ Add html iframe player (if exists)
        if (watchData.html_code) {
          availableServers.push({ name: "Embed", type: "html", src: watchData.html_code });
        }

        setServers(availableServers);
        if (availableServers.length > 0) setActiveSrc(availableServers[0]);
        setDownloadUrl(freshDirectUrl || "");

        // 6️⃣ Episodes (stored as JSON in same row)
        if (Array.isArray(watchData.episodes) && watchData.episodes.length > 0) {
          setEpisodes(watchData.episodes);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setMovieMeta({ slug: "Error 🚫" });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [slug, backendUrl]);

  // 🔹 SEO Meta Updates
  useEffect(() => {
    if (movieMeta?.slug) {
      document.title = `Watch ${movieMeta.slug} | MovieStream`;
      let meta = document.querySelector("meta[name='description']");
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = `Watch ${movieMeta.slug} online in HD. Stream or download easily.`;
    }
  }, [movieMeta]);

  if (loading) return <p className="text-center mt-20 text-gray-300 text-lg">⏳ Loading...</p>;

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

      {/* Hero */}
      {movieMeta && (
        <div className="relative w-full bg-black">
          {movieMeta.background && (
            <div
              className="hidden sm:block absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${movieMeta.background})`, filter: "brightness(0.5)" }}
            />
          )}
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>

          <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-12 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <img
              src={movieMeta.poster}
              alt={movieMeta.title}
              className="w-44 sm:w-56 rounded-lg shadow-lg z-10"
              onError={(e) => (e.currentTarget.src = "/poster.png")}
            />
            <div className="text-center sm:text-left z-10">
              <h1 className="text-3xl sm:text-5xl font-bold mb-4 drop-shadow-lg">{movieMeta.slug}</h1>
              <p className="text-gray-300 max-w-lg leading-relaxed mb-4">
                Watch <span className="text-blue-400">{movieMeta.slug}</span> online in HD — enjoy movies of every genre.
              </p>
              {downloadUrl && (
                <a
                  href={downloadUrl + "&download"}
                  download={`${movieMeta.title || "movie"}.mp4`}
                  className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow font-medium transition"
                >
                  ⬇️ Download Movie
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition text-sm sm:text-base"
        >
          ⬅ Previous Page
        </button>

        {/* Server Buttons */}
        {servers.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-5">
            {servers.map((server, index) => (
              <button
                key={index}
                onClick={() => setActiveSrc(server)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeSrc?.src === server.src
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                }`}
              >
                {server.name}
              </button>
            ))}
          </div>
        )}

{/* Player */}
{activeSrc ? (
  <div
    className="w-full max-w-full mx-auto rounded-lg overflow-hidden shadow-lg bg-black relative"
    style={{ aspectRatio: "16/9" }}
  >
    {activeSrc.type === "video" ? (
      <iframe
        src={activeSrc.src}
        loading="lazy"
        className="absolute top-0 left-0 w-full h-full"
        style={{ border: 0 }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <div
        className="absolute top-0 left-0 w-full h-full"
        dangerouslySetInnerHTML={{ __html: activeSrc.src }}
      />
    )}
  </div>
) : episodes.length === 0 ? ( // ✅ only show when NO episodes and NO active video
  <p className="text-center text-gray-400 mt-4">⚠️ No video available.</p>
) : null}

{/* Episodes */}
{episodes.length > 0 && (
  <div className="mt-8">
    {/* Header with arrow */}
    <button
      onClick={() => setShowEpisodes((prev) => !prev)}
      className="flex items-center gap-2 text-xl font-semibold text-yellow-400 mb-4 focus:outline-none"
    >
      📺 Episodes
      <span
        className={`inline-block transition-transform duration-200 ${
          showEpisodes ? "rotate-180" : "rotate-0"
        }`}
      >
        ▼
      </span>
    </button>

    {/* Episode list (only show if expanded) */}
    {showEpisodes && (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {episodes.map((ep, index) => (
          <button
            key={index}
            onClick={() =>
              setActiveSrc(
                ep.direct_url
                  ? { type: "video", src: ep.direct_url }
                  : { type: "html", src: ep.html }
              )
            }
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-200 truncate"
          >
            {ep.title || `Episode ${index + 1}`}
          </button>
        ))}
      </div>
    )}
  </div>
)}


      </div>
    </div>
  );
};

export default WatchHtmlPage;
