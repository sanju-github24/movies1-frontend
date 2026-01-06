import React, { useState, useEffect, useMemo, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { MagnifyingGlassIcon, XMarkIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Helmet } from "react-helmet";
import { Loader2, Play, X, Star, TrendingUp, Info } from "lucide-react";
import { AppContext } from "../context/AppContext";

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
  const [selectedMovie, setSelectedMovie] = useState(null); // For Mobile Detail Overlay
  const [recentSearches, setRecentSearches] = useState([
    "Special Ops", "Thudarum", "Harry Potter", "Tsunami", "Ziddi Ishq"
  ]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("watch_html")
        .select("*")
        .gt("created_at", oneWeekAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentMovies(data || []);
    } catch (err) {
      console.error("Error fetching recent movies:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async (query) => {
    try {
      const { data, error } = await supabase
        .from("watch_html")
        .select("*")
        .ilike("title", `%${query}%`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  /* 🚀 Related Movies Logic for Detail Overlay */
  const relatedMovies = useMemo(() => {
    if (!selectedMovie) return [];
    const sourceList = searchQuery ? searchResults : recentMovies;
    const targetGenres = selectedMovie.genres || [];
    
    return sourceList
      .filter(m => m.slug !== selectedMovie.slug)
      .filter(m => {
        const mGenres = m.genres || [];
        return mGenres.some(g => targetGenres.includes(g));
      })
      .slice(0, 6);
  }, [selectedMovie, searchResults, recentMovies]);

  const handleMovieClick = (movie) => {
    if (window.innerWidth < 640) {
      setSelectedMovie(movie); // Open Overlay on Mobile
    } else {
      navigate(`/watch/${movie.slug}`); // Direct Navigate on Desktop
    }
  };

  return (
    <div className={`min-h-screen bg-[#0f1014] text-white p-4 md:p-8 pt-24 ${selectedMovie ? 'h-screen overflow-hidden' : ''}`}>
      <Helmet><title>Search | 1Anchormovies</title></Helmet>

      {/* 🔍 Animated Search Bar */}
      <div className="max-w-6xl mx-auto mb-10">
        <div className="relative group">
          <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
          <input
            autoFocus
            type="text"
            placeholder="Movies, shows and more"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-20 pl-16 pr-12 bg-[#16181f] border border-white/5 rounded-2xl text-2xl outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-gray-600 shadow-2xl"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-colors">
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* 🕒 Recent Search Pills */}
      {!searchQuery && recentSearches.length > 0 && (
        <div className="max-w-6xl mx-auto mb-12 flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          {recentSearches.map((term) => (
            <div 
              key={term} 
              onClick={() => setSearchQuery(term)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1e2129] hover:bg-blue-600 border border-white/5 rounded-full transition-all cursor-pointer group"
            >
              <ClockIcon className="w-4 h-4 text-gray-500 group-hover:text-white" />
              <span className="text-sm font-black uppercase tracking-tight text-gray-400 group-hover:text-white">{term}</span>
            </div>
          ))}
        </div>
      )}

      {/* 🎬 Results Grid */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-black mb-8 px-2 border-l-4 border-blue-600 pl-4 uppercase tracking-widest flex items-center gap-3">
          {searchQuery ? <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" /> : <TrendingUp className="w-5 h-5 text-blue-500" />}
          {searchQuery ? `Search Results` : "Recent Uploads This Week"}
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.3em]">Scanning Database</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {(searchQuery ? searchResults : recentMovies).map((movie) => (
              <div 
                key={movie.id}
                onClick={() => handleMovieClick(movie)}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-[#16181f] border border-white/5 cursor-pointer transition-all duration-500 hover:scale-105 hover:border-blue-500 shadow-xl"
              >
                <img
                  src={movie.poster || "/default-poster.jpg"}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:opacity-40 transition-all duration-500"
                />
                
                {/* Desktop Hover Details Card */}
                <div className="hidden sm:flex absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent flex flex-col justify-end p-4 pointer-events-none">
                   <div className="flex items-center gap-2 mb-2">
                      <div className="bg-[#f5c518] text-black px-1 rounded-[2px] font-black text-[8px]">IMDb</div>
                      <span className="text-[10px] font-black text-white">{movie.imdb_rating || "7.5"}</span>
                   </div>
                   <p className="text-[10px] font-black text-blue-400 uppercase mb-1 truncate">{movie.genres?.[0]}</p>
                   <p className="text-sm font-black truncate uppercase italic leading-none mb-3">{movie.title || movie.slug}</p>
                   <div className="flex items-center gap-2">
                      <div className="p-2 bg-white rounded-full text-black"><Play size={12} fill="currentColor" /></div>
                      <span className="text-[9px] font-black uppercase tracking-tighter">Watch Now</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

{/* 📱 Mobile Detail Overlay */}
{selectedMovie && (
  <div 
    className="fixed inset-0 z-[200] bg-gray-950/98 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom duration-500"
    onClick={(e) => e.target === e.currentTarget && setSelectedMovie(null)}
  >
    {/* Close Button */}
    <button 
      onClick={() => setSelectedMovie(null)} 
      className="absolute top-6 right-6 z-[210] p-3 bg-black/50 rounded-full text-white backdrop-blur-md active:scale-90 transition-transform"
    >
      <X size={24} />
    </button>
    
    <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
      {/* Backdrop Image */}
      <div className="relative aspect-video w-full shadow-2xl">
        <img 
          src={selectedMovie.cover_poster || selectedMovie.poster} 
          className="w-full h-full object-cover" 
          alt="" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="px-4 flex flex-col items-center text-center space-y-4 -mt-8 relative z-10">
        
        {/* ✨ Fixed & Smaller Title/Logo Section */}
        {selectedMovie.title_logo ? (
          <img 
            src={selectedMovie.title_logo} 
            className="h-12 w-auto object-contain drop-shadow-2xl mb-2" 
            alt="logo" 
          />
        ) : (
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl">
            {selectedMovie.title || selectedMovie.slug}
          </h3>
        )}
        
        {/* Meta Info */}
        <div className="flex items-center gap-4 text-[10px] font-black text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[3px] font-black text-[8px] leading-none shadow-md">IMDb</div>
            <span className="text-white">{selectedMovie.imdb_rating || "7.5"}</span>
          </div>
          <span>{selectedMovie.year || "2024"}</span>
          <span className="text-blue-400 uppercase tracking-widest">{formatLanguageCount(selectedMovie.language)}</span>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => navigate(`/watch/${selectedMovie.slug}`)} 
          className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] uppercase tracking-widest"
        >
          <Play className="w-5 h-5 fill-current" /> WATCH NOW
        </button>

        {/* Genres */}
        <div className="flex flex-wrap justify-center gap-2">
          {(selectedMovie.genres || []).map((g) => (
            <span key={g} className="px-3 py-1 bg-gray-900 border border-white/5 rounded-full text-[8px] font-black uppercase text-gray-400 tracking-wider">
              {g}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-gray-400 text-xs leading-relaxed max-w-sm italic opacity-80 line-clamp-4">
          {selectedMovie.description}
        </p>

        {/* Related Section (More Like This) */}
        {relatedMovies.length > 0 && (
          <div className="w-full pt-10 text-left border-t border-white/10 mt-8">
            <h4 className="text-base font-black text-white uppercase tracking-widest mb-6 border-l-4 border-blue-600 pl-3">
              More Like This
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {relatedMovies.map((m) => (
                <div 
                  key={m.id} 
                  className="flex flex-col gap-2 group active:scale-95 transition-transform" 
                  onClick={() => { 
                    setSelectedMovie(m); 
                    // Scroll to top of the overlay when a new movie is selected
                    const scrollContainer = document.querySelector('.overflow-y-auto');
                    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' }); 
                  }}
                >
                  <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/5 bg-gray-900 shadow-lg">
                    <img 
                      src={m.poster || "/default-poster.jpg"} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      alt={m.title} 
                    />
                  </div>
                  <span className="text-[8px] font-black text-gray-400 truncate uppercase tracking-tighter">
                    {m.title || m.slug}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default SearchPage;