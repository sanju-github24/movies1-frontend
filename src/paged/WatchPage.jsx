// src/pages/WatchHtmlPage.jsx

import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import { AppContext } from "../context/AppContext";
import axios from "axios";
// ⭐️ Import Play icon for the trailer & Watch Now button
import { Loader2, Star, User, Download, ChevronDown, ChevronUp, Play } from "lucide-react";

/**
 * Groups episodes into seasons for organized display.
 */
const groupEpisodesBySeason = (episodes) => {
  const grouped = episodes.reduce((acc, episode, globalIndex) => {
    const seasonNumber = episode?.season && !isNaN(Number(episode.season)) ? Number(episode.season) : 1;
    const seasonKey = `S${seasonNumber}`;
    const seasonName = `Season ${seasonNumber}`;

    if (!acc[seasonKey]) {
      acc[seasonKey] = {
        name: seasonName,
        episodes: [],
        episodeCounter: 0,
      };
    }

    acc[seasonKey].episodeCounter += 1;

    acc[seasonKey].episodes.push({
      ...episode,
      globalIndex,
      seasonNumber,
      episodeNumberInSeason: acc[seasonKey].episodeCounter,
    });

    return acc;
  }, {});

  return grouped;
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch (e) {
    return dateString;
  }
};

const CastSection = React.memo(({ tmdbMeta }) => {
  const [showFullCast, setShowFullCast] = useState(false);
  const CAST_LIMIT = 7;

  if (!tmdbMeta?.cast?.length) return null;
  const allCast = tmdbMeta.cast;
  const displayedCast = showFullCast ? allCast : allCast.slice(0, CAST_LIMIT);
  const needsToggle = allCast.length > CAST_LIMIT;

  return (
    <>
      <h2 className="text-2xl font-bold mb-4 text-purple-400 border-b border-gray-800 pb-2">Top Cast</h2>
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-4 mb-4">
        {displayedCast.map((actor, index) => (
          <div key={index} className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full overflow-hidden mb-2 border-2 border-gray-700">
              {actor.profile_url ? (
                <img src={actor.profile_url} alt={actor.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-full h-full p-2 text-gray-500" />
              )}
            </div>
            <p className="text-xs font-semibold truncate w-full text-gray-200">{actor.name}</p>
            <p className="text-[10px] text-gray-400 italic truncate w-full">as {actor.character}</p>
          </div>
        ))}
      </div>

      {needsToggle && (
        <div className="text-center mb-8">
          <button
            onClick={() => setShowFullCast((prev) => !prev)}
            className="inline-flex items-center text-sm font-medium text-purple-400 hover:text-purple-300 transition focus:outline-none"
          >
            {showFullCast ? (
              <>
                Show Less <ChevronUp className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Show All {allCast.length} Cast Members <ChevronDown className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
});

const OverviewSection = React.memo(({ tmdbMeta }) => {
  if (!tmdbMeta?.description) return null;
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-green-400 border-b border-gray-800 pb-2">Overview</h2>
      <p className="text-gray-300 leading-relaxed text-base">{tmdbMeta.description}</p>
    </div>
  );
});

// Main Page
const WatchHtmlPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [movieMeta, setMovieMeta] = useState(null);
  const [tmdbMeta, setTmdbMeta] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [servers, setServers] = useState([]);
  const [activeSrc, setActiveSrc] = useState(null);
  const [activeEpisode, setActiveEpisode] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);

  const groupedEpisodes = useMemo(() => groupEpisodesBySeason(episodes), [episodes]);

  const allPlayableSources = useMemo(() => {
    const displayServers = servers.map((s) => ({
      ...s,
      display: s.name,
      isEpisode: false,
    }));

    const episodeServers = episodes
      .map((ep, index) => {
        const seasonNumber = ep?.season && !isNaN(Number(ep.season)) ? Number(ep.season) : 1;
        const epTitle = `E${(index + 1).toString().padStart(2, "0")}`;

        if (ep.direct_url || ep.html) {
          return {
            name: epTitle,
            type: ep.direct_url ? "video" : "html",
            src: ep.direct_url || ep.html,
            isEpisode: true,
            episode: ep,
            index,
          };
        }
        return null;
      })
      .filter(Boolean);

    return [...displayServers, ...episodeServers];
  }, [servers, episodes]);

  const playerOverlayData = useMemo(
    () => ({
      logoUrl: movieMeta?.titleLogoUrl,
      title: movieMeta?.title,
      imdbRating: movieMeta?.imdbRating,
      year: movieMeta?.year,
      overview: tmdbMeta?.description,
      genres: tmdbMeta?.genres?.join(", ") || null,
      slug: movieMeta?.slug,
      language: tmdbMeta?.original_language || null,
    }),
    [movieMeta, tmdbMeta]
  );

  const fetchTmdbMetadata = useCallback(
    async (id) => {
      if (!backendUrl || !id) return null;
      try {
        const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params: { imdbId: id } });
        if (res.data.success && res.data.data) return res.data.data;
      } catch (err) {
        console.error("TMDB metadata fetch error:", err.message);
      }
      return null;
    },
    [backendUrl]
  );

  const handleEpisodeSelect = (episode, allEpisodes = episodes) => {
    const seasonNumber = episode?.season && !isNaN(Number(episode.season)) ? Number(episode.season) : 1;
    const globalIndex = allEpisodes.findIndex((ep) => ep === episode);
    const episodeTitle = `S${seasonNumber.toString().padStart(2, "0")}E${globalIndex !== -1 ? (globalIndex + 1).toString().padStart(2, "0") : "01"} - ${episode.title || "Untitled"}`;

    let newActiveSrc = null;

    if (episode.direct_url) newActiveSrc = { name: episodeTitle, type: "video", src: episode.direct_url, isEpisode: true };
    else if (episode.html) newActiveSrc = { name: episodeTitle, type: "html", src: episode.html, isEpisode: true };
    else newActiveSrc = null;

    setActiveSrc(newActiveSrc);
    setActiveEpisode(episode);
    setPlayerKey((prev) => prev + 1);
  };

  const handleBackToPreviousPage = useCallback(() => navigate(-1), [navigate]);

  const handleWatchNow = useCallback(() => {
    if (!activeSrc) return;
    navigate("/player", { state: { src: activeSrc, movieMeta, tmdbMeta } });
  }, [navigate, activeSrc, movieMeta, tmdbMeta]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);

      const { data: watchData, error } = await supabase
        .from("watch_html")
        .select("id, slug, title, poster, cover_poster, video_url, html_code, direct_url, episodes, imdb_rating, html_code2, imdb_id, title_logo")
        .eq("slug", slug)
        .single();

      if (error || !watchData || !watchData.imdb_id) {
        if (isMounted) setMovieMeta({ title: "Not Found 🚫" });
        setLoading(false);
        return;
      }

      const primaryImdbId = watchData.imdb_id;
      const tmdbResult = await fetchTmdbMetadata(primaryImdbId);
      if (isMounted) setTmdbMeta(tmdbResult);

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
          releaseDate: tmdbResult?.release_date || null,
          titleLogoUrl: watchData.title_logo || null,
        });
      }

      // ---- Build servers with explicit Watch 1 / Watch 2 / Watch 3 naming ----
      const availableServers = [];
      let freshDirectUrl = null;

      // Priority: video_url -> Watch 1
      if (watchData.video_url) {
        availableServers.push({ name: "Watch 1", type: "video", src: watchData.video_url, isMain: true });
      }

      // If direct_url exists and backend resolves a direct download URL, add it as Watch 1 (Direct/HLS) after video_url (still Watch 1 variant)
      if (watchData.direct_url && backendUrl) {
        try {
          const res = await axios.get(`${backendUrl}/api/videos/${watchData.direct_url}/download`);
          if (res.data?.directDownloadUrl) {
            freshDirectUrl = res.data.directDownloadUrl;
            // If we already added Watch 1 (video_url), keep both but mark this as "Watch 1 (Direct/HLS)" to distinguish
            availableServers.push({ name: "Watch 1 (Direct/HLS)", type: "video", src: freshDirectUrl, isMain: true });
          }
        } catch (err) {
          console.error("❌ Failed to fetch direct video URL:", err);
        }
      }

      // html_code -> Watch 2
      if (watchData.html_code) {
        availableServers.push({ name: "Watch 2", type: "html", src: watchData.html_code, isMain: true });
      }

      // html_code2 -> Watch 3
      if (watchData.html_code2) {
        availableServers.push({ name: "Watch 3", type: "html", src: watchData.html_code2, isMain: true });
      }

      const parsedEpisodes = Array.isArray(watchData.episodes) ? watchData.episodes : [];

      if (isMounted) {
        setServers(availableServers);

        if (availableServers.length > 0) {
          setActiveSrc(availableServers[0]);
          setActiveEpisode(null);
        } else if (parsedEpisodes.length > 0) {
          handleEpisodeSelect(parsedEpisodes[0], parsedEpisodes);
        }

        setDownloadUrl(freshDirectUrl || "");
        setEpisodes(parsedEpisodes);
        setLoading(false);
      }
    };

    fetchData();
    setPlayerKey((prev) => prev + 1);

    return () => {
      isMounted = false;
    };
  }, [slug, backendUrl, fetchTmdbMetadata]);

  useEffect(() => {
    if (movieMeta?.title) {
      document.title = `Watch ${movieMeta.title} | MovieStream`;
      let meta = document.querySelector("meta[name='description']");
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = `Watch ${movieMeta.title} online in HD. Stream or download easily.`;
    }
  }, [movieMeta]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
      </div>
    );

  if (movieMeta?.title === "Not Found 🚫")
    return (
      <div className="min-h-screen bg-gray-950 text-white pt-20 text-center">
        <h1 className="text-3xl text-red-500">404 - Movie Not Found</h1>
        <p className="text-gray-400 mt-2">The movie slug "{slug}" does not match any entry or lacks a valid IMDb ID.</p>
        <Link to="/" className="text-blue-400 hover:text-blue-300 mt-4 block">
          Go to Homepage
        </Link>
      </div>
    );

  const currentSourceKey = activeSrc?.src;
  const formattedReleaseDate = formatDate(movieMeta?.releaseDate);
  const trailerUrl = tmdbMeta?.trailer_url;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
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

      {/* Hero */}
      {movieMeta && (
        <div className="relative w-full bg-black">
          {movieMeta.background && (
            <div className="hidden sm:block absolute inset-0 bg-cover bg-center transition-opacity duration-500" style={{ backgroundImage: `url(${movieMeta.background})`, filter: "brightness(0.35)", backgroundPosition: "top" }} />
          )}
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />

          <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-16 flex flex-col sm:flex-row gap-8 items-center sm:items-start">
            <img src={movieMeta.poster} alt={movieMeta.slug} className="w-44 sm:w-64 rounded-xl shadow-2xl border-4 border-gray-800 z-10 object-cover" style={{ aspectRatio: "2/3" }} onError={(e) => (e.currentTarget.src = "/poster.png")} />

            <div className="text-center sm:text-left z-10 pt-4">
              <h1 className="text-4xl sm:text-6xl font-extrabold mb-2 drop-shadow-lg text-blue-400">{movieMeta.slug}</h1>

              {movieMeta.year && <p className="text-xl sm:text-2xl font-semibold text-gray-300 mb-4">{formattedReleaseDate ? formattedReleaseDate : `(${movieMeta.year})`}</p>}

              {movieMeta.imdbRating && (
                <p className="text-xl font-bold text-yellow-400 mb-4 flex items-center justify-center sm:justify-start">
                  <Star className="w-6 h-6 fill-yellow-400 mr-2" />
                  <span className="text-white">{movieMeta.imdbRating}</span>
                </p>
              )}

              {trailerUrl && (
                <a href={trailerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xl transition transform hover:scale-[1.02] active:scale-95 mb-6">
                  <Play className="w-5 h-5 mr-2 fill-white" />
                  Watch Trailer
                </a>
              )}

              {tmdbMeta?.genres?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 justify-center sm:justify-start">
                  {tmdbMeta.genres.map((genre, index) => (
                    <span key={index} className="px-3 py-1 text-xs font-medium text-gray-200 bg-gray-700/70 rounded-full border border-gray-600/50 shadow-md">{genre}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <CastSection tmdbMeta={tmdbMeta} />
        <OverviewSection tmdbMeta={tmdbMeta} />

        <h2 className="text-2xl font-bold mt-8 mb-4 text-blue-400">
          {episodes.length > 0 && activeSrc?.isEpisode ? `Now Playing: ${activeSrc.name}` : `Select Source for: ${movieMeta?.slug || "Movie"}`}
        </h2>

        {allPlayableSources.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-5 p-3 bg-gray-800 rounded-lg shadow-inner">
              <div className="flex flex-wrap gap-3">
                {allPlayableSources.map((source, index) => (
                  <button
                    key={index}
                    onClick={() => (source.isEpisode ? handleEpisodeSelect(source.episode) : setActiveSrc(source))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      currentSourceKey === source.src ? "bg-blue-600 text-white shadow-md shadow-blue-500/50" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    }`}
                  >
                    {source.name}
                  </button>
                ))}
              </div>

              <div className="ml-auto">
                <button
                  onClick={handleWatchNow}
                  disabled={!activeSrc}
                  className={`inline-flex items-center px-5 py-2 rounded-lg font-semibold transition ${
                    !activeSrc ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  }`}
                  title={!activeSrc ? "Select a source first" : "Open player"}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Episodes */}
        {episodes.length > 0 && (
          <div className="mt-8 bg-gray-800 p-4 rounded-xl">
            <button onClick={() => setShowEpisodes((prev) => !prev)} className="flex items-center gap-2 text-xl font-semibold text-yellow-400 focus:outline-none w-full pb-2 border-b border-gray-700/50">
              📺 Full Episode List
              <span className={`ml-auto inline-block transition-transform duration-200`}>{showEpisodes ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
            </button>

            {showEpisodes && (
              <div className="mt-4 max-h-96 overflow-y-auto pr-2 custom-scroll space-y-4">
                {Object.entries(groupedEpisodes).map(([seasonKey, seasonData]) => (
                  <div key={seasonKey} className="border border-gray-700 rounded-lg p-3 bg-gray-700/50">
                    <h3 className="text-lg font-bold text-green-300 mb-3">{seasonData.name}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {seasonData.episodes.map((episode) => {
                        const titleText = `E${episode.episodeNumberInSeason.toString().padStart(2, "0")}`;
                        const fullTitle = episode.title ? `${titleText}: ${episode.title}` : titleText;
                        const episodeSource = episode.direct_url || episode.html;
                        const isCurrent = currentSourceKey === episodeSource;
                        const episodeToPass = episode;

                        return (
                          <button
                            key={episode.globalIndex}
                            onClick={() => handleEpisodeSelect(episodeToPass, episodes)}
                            disabled={!episode.direct_url && !episode.html}
                            className={`p-3 rounded-lg text-center text-xs sm:text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              isCurrent ? "bg-red-600 text-white shadow-lg shadow-red-500/50 scale-105" : "bg-gray-800 hover:bg-gray-600 text-gray-300"
                            }`}
                          >
                            {fullTitle}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
