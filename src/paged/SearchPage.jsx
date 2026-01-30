import React, { useState, useEffect, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Helmet } from "react-helmet";
import { Loader2, Play, X, TrendingUp, Globe, ListVideo } from "lucide-react";
import { AppContext } from "../context/AppContext";
import axios from "axios";

/* ====== Helper: Format Language Display ====== */
const formatLanguageCount = (langs) => {
  const langArray = Array.isArray(langs) ? langs : [langs];
  if (langArray.length <= 1) return langArray[0] || "Unknown";
  return `${langArray.length} Languages`;
};

const SearchPage = () => {
  const { backendUrl } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentMovies, setRecentMovies] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [recentSearches, setRecentSearches] = useState([
    "Special Ops", "Thudarum", "Harry Potter", "Tsunami", "Ziddi Ishq"
  ]);
  const navigate = useNavigate();

  // Initial load: Fetch recent uploads from DB
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("watch_html")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(12);

        if (error) throw error;
        setRecentMovies(data || []);
      } catch (err) {
        console.error("Initial fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 🚀 Core Feature: Unified Database + TMDB Search Engine
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        performUnifiedSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performUnifiedSearch = async (query) => {
    setIsSearching(true);
    try {
      // 1. Parallel Search: local DB and TMDB API
      const dbPromise = supabase
        .from("watch_html")
        .select("*")
        .ilike("title", `%${query}%`)
        .limit(12);

      const tmdbPromise = axios.get(`${backendUrl}/api/tmdb-details`, { 
        params: { title: query } 
      }).catch(() => null);

      const [dbResponse, tmdbResponse] = await Promise.all([dbPromise, tmdbPromise]);

      let finalResults = [...(dbResponse.data || [])];
      
      // 3. Process TMDB Results & Deduplicate
      if (tmdbResponse?.data?.success) {
        const tmdb = tmdbResponse.data.data;
        
        const tmdbFormatted = {
          id: `tmdb-${tmdb.tmdb_id}`,
          title: tmdb.title,
          slug: tmdb.slug,
          poster: tmdb.poster_url,
          cover_poster: tmdb.cover_poster_url,
          description: tmdb.description,
          imdb_rating: tmdb.imdb_rating,
          year: tmdb.year,
          genres: tmdb.genres,
          language: [tmdb.original_language],
          title_logo: tmdb.title_logo,
          // 🚀 ADDED: Explicitly passing IMDb ID for the Watch page
          imdb_id: tmdb.imdb_id,
          tmdb_id: tmdb.tmdb_id,
          content_type: tmdb.content_type,
          episodes: tmdb.episodes || [], 
          trailer_codes: tmdb.trailer_key,
          isTmdbOnly: true 
        };

        const existsInDb = finalResults.some(m => 
          m.title.toLowerCase().trim() === tmdbFormatted.title.toLowerCase().trim()
        );

        if (!existsInDb) {
          finalResults.push(tmdbFormatted);
        }
      }
      
      setSearchResults(finalResults);
    } catch (err) {
      console.error("Unified search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMovieClick = (movie) => {
    if (window.innerWidth < 640) {
      setSelectedMovie(movie);
    } else {
      // 🚀 Passing full movie object including imdb_id to WatchHtmlPage
      navigate(`/watch/${movie.slug}`, { state: { movie } });
    }
  };

  return (
    <div className={`min-h-screen bg-[#0f1014] text-white p-4 md:p-8 pt-24 ${selectedMovie ? 'overflow-hidden' : ''}`}>
      <Helmet><title>Cinema Search | 1Anchormovies</title></Helmet>

      {/* 🔍 Search Input Area */}
      <div className="max-w-6xl mx-auto mb-10">
        <div className="relative group">
          <MagnifyingGlassIcon className={`absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 transition-colors ${isSearching ? 'text-blue-500 animate-pulse' : 'text-gray-500 group-focus-within:text-blue-500'}`} />
          <input
            autoFocus
            type="text"
            placeholder="Search our database and global library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-20 pl-16 pr-12 bg-[#16181f] border border-white/5 rounded-2xl text-2xl outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-gray-600 shadow-2xl"
          />
          {searchQuery && !isSearching && (
            <button onClick={() => setSearchQuery("")} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-colors">
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-black mb-8 px-2 border-l-4 border-blue-600 pl-4 uppercase tracking-[0.2em] flex items-center gap-3">
          {searchQuery ? <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" /> : <TrendingUp className="w-5 h-5 text-blue-500" />}
          {searchQuery ? `Unified Cinema Results` : "Recent Highlights"}
        </h2>

        {loading && !searchQuery ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-gray-400 font-mono text-[10px] uppercase tracking-[0.4em]">Syncing Engines</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {(searchQuery ? searchResults : recentMovies).map((movie) => (
              <div 
                key={movie.id || movie.tmdb_id}
                onClick={() => handleMovieClick(movie)}
                className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#16181f] border border-white/5 cursor-pointer transition-all duration-500 hover:scale-105 hover:border-blue-500 shadow-2xl"
              >
                <img src={movie.poster || "/default-poster.jpg"} alt={movie.title} className="w-full h-full object-cover group-hover:opacity-30 transition-all duration-700" />
                
                {movie.isTmdbOnly && (
                  <div className="absolute top-2 right-2 bg-blue-600/80 backdrop-blur-md px-2 py-1 rounded text-[7px] font-black uppercase flex items-center gap-1 border border-blue-400/30">
                    <Globe size={8} /> Global Result
                  </div>
                )}

                <div className="hidden sm:flex absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent flex flex-col justify-end p-5 pointer-events-none">
                   <div className="flex items-center gap-2 mb-2">
                      <div className="bg-[#f5c518] text-black px-1.5 rounded-[3px] font-black text-[9px]">IMDb</div>
                      <span className="text-[10px] font-black text-white">{movie.imdb_rating || "7.5"}</span>
                   </div>
                   
                   {movie.content_type === 'tv' && (
                     <div className="flex items-center gap-1 text-[9px] font-black text-yellow-500 uppercase mb-1">
                        <ListVideo size={10} /> {movie.episodes?.length || 0} Episodes
                     </div>
                   )}

                   <p className="text-[10px] font-black text-blue-400 uppercase mb-1 truncate">{movie.genres?.[0]}</p>
                   <p className="text-sm font-black truncate uppercase italic leading-none mb-3">{movie.title}</p>
                   <div className="flex items-center gap-2">
                      <div className="p-2 bg-white rounded-full text-black shadow-xl"><Play size={10} fill="currentColor" /></div>
                      <span className="text-[9px] font-black uppercase tracking-tighter">Enter Cinema</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📱 Mobile Dynamic Detail Overlay */}
      {selectedMovie && (
        <div className="fixed inset-0 z-[200] bg-gray-950/98 backdrop-blur-3xl flex flex-col animate-in fade-in slide-in-from-bottom duration-500" onClick={(e) => e.target === e.currentTarget && setSelectedMovie(null)}>
          <button onClick={() => setSelectedMovie(null)} className="absolute top-6 right-6 z-[210] p-4 bg-black/50 rounded-full text-white backdrop-blur-md active:scale-90 transition-transform">
            <X size={28} />
          </button>
          
          <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
            <div className="relative aspect-video w-full shadow-2xl bg-black">
              <img src={selectedMovie.cover_poster || selectedMovie.poster} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
            </div>

            <div className="px-6 flex flex-col items-center text-center space-y-6 -mt-10 relative z-10">
              {selectedMovie.title_logo ? (
                <img src={selectedMovie.title_logo} className="h-14 w-auto object-contain drop-shadow-2xl mb-2" alt="logo" />
              ) : (
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl">{selectedMovie.title}</h3>
              )}
              
              <div className="flex items-center gap-5 text-[11px] font-black text-gray-400">
                <div className="flex items-center gap-1.5">
                  <div className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[4px] font-black text-[9px] shadow-lg">IMDb</div>
                  <span className="text-white drop-shadow-md">{selectedMovie.imdb_rating || "7.5"}</span>
                </div>
                <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">{selectedMovie.year || "2024"}</span>
                <span className="text-blue-400 uppercase tracking-widest">{formatLanguageCount(selectedMovie.language)}</span>
              </div>

              {/* 🚀 Navigation with IMDb ID passed in state */}
              <button onClick={() => navigate(`/watch/${selectedMovie.slug}`, { state: { movie: selectedMovie } })} className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg uppercase tracking-widest font-black">
                <Play className="w-5 h-5 fill-current" /> WATCH NOW
              </button>

              {selectedMovie.content_type === 'tv' && (
                <div className="bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Full Series Meta Loaded</span>
                </div>
              )}

              <p className="text-gray-300 text-sm leading-relaxed max-w-sm italic opacity-80 font-medium px-2 line-clamp-5">{selectedMovie.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;