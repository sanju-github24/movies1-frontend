// src/pages/SearchResults.jsx
import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "../utils/supabaseClient";
import { Loader2, Search, PlayCircle, Download, Film, MonitorPlay, ChevronRight } from "lucide-react";

const capitalizeWords = (str) =>
  str?.split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "";

const SearchResults = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("query")?.toLowerCase() || "";
  const prettyQuery = capitalizeWords(query);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    if (!query) return;
    setLoading(true);

    try {
      const [moviesRes, watchRes] = await Promise.all([
        supabase.from("movies").select("*"),
        supabase.from("watch_html").select("*"),
      ]);

      const movies = moviesRes.data || [];
      const watchHtml = watchRes.data || [];

      const filteredMovies = movies.filter((movie) => {
        const titleMatch = movie.title?.toLowerCase().includes(query);
        const langMatch = movie.language?.some((l) => l.toLowerCase().includes(query));
        return titleMatch || langMatch;
      });

      const filteredWatch = watchHtml.filter((item) =>
        item.title?.toLowerCase().includes(query)
      );

      const resultsMap = new Map();

      // Downloadable Movies (Vertical)
      filteredMovies.forEach((m) => {
        resultsMap.set(m.title.toLowerCase().trim(), {
          id: m.id,
          title: m.title,
          slug: m.slug,
          type: "download",
          image: m.poster || "/default-poster.jpg",
          link: `/movie/${m.slug}`,
          meta: m.language?.[0] || "HD Rip",
        });
      });

      // Streaming Movies (Horizontal/Wide)
      filteredWatch.forEach((w) => {
        const titleKey = w.title.toLowerCase().trim();
        resultsMap.set(titleKey, {
          id: w.id,
          title: w.title,
          slug: w.slug,
          type: "streaming",
          // Prioritize Wide Cover Poster for Streaming
          image: w.cover_poster || w.poster || "/default-cover.jpg",
          link: `/watch/${w.slug}`,
          meta: "Direct Stream",
          year: w.year || "2025"
        });
      });

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
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <Helmet>
        <title>Search: {prettyQuery} | AnchorMovies</title>
      </Helmet>

      {/* Header */}
      <div className="py-12 px-6 sm:px-10 bg-gradient-to-b from-blue-900/10 to-transparent border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Search size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Discovery Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter italic">
            Results for <span className="text-blue-500">"{prettyQuery}"</span>
          </h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-10 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Searching Database...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-12">
            
            {/* STREAMING SECTION (Wide Cards) */}
            {results.some(r => r.type === 'streaming') && (
              <section>
                <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <MonitorPlay size={16} className="text-blue-500" /> Watch Online
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.filter(r => r.type === 'streaming').map((item) => (
                    <Link 
                      key={item.id} 
                      to={item.link}
                      className="group flex flex-col sm:flex-row bg-gray-900 rounded-3xl overflow-hidden border border-white/5 hover:border-blue-500/40 transition-all shadow-2xl"
                    >
                      <div className="relative w-full sm:w-56 aspect-video sm:aspect-square overflow-hidden shrink-0">
                        <img src={item.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayCircle size={40} className="text-white fill-blue-600" />
                        </div>
                      </div>
                      <div className="p-6 flex flex-col justify-center flex-1">
                        <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-2 block">Premium Streaming</span>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-white group-hover:text-blue-400 transition-colors line-clamp-1 italic">
                          {item.slug}
                        </h3>
                        <p className="text-gray-500 text-xs mt-2 font-bold uppercase tracking-widest">{item.year} • Multi-Audio</p>
                        <div className="mt-6 flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest">
                            Watch Now <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* DOWNLOAD SECTION (Poster Cards) */}
            {results.some(r => r.type === 'download') && (
              <section>
                <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Download size={16} className="text-blue-500" /> Available Downloads
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {results.filter(r => r.type === 'download').map((item) => (
                    <Link key={item.id} to={item.link} className="group flex flex-col">
                      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 bg-gray-900 group-hover:border-blue-500/50 transition-all shadow-xl">
                        <img src={item.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Download size={14} className="text-white" />
                        </div>
                      </div>
                      <h3 className="mt-3 text-xs font-black uppercase tracking-tighter truncate text-gray-300 group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[10px] font-bold text-gray-600 uppercase mt-1 flex items-center gap-1">
                        <Film size={10} /> {item.meta}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          </div>
        ) : (
          <div className="py-20 text-center bg-gray-900/20 rounded-3xl border border-dashed border-gray-800">
             <Search className="w-16 h-16 mx-auto mb-4 text-gray-800" />
             <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest">No Matches Found</h2>
             <p className="text-gray-600 text-sm mt-2 font-medium">Try searching for keywords like "Tamil", "2025", or a specific title.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchResults;