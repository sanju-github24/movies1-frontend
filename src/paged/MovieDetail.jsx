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
  
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 break-words leading-snug px-2">
          {topTitle}
        </h1>
  
        {/* Break line after title */}
        <hr className="border-t-2 border-gray-300 mb-6 w-1/2 mx-auto" />
  
        {/* Blue full-width bar inside white box */}
        <div className="w-full bg-blue-900 text-white text-sm sm:text-base px-4 sm:px-6 py-3 rounded-md shadow flex justify-between items-center mb-6">
          <span className="font-semibold">
             Posted {movie.created_at ? new Date(movie.created_at).toLocaleString() : "Unknown"}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("🔗 Link copied!");
            }}
            className="text-blue-100 hover:text-white transition"
          >
           Share
          </button>
        </div>
  
        {/* ...continue your movie content */}
  
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
      <React.Fragment key={index}>
  <div className="bg-gray-100 border border-gray-300 p-6 rounded text-center text-[16px] text-black shadow-md">
    {/* Quality + Format */}
    <div className="font-semibold text-[15px] mb-2 text-gray-800">
      {quality} - {format}
    </div>

    {/* Download Button */}
    <button
      onClick={() => handleDownload(download.url, filename)}
      className="text-blue-800 underline hover:text-blue-900 text-[18px] font-bold"
    >
      📥 {quality}
    </button>

    {/* Download Count */}
    <p className="text-[15px] text-gray-600 mt-2 mb-3">
      Downloads: <span className="font-medium">{download.count || 0}</span>
    </p>

    {/* 🔺 Red Seedr Notice with GIFs */}
<div className="flex items-center justify-center gap-3 mb-3">
  <img
    src="/clapping.gif"
    alt="Seed GIF"
    className="w-8 h-8 object-contain"
  />
  <p className="text-red-600 font-semibold text-[14px] text-center">
    🔺 Seed Back Here After Downloading {' '}
    <a
      href="https://www.seedr.cc/"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-red-800"
    >
      https://www.seedr.cc
    </a>
  </p>
  <img
    src="/clapping.gif"
    alt="Seed GIF"
    className="w-8 h-8 object-contain"
  />
</div>
    {/* Magnet Link */}
    {download.magnet && (
      <a
        href={download.magnet}
        className="inline-block bg-red-300 hover:bg-red-500 text-black px-4 py-2 rounded font-semibold text-[15px] transition"
        target="_blank"
        rel="noopener noreferrer"
      >
        🧲 Magnet
      </a>
    )}
  </div>

  {/* Optional GIF */}
  {download.showGifAfter && (
    <div className="flex justify-center my-6">
      <img
        src="/torrent1.gif"
        alt="Torrent GIF"
        className="w-28 h-28 object-contain"
      />
    </div>
  )}
</React.Fragment>

    );
  })}

  {/* ✅ GP Links shown at the bottom */}
  {movie.downloads?.some((d) => d.gpLink) && (
    <div className="bg-gray-100 border border-gray-300 p-5 rounded text-black text-sm space-y-2 mt-6">
      <h3 className="font-semibold mb-2">GP Links:</h3>
      {movie.downloads
        .filter((d) => d.gpLink)
        .map((d, idx) => (
          <p key={idx}>
            <strong>{d.quality || d.size}:</strong>{" "}
            <a
              href={d.gpLink}
              className="text-blue-600 underline hover:text-blue-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              {d.gpLink}
            </a>
          </p>
        ))}
    </div>
  )}
</div>

        </div>
      </div>
   
  );
};

export default MovieDetail;
