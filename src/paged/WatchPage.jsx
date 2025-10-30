import React, { useEffect, useRef, useState, useContext, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { Loader2, Star, User, Download } from "lucide-react";

const WatchHtmlPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [movieMeta, setMovieMeta] = useState(null); // Local Supabase data (title, slug, posters)
  const [tmdbMeta, setTmdbMeta] = useState(null);   // TMDB rich metadata (cast, year, genres, etc.)
  const [episodes, setEpisodes] = useState([]);
  const [servers, setServers] = useState([]);
  const [activeSrc, setActiveSrc] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(""); // URL for the MAIN download button
  const [showEpisodes, setShowEpisodes] = useState(false);

  // 🔹 Helper function to fetch TMDB data using the **Supabase Slug** as the search term
  const fetchTmdbMetadata = useCallback(async (searchTerm) => {
    if (!backendUrl || !searchTerm) return null;
    try {
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, {
        params: { title: searchTerm }, // The Express server expects 'title' query parameter
      });
      if (res.data.success && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      console.error("TMDB metadata fetch error:", err.message);
    }
    return null;
  }, [backendUrl]);

  // 🔹 Fetch Movie + Episodes
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      
      // 1️⃣ Fetch main movie data from Supabase
      const { data: watchData, error } = await supabase
        .from("watch_html")
        .select("id, slug, title, poster, cover_poster, video_url, html_code, direct_url, episodes, imdb_rating, html_code2")
        .eq("slug", slug)
        .single();

      if (error || !watchData) {
        if (isMounted) setMovieMeta({ title: "Not Found 🚫" });
        setLoading(false);
        return;
      }

      // 2️⃣ Fetch rich metadata from TMDB using the movie's **SLUG**
      const tmdbResult = await fetchTmdbMetadata(watchData.slug);
      if (isMounted) {
          setTmdbMeta(tmdbResult);
      }

      // 3️⃣ Set local movie meta state
      const finalPoster = tmdbResult?.poster_url || watchData.poster || "/poster.png";
      const finalBackground = tmdbResult?.cover_poster_url || watchData.cover_poster || watchData.poster || "/poster.png";
      const finalImdbRating = tmdbResult?.imdb_rating ? `${tmdbResult.imdb_rating.toFixed(1)}/10` : watchData.imdb_rating || null;
      
      if (isMounted) {
        setMovieMeta({
          slug: watchData.slug,
          title: watchData.title || "Untitled Movie",
          poster: finalPoster,
          background: finalBackground,
          imdbRating: finalImdbRating, 
          year: tmdbResult?.year || null,
        });
      }

      // 4️⃣ Prepare servers and direct URL
      const availableServers = [];
      let freshDirectUrl = null;

      // 🚨 ORDER SERVER LOGIC HERE 🚨

      // Server 1 (HLS)
      if (watchData.video_url) {
        availableServers.push({ name: "Server 1 (HLS)", type: "video", src: watchData.video_url });
      }

      // Server 2 (Direct URL - requires backend fetch)
      if (watchData.direct_url && backendUrl) {
        try {
          const res = await axios.get(`${backendUrl}/api/videos/${watchData.direct_url}/download`);
          if (res.data?.directDownloadUrl) {
            freshDirectUrl = res.data.directDownloadUrl;
            availableServers.push({ name: "Server 2 (Direct)", type: "video", src: freshDirectUrl });
          }
        } catch (err) {
          console.error("❌ Failed to fetch direct video URL:", err);
        }
      }

      // Server 3 (Embed - html_code)
      if (watchData.html_code) {
        availableServers.push({ name: "Server 3 (Embed S3)", type: "html", src: watchData.html_code });
      }
      
      // Server 4 (Embed - html_code2)
      if (watchData.html_code2) {
        availableServers.push({ name: "Server 4 (Embed S4)", type: "html", src: watchData.html_code2 });
      }


      if (isMounted) {
          setServers(availableServers);
          // Set the first available server as active
          if (availableServers.length > 0) setActiveSrc(availableServers[0]); 
          setDownloadUrl(freshDirectUrl || ""); 
          setEpisodes(Array.isArray(watchData.episodes) ? watchData.episodes : []);
          setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [slug, backendUrl, fetchTmdbMetadata]);

  // 🔹 SEO Meta Updates
  useEffect(() => {
    if (movieMeta?.title) {
      document.title = `Watch ${movieMeta.slug} | MovieStream`;
      let meta = document.querySelector("meta[name='description']");
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = `Watch ${movieMeta.title} online in HD. Stream or download easily.`;
    }
  }, [movieMeta]);

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-400" /></div>;

  if (movieMeta?.title === "Not Found 🚫") return (
    <div className="min-h-screen bg-gray-950 text-white pt-20 text-center">
      <h1 className="text-3xl text-red-500">404 - Movie Not Found</h1>
      <p className="text-gray-400 mt-2">The movie slug "{slug}" does not match any entry.</p>
      <Link to="/" className="text-blue-400 hover:text-blue-300 mt-4 block">Go to Homepage</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar remains here... */}
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
      <div className="sm:hidden sticky top-0 z-50">
        <Navbar />
      </div>

      {/* Hero Section */}
      {movieMeta && (
        <div className="relative w-full bg-black">
          {movieMeta.background && (
            <div
              className="hidden sm:block absolute inset-0 bg-cover bg-center transition-opacity duration-500"
              style={{ backgroundImage: `url(${movieMeta.background})`, filter: "brightness(0.35)", backgroundPosition: 'top' }}
            />
          )}
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>

          <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-16 flex flex-col sm:flex-row gap-8 items-center sm:items-start">
            
            {/* Poster */}
            <img
              src={movieMeta.poster}
              alt={movieMeta.slug}
              className="w-44 sm:w-64 rounded-xl shadow-2xl border-4 border-gray-800 z-10 object-cover"
              style={{ aspectRatio: '2/3' }}
              onError={(e) => (e.currentTarget.src = "/poster.png")}
            />
            
            {/* Details */}
            <div className="text-center sm:text-left z-10 pt-4">
              <h1 className="text-4xl sm:text-6xl font-extrabold mb-2 drop-shadow-lg text-blue-400">
                  {movieMeta.slug} 
              </h1>
              {movieMeta.year && (
                  <p className="text-xl sm:text-2xl font-semibold text-gray-300 mb-3">({movieMeta.year})</p>
              )}
              
              {/* IMDb Rating Display */}
              {movieMeta.imdbRating && (
                <p className="text-xl font-bold text-yellow-400 mb-4 flex items-center justify-center sm:justify-start">
                  <Star className="w-6 h-6 fill-yellow-400 mr-2" />
                  <span className="text-white">{movieMeta.imdbRating}</span>
                </p>
              )}
              
              {/* Genre Display */}
              {tmdbMeta?.genres?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 justify-center sm:justify-start">
                    {tmdbMeta.genres.map((genre, index) => (
                        <span 
                            key={index} 
                            className="px-3 py-1 text-xs font-medium text-gray-200 bg-gray-700/70 rounded-full border border-gray-600/50 shadow-md"
                        >
                            {genre}
                        </span>
                    ))}
                </div>
              )}


              {/* 🔑 FIX: Main Download Button (Removed target="_blank") */}
              {downloadUrl && (
                <a
                  href={downloadUrl} // The downloadUrl already points to the signed URL
                  download={`${movieMeta.slug || "movie"}.mp4`} // ⬅️ The key attribute
                  // target="_blank" removed
                  // rel="noopener noreferrer" removed
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-xl font-bold transition duration-300 transform hover:scale-105"
                >
                  <Download className="w-5 h-5" /> Download Movie
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 w-full sm:w-auto px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium transition text-sm sm:text-base border border-gray-700"
        >
          ⬅ Back to Previous Page
        </button>

        {/* Cast Section */}
        {tmdbMeta?.cast?.length > 0 && (
            <>
            <h2 className="text-2xl font-bold mb-4 text-purple-400 border-b border-gray-800 pb-2">Top Cast</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-4 mb-8">
                {tmdbMeta.cast.map((actor, index) => (
                    <div key={index} className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full overflow-hidden mb-2 border-2 border-gray-700">
                            {actor.profile_url ? (
                                <img 
                                    src={actor.profile_url} 
                                    alt={actor.name} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User className="w-full h-full p-2 text-gray-500" />
                            )}
                        </div>
                        <p className="text-xs font-semibold truncate w-full text-gray-200">{actor.name}</p>
                        <p className="text-[10px] text-gray-400 italic truncate w-full">as {actor.character}</p>
                    </div>
                ))}
            </div>
            </>
        )}


        {/* Server Buttons */}
        {servers.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">Select Server</h2>
            <div className="flex flex-wrap gap-3 mb-5 p-3 bg-gray-800 rounded-lg shadow-inner">
                {servers.map((server, index) => (
                <button
                    key={index}
                    onClick={() => setActiveSrc(server)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeSrc?.src === server.src
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/50"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    }`}
                >
                    {server.name}
                </button>
                ))}
            </div>
          </div>
        )}

        {/* Player */}
        {activeSrc ? (
          <div
            className="w-full max-w-full mx-auto rounded-xl overflow-hidden shadow-2xl bg-black relative border-4 border-gray-800"
            style={{ aspectRatio: "16/9" }}
          >
            {activeSrc.type === "video" ? (
              <iframe
                src={activeSrc.src}
                title={`Video Player for ${movieMeta.slug}`}
                loading="eager"
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
        ) : episodes.length === 0 && servers.length > 0 ? (
          <p className="text-center text-gray-400 mt-4 p-4 bg-gray-800 rounded-lg">⚠️ Please select a server to watch the content.</p>
        ) : null}

        {/* Episodes */}
        {episodes.length > 0 && (
          <div className="mt-8 bg-gray-800 p-4 rounded-xl">
            {/* Header with arrow */}
            <button
              onClick={() => setShowEpisodes((prev) => !prev)}
              className="flex items-center gap-2 text-xl font-semibold text-yellow-400 focus:outline-none w-full pb-2"
            >
              📺 Episodes ({episodes.length})
              <span
                className={`ml-auto inline-block transition-transform duration-200 ${
                  showEpisodes ? "rotate-180" : "rotate-0"
                }`}
              >
                ▼
              </span>
            </button>

            {/* Episode list (only show if expanded) */}
            {showEpisodes && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 max-h-64 overflow-y-auto custom-scroll">
                {episodes.map((ep, index) => {
                    const epTitle = ep.title || `Episode ${index + 1}`;
                    return (
                        <div key={index} className="flex gap-2 p-1 bg-gray-700 rounded-lg border border-gray-600">
                            {/* Play Button */}
                            <button
                                onClick={() =>
                                    setActiveSrc(
                                        ep.direct_url
                                        ? { name: epTitle, type: "video", src: ep.direct_url }
                                        : { name: epTitle, type: "html", src: ep.html }
                                    )
                                }
                                className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm font-medium text-gray-200 truncate"
                            >
                                {epTitle}
                            </button>

                            {/* 🔑 FIX: Download Button for Episode (Removed target="_blank") */}
                            {ep.direct_url && (
                                <a
                                    href={ep.direct_url}
                                    download={`${movieMeta.slug}-${epTitle}.mp4`} // ⬅️ The key attribute
                                    // target="_blank" removed
                                    // rel="noopener noreferrer" removed
                                    title={`Download ${epTitle}`}
                                    className="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition flex-shrink-0"
                                >
                                    <Download className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                    );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchHtmlPage; 