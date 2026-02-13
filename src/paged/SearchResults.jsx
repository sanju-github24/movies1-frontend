// src/pages/SearchResults.jsx
import React, { useEffect, useState, useContext } from "react";
import { useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext"; 
import axios from "axios"; 
import { Loader2, Search, PlayCircle, Download, Film, MonitorPlay, ChevronRight, Globe } from "lucide-react";

/* ====== Helper: Robust Slug Generator ====== */
const generateSlug = (title) => {
  return title
    ?.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with -
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing dashes
};

const capitalizeWords = (str) =>
  str?.split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "";

const SearchResults = () => {
  const { backendUrl } = useContext(AppContext); 
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("query")?.toLowerCase() || "";
  const prettyQuery = capitalizeWords(query);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    if (!query) return;
    setLoading(true);

    try {
      const isTmdbId = /^\d+$/.test(query.trim());

      const [moviesRes, watchRes] = await Promise.all([
        supabase.from("movies").select("*"),
        supabase.from("watch_html").select("*"),
      ]);

      const resultsMap = new Map();

      // --- 1. Map Local Streaming Results (watch_html) ---
      (watchRes.data || []).filter(w => w.title?.toLowerCase().includes(query)).forEach((w) => {
        const titleKey = w.title.toLowerCase().trim();
        const safeSlug = w.slug || generateSlug(w.title);
        resultsMap.set(titleKey, {
          id: w.id,
          title: w.title,
          slug: safeSlug,
          type: "streaming",
          image: w.cover_poster || w.poster || "/default-cover.jpg",
          link: `/watch/${safeSlug}`,
          meta: "Library Stream",
          year: w.year || "2025",
          source: "local",
          // Pass full local object
          fullData: w
        });
      });

      // --- 2. Map Local Download Results (movies) ---
      (moviesRes.data || []).filter(m => m.title?.toLowerCase().includes(query)).forEach((m) => {
        const titleKey = m.title.toLowerCase().trim();
        if (!resultsMap.has(titleKey)) {
          const safeSlug = m.slug || generateSlug(m.title);
          resultsMap.set(titleKey, {
            id: m.id,
            title: m.title,
            slug: safeSlug,
            type: "download",
            image: m.poster || "/default-poster.jpg",
            link: `/movie/${safeSlug}`,
            meta: m.language?.[0] || "HD Rip",
            source: "local",
            fullData: m
          });
        }
      });

      // --- 3. TMDB API Fallback & Discovery ---
      try {
        const params = isTmdbId ? { tmdbId: query.trim() } : { title: query.trim() };
        const tmdbRes = await axios.get(`${backendUrl}/api/tmdb-details`, { params });
        
        if (tmdbRes.data.success) {
          const tmdbList = Array.isArray(tmdbRes.data.data) ? tmdbRes.data.data : [tmdbRes.data.data];
          
          tmdbList.forEach((t) => {
            const movieTitle = t.title || t.name || "";
            const titleKey = movieTitle.toLowerCase().trim();
            
            if (!resultsMap.has(titleKey) && titleKey !== "") {
              const tmdbSlug = generateSlug(movieTitle) || t.id;
              
              // 🚀 Correctly mapping required data for Watch Page
              const mappedMovie = {
                tmdb_id: t.tmdb_id || t.id,
                imdb_id: t.imdb_id || null,
                title: movieTitle,
                slug: tmdbSlug,
                poster: t.poster_url || `https://image.tmdb.org/t/p/w500${t.poster_path}`,
                cover_poster: t.cover_poster_url || `https://image.tmdb.org/t/p/original${t.backdrop_path || t.poster_path}`,
                description: t.description || t.overview,
                year: t.year || t.release_date?.split("-")[0] || t.first_air_date?.split("-")[0],
                imdb_rating: t.imdb_rating || t.vote_average?.toFixed(1),
                content_type: t.content_type || (t.first_air_date ? "tv" : "movie"),
                episodes: t.episodes || [], // Passing episodes if available (TV Shows)
                cast: t.cast || [],
                genres: t.genres || []
              };

              resultsMap.set(titleKey, {
                id: t.id,
                title: movieTitle,
                slug: tmdbSlug, 
                type: "streaming",
                image: mappedMovie.cover_poster,
                link: `/watch/${tmdbSlug}`,
                meta: "Global Node",
                year: mappedMovie.year || "Global",
                source: "tmdb",
                // 🚀 This ensures the watch page has the correct object
                movie: mappedMovie 
              });
            }
          });
        }
      } catch (e) {
        console.warn("TMDB Discovery Linkage Failed");
      }

      setResults(Array.from(resultsMap.values()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 font-sans">
      <Helmet>
        <title>Discovery: {prettyQuery} | AnchorMovies</title>
      </Helmet>

      {/* Header */}
      <div className="py-12 px-6 sm:px-10 bg-gradient-to-b from-blue-900/10 to-transparent border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Globe className="animate-pulse" size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Discovery active</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter italic">
            Search Results <span className="text-blue-500">"{prettyQuery}"</span>
          </h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-10 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest text-center">Syncing Local & Global Streams...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-12">
            
            {/* STREAMING SECTION */}
            {results.some(r => r.type === 'streaming') && (
              <section>
                <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <MonitorPlay size={16} className="text-blue-500" /> Instant Access
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.filter(r => r.type === 'streaming').map((item) => (
                    <Link 
                      key={item.id} 
                      to={item.link}
                      state={{ movie: item.source === 'tmdb' ? item.movie : null }}
                      className="group flex flex-col sm:flex-row bg-gray-900/40 rounded-3xl overflow-hidden border border-white/5 hover:border-blue-500/40 transition-all shadow-2xl"
                    >
                      <div className="relative w-full sm:w-56 aspect-video sm:aspect-square overflow-hidden shrink-0">
                        <img src={item.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={item.title} />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayCircle size={40} className="text-white fill-blue-600" />
                        </div>
                        {item.source === 'tmdb' && (
                          <div className="absolute top-3 left-3 bg-yellow-500 text-black text-[8px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-lg">
                            <Globe size={10} /> Discovery
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex flex-col justify-center flex-1">
                        <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-2 block">Premium Stream</span>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-white group-hover:text-blue-400 transition-colors line-clamp-1 italic">
                          {item.title}
                        </h3>
                        <p className="text-gray-500 text-xs mt-2 font-bold uppercase tracking-widest">
                            {item.year} • {item.meta}
                        </p>
                        <div className="mt-6 flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
                            Watch Online <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* DOWNLOAD SECTION */}
            {results.some(r => r.type === 'download') && (
              <section>
                <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Download size={16} className="text-blue-500" /> Available Archives
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {results.filter(r => r.type === 'download').map((item) => (
                    <Link key={item.id} to={item.link} className="group flex flex-col">
                      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 bg-gray-900 group-hover:border-blue-500/50 transition-all shadow-xl">
                        <img src={item.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.title} />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Download size={14} className="text-white" />
                        </div>
                      </div>
                      <h3 className="mt-3 text-[11px] font-black uppercase tracking-tighter truncate text-gray-300 group-hover:text-blue-400 transition-colors px-1">
                        {item.title}
                      </h3>
                      <p className="text-[9px] font-bold text-gray-600 uppercase mt-1 flex items-center gap-1 px-1">
                        <Film size={10} /> {item.meta}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          </div>
        ) : (
          <div className="py-24 text-center bg-gray-900/20 rounded-[3rem] border border-dashed border-gray-800 animate-in fade-in duration-700">
             <Search className="w-16 h-16 mx-auto mb-4 text-gray-800" />
             <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest italic">Node Not Found</h2>
             <p className="text-gray-600 text-sm mt-2 font-medium">Try searching for keywords like "Tamil", "2025", or a specific TMDB ID.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchResults;