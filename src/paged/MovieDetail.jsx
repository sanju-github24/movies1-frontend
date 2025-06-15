import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { backendUrl } from '../utils/api';

const MovieDetail = () => {
  const { code } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovie = async () => {
      if (!code) return;

      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('slug', code)
        .maybeSingle();

      if (error) {
        console.error('Supabase fetch error:', error.message);
        setMovie(null);
      } else {
        setMovie(data);
      }

      setLoading(false);
    };

    fetchMovie();
  }, [code]);

  const handleDownload = (url, filename) => {
    const fullUrl = `${backendUrl}/proxy-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    const a = document.createElement('a');
    a.href = fullUrl;
    a.setAttribute('download', filename);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return <div className="text-white text-center mt-20">Loading...</div>;
  }

  if (!movie) {
    return (
      <div className="text-center text-white mt-20">
        <h2 className="text-2xl font-bold">Movie Not Found</h2>
        <p className="text-sm text-gray-400 mt-2">
          The movie you are looking for does not exist or may have been removed.
        </p>
      </div>
    );
  }

  const firstDownload = movie.downloads?.[0];
  const topTitle = `${movie.title || ''} - ${firstDownload?.format || 'Format Unknown'}`;

  return (
    <div className="flex justify-center mt-24 px-2 sm:px-6 md:px-10 w-full bg-black">
      <div className="bg-white text-black rounded-xl p-6 w-full max-w-7xl shadow-2xl">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 break-words leading-snug px-2">
  {topTitle}
</h1>

        <hr className="border-t-2 border-gray-300 mb-6 w-1/2 mx-auto" />

        <div className="flex justify-center mb-8">
          <img
            src={movie.poster || 'https://via.placeholder.com/400x600?text=No+Image'}
            alt={movie.title || 'Movie Poster'}
            className="rounded-lg shadow-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl"
          />
        </div>

        <div className="space-y-10">
          {movie.downloads?.map((download, index) => {
            const quality = download.quality || 'Unknown';
            const format = download.format || 'Unknown Format';
            const filename = `${quality}_${format}.torrent`.replace(/[^a-z0-9_\-\.]/gi, '_');

            return (
              <div
                key={index}
                className="bg-gray-100 border border-gray-300 p-5 rounded text-center text-[15px] text-black"
              >
                <div className="font-semibold text-[12px] mb-1">
                  {quality} - {format}
                </div>

                <button
                  onClick={() => handleDownload(download.url, filename)}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  📥 {quality}
                </button>

                <p className="text-[15px] text-gray-500 mt-1 mb-2">
                  Downloads: {download.count || 0}
                </p>

                {download.magnet && (
                  <a
                    href={download.magnet}
                    className="inline-block bg-red-200 hover:bg-red-400 text-black px-2 py-1 rounded font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🧲 Magnet
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;
