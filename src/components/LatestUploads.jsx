// src/pages/LatestUploads.jsx
import React, { useEffect, useContext, useState, useMemo } from "react";
import { formatDistanceToNow, subDays, isAfter } from "date-fns";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AppContext } from "../context/AppContext";
import { Clock, Play, Sparkles, LayoutGrid, Calendar, Globe } from "lucide-react";

const LatestUploads = () => {
  const { movies, fetchMovies } = useContext(AppContext);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    fetchMovies();
    return () => clearInterval(id);
  }, []);

  const recentMovies = useMemo(() => {
    return [...movies]
      .filter((movie) => {
        const created = new Date(movie.createdAt || movie.created_at);
        const oneWeekAgo = subDays(new Date(), 7);
        return created > oneWeekAgo;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at);
        const dateB = new Date(b.createdAt || b.created_at);
        return dateB - dateA;
      });
  }, [movies]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-10 py-10 bg-gray-950 min-h-screen" aria-labelledby="weekly-releases">
      <Helmet>
        <title>New Movie Releases This Week | AnchorMovies</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-900 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="relative">
              <Calendar className="w-6 h-6 text-blue-500" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
            </div>
            <h2 id="weekly-releases" className="text-2xl font-black text-white uppercase tracking-tighter">
              Weekly Releases
            </h2>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
            Freshly added in the last 7 days
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-xl border border-white/5">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
            Auto-Updated
          </span>
        </div>
      </div>

      {recentMovies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <LayoutGrid className="w-16 h-16 text-gray-800 mb-4" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
            No new uploads this week.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {recentMovies.map((movie) => {
            const created = new Date(movie.createdAt || movie.created_at);
            const isBrandNew = isAfter(created, subDays(new Date(), 1));
            const timeAgo = isNaN(created) ? "Recently" : formatDistanceToNow(created, { addSuffix: true });

            // LANGUAGE LOGIC: Count languages instead of listing them
            const langArray = Array.isArray(movie.language) 
              ? movie.language 
              : movie.language?.split(',').filter(Boolean) || [];
            
            const langCount = langArray.length;
            const langDisplay = langCount > 1 ? `${langCount} Languages` : (langArray[0] || "Multi Audio");

            return (
              <article key={movie.id || movie.slug} className="group relative bg-gray-900 rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all duration-300 shadow-xl">
                <Link to={`/movie/${movie.slug}`} className="block">
                  <div className="relative aspect-[2/3] overflow-hidden">
                    <img src={movie.poster || "/default-poster.jpg"} alt={movie.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    
                    {isBrandNew && (
                      <div className="absolute top-2 left-2">
                        <span className="flex items-center gap-1 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg">
                          <Sparkles className="w-3 h-3 fill-white" /> NEW
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="text-sm font-bold text-gray-100 group-hover:text-blue-400 transition-colors line-clamp-1 mb-1">
                      {movie.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                      {/* Displays "X Languages" or specific name if only one */}
                      <span className="flex items-center gap-1 text-blue-400/80">
                        <Globe className="w-2.5 h-2.5" /> {langDisplay}
                      </span>
                      <span className="text-gray-600">{timeAgo}</span>
                    </div>
                  </div>
                </Link>

                {movie.watchUrl && (
                  <a href={movie.watchUrl} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 bg-white/10 backdrop-blur-md p-1.5 rounded-lg border border-white/20 hover:bg-green-600 transition-colors">
                    <Play className="w-3 h-3 text-white fill-current" />
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default LatestUploads;