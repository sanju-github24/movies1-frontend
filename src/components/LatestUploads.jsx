import React, { useEffect, useContext, useState } from 'react';
import { formatDistanceToNow, subDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import AdScriptLoader from "../components/AdScriptLoader";

const LatestUploads = () => {
  const { movies, fetchMovies } = useContext(AppContext);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchMovies();
  }, []);

  const recentMovies = movies.filter((movie) => {
    const created = new Date(movie.createdAt || movie.created_at);
    const oneWeekAgo = subDays(new Date(), 7);
    return created > oneWeekAgo;
  });

  return (
    <section className="px-4 sm:px-10 py-8" aria-labelledby="weekly-releases">
      <h2
        id="weekly-releases"
        className="text-2xl font-bold mb-4 text-white bg-blue-600 inline-block px-7 py-3 rounded-md shadow hover:bg-blue-700 transition"
      >
        Week Releases
      </h2>

      <AdScriptLoader />

      {recentMovies.length === 0 ? (
        <p className="text-gray-400">No movies uploaded in the last 7 days.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" role="list">
          {recentMovies.map((movie) => {
            const created = new Date(movie.createdAt || movie.created_at);
            const timeAgo = isNaN(created)
              ? 'Unknown date'
              : formatDistanceToNow(created, { addSuffix: true });

            const languages = Array.isArray(movie.language)
              ? movie.language.join(', ')
              : movie.language || 'Unknown Language';

            const title = movie.title || 'Untitled Movie';
            const poster = movie.poster || '/default-poster.jpg';

            return (
              <article
                key={movie.id || movie.slug}
                className="border border-gray-300 rounded-lg overflow-hidden hover:shadow-lg transition bg-gray-800"
                aria-label={`Movie: ${title}`}
              >
                <Link to={`/movie/${movie.slug}`} title={`View ${title}`}>
                  <img
                    src={poster}
                    alt={`${title} Poster`}
                    onError={(e) => {
                      e.currentTarget.src = '/default-poster.jpg';
                    }}
                    className="w-full h-40 sm:h-56 object-cover"
                  />
                  <div className="p-2 text-center font-medium text-white">
                    <div
                      className="text-sm line-clamp-1 sm:line-clamp-2"
                      title={title}
                    >
                      {title}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {languages} • {timeAgo}
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default LatestUploads;
