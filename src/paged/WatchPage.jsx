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

  // 🔹 Fetch Movie + Episodes + Expiring Download URL
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1️⃣ Fetch movie data
        const { data: watchData, error: watchError } = await supabase
          .from("watch_html")
          .select("id, slug, title, poster, cover_poster, video_url, html_code, direct_url")
          .eq("slug", slug)
          .single();

        if (watchError || !watchData) {
          if (isMounted) setMovieMeta({ slug: "Not Found 🚫" });
          return;
        }

        // 2️⃣ Fetch episodes
        const { data: epData } = await supabase
          .from("watch_episodes")
          .select("id, episode_title, video_url")
          .eq("watch_id", watchData.id)
          .order("created_at", { ascending: true });

        if (!isMounted) return;

        // 3️⃣ Set movie meta
        setMovieMeta({
          slug: watchData.slug,
          title: watchData.title || "Untitled Movie",
          poster: watchData.poster || "/poster.png",
          background: watchData.cover_poster || watchData.poster || "/poster.png",
        });

        // 4️⃣ Prepare servers
        const availableServers = [];
        if (watchData.video_url) {
          availableServers.push({
            name: "Server 1",
            type: "video",
            src: watchData.video_url,
          });
        }

        // 5️⃣ Fetch fresh expiring Bunny URL if direct_url exists
        let freshDirectUrl = null;
        if (watchData.direct_url) {
          try {
            const res = await axios.get(
              `${backendUrl}/api/videos/${watchData.direct_url}/download`
            );
            if (res.data?.directDownloadUrl) {
              freshDirectUrl = res.data.directDownloadUrl;
              availableServers.push({
                name: "Server 2",
                type: "video",
                src: freshDirectUrl,
              });
            }
          } catch (err) {
            console.error("❌ Failed to fetch download URL:", err);
          }
        }

        setServers(availableServers);

        // 6️⃣ Set default active source
        if (availableServers.length > 0) setActiveSrc(availableServers[0]);

        // 7️⃣ Set download URL
        setDownloadUrl(freshDirectUrl || "");

        // 8️⃣ Set episodes
        if (epData?.length > 0) setEpisodes(epData);
      } catch (err) {
        console.error(err);
        if (isMounted) setMovieMeta({ slug: "Error 🚫" });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    // 🔹 Expire download URL on page unload
    const handleBeforeUnload = () => setDownloadUrl("");
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [slug, backendUrl]);

  // 🔹 SEO Meta Updates
  useEffect(() => {
    if (movieMeta?.slug) {
      const titleText = `Watch ${movieMeta.slug} now | MovieStream`;
      const descText = `Watch ${movieMeta.slug} online in HD. Stream or download movies easily.`;

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
              style={{ backgroundImage: `url(${movieMeta.background})`, filter: "brightness(0.5)" }}
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
                {movieMeta.slug}
              </h1>
              <p className="text-gray-300 max-w-lg leading-relaxed mb-4">
                Watch <span className="text-blue-400">{movieMeta.slug}</span> online in HD — enjoy movies of every genre including action, drama, comedy, thriller, and romance.
              </p>

              {/* Download Button */}
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

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg shadow text-white font-medium transition text-sm sm:text-base"
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

        {/* Player Section */}
        {activeSrc ? (
          <div className="w-full max-w-full mx-auto rounded-lg overflow-hidden shadow-lg bg-black relative" style={{ aspectRatio: "16/9" }}>
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
        ) : (
          <p className="text-center text-gray-400 mt-4">⚠️ No video available.</p>
        )}

        {/* Episodes */}
        {episodes.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-yellow-400 mb-4">📺 Episodes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {episodes.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => setActiveSrc({ type: "video", src: ep.video_url })}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-200"
                >
                  {ep.episode_title}
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
