// src/pages/LatestUploads.jsx
import React, { useEffect, useState } from 'react';
import { formatDistanceToNow, subDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';   // ← make sure this exists

const LatestUploads = () => {
  const [movies, setMovies]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick]       = useState(0);          // forces “time‑ago” refresh

  /* 🔄 auto‑refresh “x minutes ago” every 60 s */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  /* 🗄️ fetch last‑week movies from Supabase */
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);

      // 1 week ago (UTC)
      const oneWeekAgo = subDays(new Date(), 7).toISOString();

      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .gte('createdAt', oneWeekAgo)          // created in last 7 days
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error.message);
        setMovies([]);
      } else {
        setMovies(data || []);
      }
      setLoading(false);
    };

    fetchMovies();
  }, []);  // run once on mount

  return (
    <div className="px-4 sm:px-10 py-8">
      <h2 className="text-2xl font-bold mb-4 text-white bg-blue-600 inline-block px-7 py-3 rounded-md shadow hover:bg-blue-700 transition">
        Week Releases
      </h2>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : movies.length === 0 ? (
        <p className="text-gray-400">No movies uploaded in the last 7 days.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {movies.map((movie) => {
            const created = new Date(movie.createdAt);
            const timeAgo =
              isNaN(created)
                ? 'Unknown date'
                : formatDistanceToNow(created, { addSuffix: true });

            const languages = Array.isArray(movie.language)
              ? movie.language.join(', ')
              : movie.language || 'Unknown Language';

            return (
              <Link
                key={movie.id || movie.slug}
                to={`/movie/${movie.slug}`}
                className="border border-gray-300 rounded-lg overflow-hidden hover:shadow-lg transition block bg-gray-800"
              >
                <img
                  src={movie.poster || '/default-poster.jpg'}
                  alt={movie.title}
                  onError={(e) => { e.currentTarget.src = '/default-poster.jpg'; }}
                  className="w-full h-56 object-cover"
                />
                <div className="p-2 text-center font-medium text-white">
                  {movie.title || 'Untitled Movie'}
                  <div className="text-xs text-gray-400 mt-1">
                    {languages} • {timeAgo}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LatestUploads;

